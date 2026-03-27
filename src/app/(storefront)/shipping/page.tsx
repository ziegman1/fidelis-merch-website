import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "../legal/page-shell";
import { getMergedLegalConfig, getSiteCopy } from "@/lib/site-copy";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  return {
    title: "Shipping Policy",
    description: `Shipping policy for ${copy.site.name}.`,
  };
}

export default async function ShippingPage() {
  const { supportEmail } = await getMergedLegalConfig();

  return (
    <LegalPageShell title="Shipping Policy">
      <p>Orders are processed after payment confirmation. Because items are made to order, production and fulfillment may take a few business days before your order ships.</p>
      <h2>Shipping Timelines</h2>
      <p>Shipping timelines are estimates and may vary. We do not guarantee exact delivery dates. Delays can occur due to carrier schedules, weather, holidays, or provider capacity.</p>
      <h2>Tracking</h2>
      <p>You will receive tracking information when your order ships and it becomes available.</p>
      <h2>Delays or Issues</h2>
      <p>If your order cannot be fulfilled or is materially delayed, contact us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      <p>See our <Link href="/returns">Return & Refund Policy</Link> for refunds.</p>
      <p className="mt-8 pt-6 border-t border-brand-primary/25">
        <Link href="/" className="text-brand-primary hover:underline">Back to home</Link>
      </p>
    </LegalPageShell>
  );
}
