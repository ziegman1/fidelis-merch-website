import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "../legal/page-shell";
import { getMergedLegalConfig, getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "Privacy Policy",
    description: `Privacy Policy for ${copy.site.name}.`,
  };
}

export default async function PrivacyPage() {
  const copy = await getSiteCopy();
  const { supportEmail, privacyEffectiveDate, siteUrl } = await getMergedLegalConfig();

  return (
    <LegalPageShell title="Privacy Policy">
      <p className="text-brand-ink/60 text-sm">
        <strong>Effective date:</strong> {privacyEffectiveDate}
      </p>

      <p>
        {copy.site.name} operates {siteUrl}. This Privacy Policy describes how we collect, use, and
        protect information when you visit our site or make a purchase.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>
          <strong>Order information:</strong> Name, email, billing and shipping address, phone (if
          provided), and order details.
        </li>
        <li>
          <strong>Payment:</strong> Processed by Stripe. We do not store full card numbers.
        </li>
        <li>
          <strong>Session data:</strong> For admin sign-in and site functionality.
        </li>
        <li>
          <strong>Device/usage:</strong> Hosting provider may collect basic server logs. We collect
          page view data (path, referrer, hashed IP) for internal traffic stats. We do not use
          third-party analytics or marketing cookies.
        </li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>To process orders, communicate with you, provide support, prevent fraud, and comply with law.</p>

      <h2>Service Providers</h2>
      <p>We share data with Stripe (payments), Printify (fulfillment), Vercel (hosting), and Resend (email). See their privacy policies for details. We do not sell your information.</p>

      <h2>Cookies</h2>
      <p>We use essential cookies for sessions and cart persistence. No marketing cookies.</p>

      <h2>Data Retention</h2>
      <p>We retain data as needed for orders, support, and legal compliance. Request deletion at {supportEmail}.</p>

      <h2>Your Rights</h2>
      <p>Contact {supportEmail} for access, correction, or deletion requests.</p>

      <h2>California Privacy Rights</h2>
      <p>If applicable under California law, you may have additional rights. Contact {supportEmail}.</p>

      <h2>Other U.S. State Privacy Rights</h2>
      <p>Certain states may provide additional rights. Contact {supportEmail}.</p>

      <h2>Children</h2>
      <p>Our site is not intended for children under 13.</p>

      <h2>Security</h2>
      <p>We use reasonable measures. No method is 100% secure.</p>

      <h2>Changes</h2>
      <p>We may update this policy. Continued use constitutes acceptance.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>

      <p className="mt-8 pt-6 border-t border-brand-primary/25">
        <Link href="/" className="text-brand-primary hover:underline">
          Back to home
        </Link>
      </p>
    </LegalPageShell>
  );
}
