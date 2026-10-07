#!/usr/bin/env tsx
/**
 * Resend order confirmation emails for existing orders.
 * Use when webhook failed (e.g. signature verification) but orders exist in DB.
 *
 * A selector is required, and nothing is sent without --send (dry run by default):
 *   npm run resend:emails -- --order=<orderId> [--send]
 *   npm run resend:emails -- --since=2025-03-01 [--send]
 *   npm run resend:emails -- --email=<address> [--send]
 *   npm run resend:emails -- --all [--send]
 *
 * Outside production, email is suppressed or rerouted by the guarded sender.
 * Production (real customers) requires credentials supplied in the shell and:
 *   FIDELIS_PRODUCTION_OPERATOR=resend-order-emails npm run resend:emails -- --production --order=<id> --send
 */

import type { PrismaClient } from "@prisma/client";
import { LEGAL_CONFIG } from "../src/data/legal-config";
import { getTransactionalEmailSender } from "../src/lib/email";
import { prepareScriptEnvironment } from "./lib/script-env";

prepareScriptEnvironment("resend-order-emails", { allowProductionOperator: true });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendOrderEmails(order: {
  id: string;
  email: string;
  totalCents: number;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  items: {
    quantity: number;
    priceCents: number;
    variant: { product: { title: string; fulfillmentType: string }; name: string | null };
  }[];
}) {
  const sendEmail = getTransactionalEmailSender();
  if (!sendEmail) {
    throw new Error("RESEND_API_KEY not set");
  }

  const siteUrl = LEGAL_CONFIG.siteUrl;

  // Customer confirmation
  await sendEmail({
    from: "Fidelis Merch <orders@fidelismerch.com>",
    to: order.email,
    subject: "Your Fidelis Merch Order Confirmation",
    html: `<h1>Thank you for your order!</h1>
<p>Your order ID is <strong>${order.id}</strong>.</p>
<p>Your items are now being prepared for production. You will receive another email when your order ships.</p>
<p>Shipping timelines are estimates and may vary. Made-to-order items are subject to our <a href="${siteUrl}/shipping">Shipping</a> and <a href="${siteUrl}/returns">Return</a> policies.</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #ccc;" />
<p style="font-size:12px;color:#666;">
  <a href="${siteUrl}/privacy">Privacy Policy</a> · 
  <a href="${siteUrl}/terms">Terms</a> · 
  <a href="${siteUrl}/shipping">Shipping</a> · 
  <a href="${siteUrl}/returns">Returns</a> · 
  <a href="${siteUrl}/contact">Contact</a>
</p>
<p style="font-size:12px;color:#666;">© ${new Date().getFullYear()} Fidelis Merch</p>`,
  });

  // Admin notification
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
<p><em style="color:#888;">(Resent — original order may have been created earlier)</em></p>
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
<p style="font-size:12px;color:#666;">Admin: <a href="${siteUrl}/admin/orders/${order.id}">View order</a></p>
`;

  await sendEmail({
    from: "Fidelis Merch <orders@fidelismerch.com>",
    to: "jszcs04@gmail.com",
    subject: `[Resent] New order: ${order.id} — $${(order.totalCents / 100).toFixed(2)}`,
    html: adminHtml,
  });
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set. Add to .env.local");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const sinceArg = args.find((a) => a.startsWith("--since="));
  const orderArg = args.find((a) => a.startsWith("--order="));
  const emailArg = args.find((a) => a.startsWith("--email="));
  const all = args.includes("--all");
  const send = args.includes("--send");

  if (!orderArg && !sinceArg && !emailArg && !all) {
    console.error("Refusing to select orders implicitly. Pass --order=<id>, --since=<date>, --email=<address>, or --all.");
    process.exit(1);
  }

  const { prisma } = await import("../src/lib/db");
  let orders: Awaited<ReturnType<typeof fetchOrders>>;

  if (orderArg) {
    const orderId = orderArg.split("=")[1]?.trim();
    if (!orderId) {
      console.error("Usage: --order=<orderId>");
      process.exit(1);
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    orders = order ? [order] : [];
  } else {
    const since = sinceArg ? new Date(sinceArg.split("=")[1]!) : null;
    const emailFilter = emailArg ? emailArg.split("=")[1]?.trim().toLowerCase() : null;
    orders = await fetchOrders(prisma, since, emailFilter);
  }

  if (orders.length === 0) {
    console.log("No orders found.");
    await prisma.$disconnect();
    return;
  }

  if (!send) {
    console.log(`Dry run: ${orders.length} order(s) selected. Re-run with --send to email them.`);
    for (const order of orders) console.log(`  ${order.id}`);
    await prisma.$disconnect();
    return;
  }

  console.log(`Resending emails for ${orders.length} order(s)...`);
  for (const order of orders) {
    try {
      await sendOrderEmails(order);
      console.log(`✓ ${order.id}`);
    } catch (e) {
      console.error(`✗ ${order.id}:`, e instanceof Error ? e.message : e);
    }
  }
  await prisma.$disconnect();
  console.log("Done.");
}

async function fetchOrders(prisma: PrismaClient, since: Date | null, emailFilter?: string | null) {
  return prisma.order.findMany({
    where: {
      status: { in: ["PAID", "FULFILLING", "SHIPPED", "COMPLETE"] },
      ...(since && { createdAt: { gte: since } }),
      ...(emailFilter && { email: { equals: emailFilter, mode: "insensitive" } }),
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
