/**
 * Sends a test order-notification email through the guarded sender.
 * Non-production only: suppressed by default, or delivered to the Resend test
 * sink when FIDELIS_EMAIL_SINK=resend-test.
 * Run: npm run test:email
 */

import { getTransactionalEmailSender } from "../src/lib/email";
import { prepareScriptEnvironment } from "./lib/script-env";

prepareScriptEnvironment("test-order-email");

async function main() {
  const sendEmail = getTransactionalEmailSender();
  if (!sendEmail) {
    console.error("RESEND_API_KEY is not set.");
    process.exit(1);
  }

  const { data, error, suppressed } = await sendEmail({
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
  console.log(suppressed ? "Test email suppressed (non-production)." : "Test email accepted.", { resendId: data?.id });
}

main();
