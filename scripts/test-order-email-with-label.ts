/**
 * Sends a sample order notification email with printable shipping label to jszcs04@gmail.com.
 * Run: npm run test:email:label
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set. Add it to .env.local");
    process.exit(1);
  }

  const siteUrl = "https://www.fidelismerch.com";
  const orderId = "sample_order_123";
  const totalCents = 5499;
  const customerEmail = "customer@example.com";

  const itemsHtml = `
<tr><td>2×</td><td>Fidelis Hoodie — Light Steel / M</td><td>$79.98</td></tr>
<tr><td>1×</td><td>Fidelis T-Shirt — Black / L</td><td>$29.99</td></tr>
`;

  const shippingName = "Jane Smith";
  const shippingLine1 = "123 Main Street";
  const shippingLine2 = "Apt 4B";
  const shippingCity = "Portland";
  const shippingState = "OR";
  const shippingPostalCode = "97201";
  const shippingCountry = "US";

  const shippingLabelHtml = `
<hr style="margin:24px 0;border:none;border-top:1px solid #ccc;" />
<h3 style="margin-bottom:8px;">📦 Print shipping label</h3>
<p style="font-size:12px;color:#666;margin-bottom:12px;">Select the address box below and print (Ctrl/Cmd+P), or copy to a label template.</p>
<table border="2" cellpadding="20" cellspacing="0" style="border-collapse:collapse;max-width:420px;font-family:Georgia,serif;font-size:18px;line-height:1.5;background:#fff;">
<tr><td>
<div style="font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Ship to</div>
<div><strong>${escapeHtml(shippingName)}</strong></div>
<div>${escapeHtml(shippingLine1)}</div>
<div>${escapeHtml(shippingLine2)}</div>
<div>${escapeHtml([shippingCity, shippingState, shippingPostalCode].join(", "))}</div>
<div>${escapeHtml(shippingCountry)}</div>
<div style="margin-top:14px;font-size:13px;color:#666;">Order: ${escapeHtml(orderId)}</div>
</td></tr>
</table>
`;

  const adminHtml = `
<h2>New order received</h2>
<p><em style="color:#888;">(This is a sample email — not a real order)</em></p>
<p><strong>Order ID:</strong> ${orderId}</p>
<p><strong>Customer:</strong> ${customerEmail}</p>
<p><strong>Total:</strong> $${(totalCents / 100).toFixed(2)}</p>
<h3>Items</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
<thead><tr><th>Qty</th><th>Product</th><th>Subtotal</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<h3>Shipping address</h3>
<p>${[shippingName, shippingLine1, shippingLine2, [shippingCity, shippingState, shippingPostalCode].join(", "), shippingCountry].join("<br />")}</p>
${shippingLabelHtml}
<p style="font-size:12px;color:#666;">Admin: <a href="${siteUrl}/admin/orders/${orderId}">View order</a></p>
`;

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: "Fidelis Merch <orders@fidelismerch.com>",
    to: "jszcs04@gmail.com",
    subject: `Sample order (with printable label): ${orderId} — $${(totalCents / 100).toFixed(2)}`,
    html: adminHtml,
  });

  if (error) {
    console.error("Failed to send sample email:", error);
    process.exit(1);
  }
  console.log("Sample order email with printable label sent. Check jszcs04@gmail.com inbox.", { resendId: data?.id });
}

main();
