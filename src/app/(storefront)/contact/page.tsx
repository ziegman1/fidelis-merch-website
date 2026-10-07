import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "../legal/page-shell";
import { LEGAL_CONFIG } from "@/data/legal-config";

export const metadata: Metadata = {
  title: "Contact | Fidelis Merch",
  description: "Contact Fidelis Merch for order support, shipping questions, and returns.",
};

export default function ContactPage() {
  const { supportEmail, supportResponseTime } = LEGAL_CONFIG;

  return (
    <LegalPageShell title="Contact">
      <p>
        We&apos;re here to help. For questions about your order, shipping, or returns, please reach
        out using the information below.
      </p>

      <h2>Support Email</h2>
      <p>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>
      <p className="text-zinc-400 text-sm">
        We aim to respond within {supportResponseTime}. Please include your order number when
        contacting us about a specific order.
      </p>

      <h2>How We Can Help</h2>
      <p>We can assist with:</p>
      <ul>
        <li>Order status and tracking</li>
        <li>Shipping questions or delays</li>
        <li>Damaged or defective items</li>
        <li>Return and refund requests</li>
        <li>General product questions</li>
      </ul>

      <h2>Before You Contact Us</h2>
      <p>
        For faster answers, please review our{" "}
        <Link href="/shipping">Shipping Policy</Link> and{" "}
        <Link href="/returns">Return & Refund Policy</Link>. Many common questions are covered
        there.
      </p>

      <p className="mt-8 pt-6 border-t border-zinc-700">
        <Link href="/" className="text-fidelis-gold hover:underline">
          ← Back to home
        </Link>
      </p>
    </LegalPageShell>
  );
}
