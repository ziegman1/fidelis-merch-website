import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "../legal/page-shell";
import { LEGAL_CONFIG } from "@/data/legal-config";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Fidelis Merch",
  description: "Return and refund policy for Fidelis Merch — how we handle damaged items and refunds.",
};

export default function ReturnsPage() {
  const { supportEmail, damagedItemReportingWindowDays } = LEGAL_CONFIG;

  return (
    <LegalPageShell title="Return & Refund Policy">
      <p>
        Fidelis Merch sells made-to-order items through our fulfillment partners. Please read this
        policy carefully to understand how we handle returns and refunds.
      </p>

      <h2>General Policy</h2>
      <p>
        Because our items are made to order, we generally do not accept returns or exchanges for:
      </p>
      <ul>
        <li>Buyer&apos;s remorse or change of mind</li>
        <li>Wrong size chosen by the customer</li>
        <li>Accidental orders</li>
      </ul>

      <h2>Damaged, Defective, or Incorrect Items</h2>
      <p>
        If you receive an item that is damaged, defective, or incorrect (wrong product or variant),
        please report it within{" "}
        <strong>{damagedItemReportingWindowDays} days of delivery</strong>. When contacting us,
        please include:
      </p>
      <ul>
        <li>Your order number</li>
        <li>A description of the issue</li>
        <li>Photos of the item (if applicable)</li>
      </ul>
      <p>
        If we approve your claim, we may offer a replacement or refund. We will work with you to
        resolve the issue as quickly as possible.
      </p>

      <h2>Lost or Severely Delayed Packages</h2>
      <p>
        If your package is lost or severely delayed, please contact us at{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your order number. We will
        investigate and work with you to find a resolution.
      </p>

      <h2>Shipping Charges</h2>
      <p>
        Shipping charges are generally non-refundable unless required by law or due to seller or
        provider error (e.g., we sent the wrong item or the item was defective). In cases where we
        approve a refund for a defective or incorrect item, we may refund the product cost and, at
        our discretion, the original shipping cost.
      </p>

      <h2>Contact</h2>
      <p>
        For return or refund questions, contact us at{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>

      <p className="mt-8 pt-6 border-t border-zinc-700">
        <Link href="/" className="text-fidelis-gold hover:underline">
          ← Back to home
        </Link>
      </p>
    </LegalPageShell>
  );
}
