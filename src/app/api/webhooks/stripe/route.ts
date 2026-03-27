/**
 * Stripe webhook handler.
 * Uses checkout.session.completed as the source of truth for order creation and Printify fulfillment.
 * This runs server-side when Stripe confirms payment, regardless of whether the user visits the success page.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createOrderFromSession } from "@/lib/orders";
import { LEGAL_CONFIG } from "@/data/legal-config";
import { getSiteCopy } from "@/lib/site-copy";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error("[Stripe webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  // Must use raw body for signature verification — do not parse as JSON first
  let body: string;
  try {
    body = await req.text();
  } catch (e) {
    console.error("[Stripe webhook] Failed to read body:", e);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[Stripe webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[Stripe webhook] Signature verification failed:", err);
    // Common cause: STRIPE_WEBHOOK_SECRET must match the endpoint in Stripe Dashboard.
    // If using stripe listen locally, use the CLI secret; for production, use the Dashboard secret.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    if (session.payment_status !== "paid") {
      console.warn("[Stripe webhook] checkout.session.completed but payment_status is not paid:", session.payment_status);
      return NextResponse.json({ received: true });
    }

    try {
      const order = await createOrderFromSession(sessionId);
      console.log("[Stripe webhook] Order created and fulfillment routed:", {
        orderId: order.id,
        sessionId,
        email: order.email,
      });

      const customerEmail = order.email;
      const orderId = order.id;

      if (customerEmail) {
        const resend = getResend();
        if (!resend) {
          console.warn("[Email] Skipping order confirmation: RESEND_API_KEY not set");
        } else {
          try {
            const copy = await getSiteCopy();
            console.log("[Email] Sending order confirmation", { orderId, customerEmail });
            const { data, error } = await resend.emails.send({
            from: LEGAL_CONFIG.orderEmailFrom,
            to: customerEmail,
            subject: `Your order confirmation — ${copy.site.name}`,
            html: `<h1>Thank you for your order!</h1>
<p>Your order ID is <strong>${orderId}</strong>.</p>
<p>Your items are now being prepared for production. You will receive another email when your order ships.</p>
<p>Shipping timelines are estimates and may vary. Made-to-order items are subject to our <a href="${LEGAL_CONFIG.siteUrl}/shipping">Shipping</a> and <a href="${LEGAL_CONFIG.siteUrl}/returns">Return</a> policies.</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #ccc;" />
<p style="font-size:12px;color:#666;">
  <a href="${LEGAL_CONFIG.siteUrl}/privacy">Privacy Policy</a> · 
  <a href="${LEGAL_CONFIG.siteUrl}/terms">Terms</a> · 
  <a href="${LEGAL_CONFIG.siteUrl}/shipping">Shipping</a> · 
  <a href="${LEGAL_CONFIG.siteUrl}/returns">Returns</a> · 
  <a href="${LEGAL_CONFIG.siteUrl}/contact">Contact</a>
</p>
<p style="font-size:12px;color:#666;">© ${new Date().getFullYear()} ${copy.site.name}</p>`,
          });
            if (error) {
              console.error("[Email] Order confirmation failed", { orderId, error: error.message, name: error.name });
            } else {
              console.log("[Email] Order confirmation sent", { orderId, resendId: data?.id });
            }
          } catch (emailError) {
            console.error("[Email] Order confirmation failed", emailError);
          }
        }
      }

      // Internal notification to jszcs04@gmail.com
      const resend = getResend();
      if (resend) {
        try {
          const hasSelfFulfilled = order.items.some(
            (item) => item.variant.product.fulfillmentType === "self_fulfilled"
          );
          const itemsHtml = order.items
            .map(
              (item) =>
                `<tr><td>${item.quantity}×</td><td>${item.variant.product.title} — ${item.variant.name ?? "—"}</td><td>$${((item.priceCents * item.quantity) / 100).toFixed(2)}</td></tr>`
            )
            .join("");
          const shippingLines = [
            order.shippingName,
            order.shippingLine1,
            order.shippingLine2,
            [order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", "),
            order.shippingCountry,
          ]
            .filter(Boolean)
            .join("<br />");
          const shippingLabelHtml = hasSelfFulfilled
            ? `
<hr style="margin:24px 0;border:none;border-top:1px solid #ccc;" />
<h3 style="margin-bottom:8px;">📦 Print shipping label</h3>
<p style="font-size:12px;color:#666;margin-bottom:12px;">Select the address box below and print (Ctrl/Cmd+P), or copy to a label template.</p>
<table border="2" cellpadding="20" cellspacing="0" style="border-collapse:collapse;max-width:420px;font-family:Georgia,serif;font-size:18px;line-height:1.5;background:#fff;">
<tr><td>
<div style="font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Ship to</div>
<div><strong>${escapeHtml(order.shippingName ?? "")}</strong></div>
<div>${escapeHtml(order.shippingLine1 ?? "")}</div>
${order.shippingLine2 ? `<div>${escapeHtml(order.shippingLine2)}</div>` : ""}
<div>${escapeHtml([order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", "))}</div>
<div>${escapeHtml(order.shippingCountry ?? "")}</div>
<div style="margin-top:14px;font-size:13px;color:#666;">Order: ${escapeHtml(order.id)}</div>
</td></tr>
</table>
`
            : "";
          const adminHtml = `
<h2>New order received</h2>
<p><strong>Order ID:</strong> ${order.id}</p>
<p><strong>Customer:</strong> ${order.email}</p>
<p><strong>Total:</strong> $${(order.totalCents / 100).toFixed(2)}</p>
<h3>Items</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
<thead><tr><th>Qty</th><th>Product</th><th>Subtotal</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<h3>Shipping address</h3>
<p>${shippingLines || "—"}</p>
${shippingLabelHtml}
<p style="font-size:12px;color:#666;">Admin: <a href="${LEGAL_CONFIG.siteUrl}/admin/orders/${order.id}">View order</a></p>
`;
          await resend.emails.send({
            from: LEGAL_CONFIG.orderEmailFrom,
            to: "jszcs04@gmail.com",
            subject: `New order: ${order.id} — $${(order.totalCents / 100).toFixed(2)}`,
            html: adminHtml,
          });
          console.log("[Email] Order notification sent to jszcs04@gmail.com", { orderId: order.id });
        } catch (adminEmailError) {
          console.error("[Email] Order notification to jszcs04@gmail.com failed", adminEmailError);
        }
      }
    } catch (e) {
      console.error("[Stripe webhook] createOrderFromSession failed:", e);
      return NextResponse.json(
        { error: "Order creation failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
