import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FulfillmentAddressForm } from "./fulfillment-address-form";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">Settings</h1>

      <FulfillmentAddressForm />

      <Card className="border-fidelis-gold/20 bg-zinc-900 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-cream">Site settings</CardTitle>
          <CardDescription>Logo, colors, homepage content (Phase 1.5)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            Site settings (logo, colors, homepage blocks) will be configurable here in a future update.
            For now, branding is applied via the design system in <code className="text-fidelis-gold">/docs/branding.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
