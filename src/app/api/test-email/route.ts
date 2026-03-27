/**
 * Sends a test email to verify order notification setup.
 * GET /api/test-email?secret=YOUR_SECRET
 * Set TEST_EMAIL_SECRET in env to protect this endpoint.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { LEGAL_CONFIG } from "@/data/legal-config";
import { getSiteCopy } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 500 }
    );
  }

  const secret = process.env.TEST_EMAIL_SECRET;
  const url = new URL(req.url);
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const copy = await getSiteCopy();
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: LEGAL_CONFIG.orderEmailFrom,
    to: "jszcs04@gmail.com",
    subject: "Test — Order notification setup",
    html: `
<h2>Test email</h2>
<p>This is a test of the ${copy.site.name} order notification setup.</p>
<p>If you received this, the internal admin notification emails are working correctly.</p>
<p style="font-size:12px;color:#666;">Sent at ${new Date().toISOString()}</p>
`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to send", details: error },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, resendId: data?.id });
}
