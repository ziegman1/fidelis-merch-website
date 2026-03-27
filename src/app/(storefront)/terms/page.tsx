import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "../legal/page-shell";
import { LEGAL_CONFIG } from "@/data/legal-config";
import { getMergedLegalConfig, getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "Terms of Service",
    description: `Terms of Service for ${copy.site.name} — website use, orders, and policies.`,
  };
}

export default async function TermsPage() {
  const copy = await getSiteCopy();
  const legal = await getMergedLegalConfig();
  const { supportEmail } = legal;
  const { termsEffectiveDate, governingLawPlaceholder } = LEGAL_CONFIG;

  return (
    <LegalPageShell title="Terms of Service">
      <p className="text-brand-ink/60 text-sm">
        <strong>Effective date:</strong> {termsEffectiveDate}
      </p>

      <p>
        Welcome to {copy.site.name}. By using our website and placing orders, you agree to these Terms of
        Service. Please read them carefully.
      </p>

      <h2>Website Use</h2>
      <p>
        You may use our website for lawful purposes only. You agree not to use the site in any way
        that violates applicable laws, infringes on others&apos; rights, or disrupts the operation of
        the site.
      </p>

      <h2>Product Information and Availability</h2>
      <p>
        We strive to display products accurately. Images, colors, and descriptions may vary slightly
        from the actual product. Product availability is subject to change. We reserve the right to
        limit quantities and to discontinue products without notice.
      </p>

      <h2>Pricing and Order Acceptance</h2>
      <p>
        All prices are in U.S. dollars. We reserve the right to correct pricing errors. Your order
        is an offer to purchase; we accept the order when we confirm it (e.g., by sending an order
        confirmation email). We may refuse or cancel orders for any reason, including suspected
        fraud or errors.
      </p>

      <h2>Payment Processing</h2>
      <p>
        Payments are processed securely through Stripe. By providing payment information, you
        authorize us to charge the applicable amount. You are responsible for ensuring that your
        payment information is accurate and current.
      </p>

      <h2>Fulfillment and Shipping</h2>
      <p>
        Orders are fulfilled by third-party providers, including Printify. Production and shipping
        times are estimates and may vary. We are not responsible for delays caused by carriers,
        weather, holidays, or provider issues. See our{" "}
        <Link href="/shipping">Shipping Policy</Link> for more details.
      </p>

      <h2>Customer Responsibility for Address</h2>
      <p>
        You are responsible for providing a correct and complete shipping address. We are not
        liable for orders shipped to an incorrect or incomplete address provided by you.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        All content on this site, including text, images, logos, and designs, is owned by{" "}
        {copy.site.name} or its licensors and is protected by intellectual property laws. You may not
        copy, modify, or use our content without permission.
      </p>

      <h2>Prohibited Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the site for any illegal purpose</li>
        <li>Attempt to gain unauthorized access to our systems or data</li>
        <li>Interfere with the site&apos;s operation or security</li>
        <li>Use automated tools to scrape or collect data without permission</li>
      </ul>

      <h2>Disclaimer of Warranties</h2>
      <p>
        To the fullest extent permitted by applicable law, the site and products are provided
        &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or
        implied. We do not warrant that the site will be uninterrupted or error-free.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by applicable law, {copy.site.name} and its affiliates shall not be
        liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of
        profits or data, arising from your use of the site or products. Our total liability shall not
        exceed the amount you paid for the products at issue.
      </p>

      <h2>Governing Law and Venue</h2>
      <p>
        <strong>TODO — Review with legal counsel:</strong> These Terms shall be governed by the laws
        of {governingLawPlaceholder}. Any disputes shall be resolved in the courts of that
        jurisdiction. Please update this section with your actual governing law and venue before
        launch.
      </p>

      <h2>Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. We will post changes on this page and update
        the effective date. Continued use of the site after changes constitutes acceptance of the
        updated Terms.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>

      <p className="mt-8 pt-6 border-t border-brand-primary/25">
        <Link href="/" className="text-brand-primary hover:underline">
          ← Back to home
        </Link>
      </p>
    </LegalPageShell>
  );
}
