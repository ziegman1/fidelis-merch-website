/**
 * Sends a test email to jszcs04@gmail.com to verify the order notification setup.
 * Run: npm run test:email
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set. Add it to .env.local");
    process.exit(1);
  }

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from: "Fidelis Merch <orders@fidelismerch.com>",
    to: "jszcs04@gmail.com",
    subject: "Test — Order notification setup",
    html: `
<h2>Test email</h2>
<p>This is a test of the Fidelis Merch order notification setup.</p>
<p>If you received this, the internal admin notification emails are working correctly.</p>
<p style="font-size:12px;color:#666;">Sent at ${new Date().toISOString()}</p>
`,
  });

  if (error) {
    console.error("Failed to send test email:", error);
    process.exit(1);
  }
  console.log("Test email sent successfully. Check jszcs04@gmail.com inbox.", { resendId: data?.id });
}

main();
