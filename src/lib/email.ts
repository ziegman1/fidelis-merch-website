import { Resend } from "resend";
import { getDeploymentEnvironment, getEmailDeliveryMode, NON_PRODUCTION_EMAIL_SINK } from "@/lib/env-safety";

export type TransactionalEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

export type TransactionalEmailResult = {
  data: { id: string } | null;
  error: { message: string; name: string } | null;
  suppressed?: boolean;
};

export type TransactionalEmailSender = (message: TransactionalEmail) => Promise<TransactionalEmailResult>;

function recipientDomain(address: string): string {
  return address.split("@")[1] ?? "unknown";
}

/**
 * Returns null when RESEND_API_KEY is unset. In production messages go to the
 * real recipient unchanged; elsewhere they are suppressed or rerouted to the
 * Resend test sink (see getEmailDeliveryMode).
 */
export function getTransactionalEmailSender(env: Record<string, string | undefined> = process.env): TransactionalEmailSender | null {
  const key = env.RESEND_API_KEY;
  if (!key) return null;

  const mode = getEmailDeliveryMode(env);
  const environment = getDeploymentEnvironment(env);

  if (mode === "suppress") {
    return async (message) => {
      console.warn(`[Email] Suppressed in "${environment}" environment`, {
        subject: message.subject,
        recipientDomain: recipientDomain(message.to),
      });
      return { data: null, error: null, suppressed: true };
    };
  }

  const resend = new Resend(key);
  return async (message) => {
    const outgoing =
      mode === "sink"
        ? { ...message, to: NON_PRODUCTION_EMAIL_SINK, subject: `[${environment}] ${message.subject}` }
        : message;
    const { data, error } = await resend.emails.send(outgoing);
    return {
      data: data ? { id: data.id } : null,
      error: error ? { message: error.message, name: error.name } : null,
    };
  };
}
