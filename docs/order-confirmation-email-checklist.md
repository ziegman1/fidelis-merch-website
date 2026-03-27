# Order Confirmation Email Checklist

Use this checklist when order confirmation emails are not being received.

---

## How it works

1. Customer completes Stripe checkout
2. Stripe sends `checkout.session.completed` to your webhook
3. Webhook creates order, routes fulfillment, then sends email via Resend
4. Customer sees success page (which always says "Order confirmation has been sent" — it does **not** verify the email actually sent)

**Important:** The email is sent from the **Stripe webhook**, not from the success page. If the webhook never fires, no email is sent.

---

## 1. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, verify:

| Variable | Required for emails | Notes |
|----------|---------------------|-------|
| `RESEND_API_KEY` | **Yes** | Get from [resend.com](https://resend.com) → API Keys. If missing, logs show `[Email] Skipping order confirmation: RESEND_API_KEY not set`. |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Webhook must fire for emails to send. If missing, webhook returns 500. |
| `STRIPE_SECRET_KEY` | Yes | Required for webhook to process events. |

**Environment scope:** Set `RESEND_API_KEY` for **Production** (and **Preview** if you test on preview URLs like `fidelis-merch-website.vercel.app`).

---

## 2. Stripe webhook configuration

The webhook URL in Stripe must match the URL where your app is deployed.

**Production (live mode):**
- Stripe Dashboard → **Developers** → **Webhooks** (switch to **Live**)
- Endpoint: `https://www.fidelismerch.com/api/webhooks/stripe`
- Event: `checkout.session.completed`
- Copy **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Vercel

**Test mode** (when using `cs_test_` session IDs):
- Stripe Dashboard → **Developers** → **Webhooks** (switch to **Test**)
- Endpoint: `https://www.fidelismerch.com/api/webhooks/stripe` (or `https://fidelis-merch-website.vercel.app/api/webhooks/stripe` if testing on that URL)
- Event: `checkout.session.completed`
- Copy **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Vercel (test and live secrets are different)

**URL must match:** If checkout redirects to `fidelis-merch-website.vercel.app`, the webhook endpoint should use that same base URL. Stripe sends the webhook to the URL you configure — it does not auto-detect your domain.

---

## 3. Resend domain verification

Emails are sent from `Fidelis Merch <orders@fidelismerch.com>`.

- Go to [resend.com](https://resend.com) → **Domains**
- Add and verify `fidelismerch.com` (DNS records: SPF, DKIM)
- Until verified, Resend may reject sends or emails may go to spam

---

## 4. Check Vercel logs

After placing a test order:

1. Vercel → Project → **Logs** (or **Deployments** → select deployment → **Functions**)
2. Filter by the webhook route or search for `[Stripe webhook]` or `[Email]`

**Expected sequence when working:**
```
[Stripe webhook] Order created and fulfillment routed: { orderId, sessionId, email }
[Email] Sending order confirmation { orderId, customerEmail }
[Email] Order confirmation sent { orderId }
```

**If RESEND_API_KEY is missing:**
```
[Email] Skipping order confirmation: RESEND_API_KEY not set
```

**If Resend API fails:**
```
[Email] Order confirmation failed <error details>
```

**If webhook never fires:** No `[Stripe webhook]` or `[Email]` logs at all → check Stripe webhook URL and signing secret.

**If you see "No signatures found matching the expected signature for payload":**
- The signing secret must match the webhook endpoint exactly. In Stripe Dashboard → Developers → Webhooks → your endpoint → click **Reveal** next to "Signing secret".
- **Do not mix secrets:** The secret from `stripe listen` (local testing) is different from the Dashboard secret. Use the Dashboard secret for production.
- Ensure `STRIPE_WEBHOOK_SECRET` in Vercel is the exact `whsec_...` value from the endpoint. No extra spaces or quotes.

---

## 5. Spam folder

Check the recipient's spam/junk folder. Some providers (e.g. corporate email) may filter transactional emails until the domain is warmed up.

---

## Quick reference

| Symptom | Likely cause |
|---------|---------------|
| No `[Stripe webhook]` logs | Webhook URL wrong in Stripe, or STRIPE_WEBHOOK_SECRET mismatch |
| `[Email] Skipping... RESEND_API_KEY not set` | Add RESEND_API_KEY in Vercel, redeploy |
| `[Email] Order confirmation failed` | Resend API error: check API key, domain verification |
| Logs show success but no email | Spam folder, or recipient address typo |
