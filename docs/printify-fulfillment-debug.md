# Printify Fulfillment Debugging

If orders aren't appearing in Printify, check these in order:

## 1. Product must be dropship + Printify

Only products with **fulfillmentType = "dropship"** and a **providerId** (Printify) are sent to Printify.

- Go to **Admin → Products** and open the product you ordered
- Check **Fulfillment type**: must be **Dropship**
- Check **Provider**: must be **Printify**

If it's "Self-fulfilled", it will NOT go to Printify.

## 2. Product must have Printify mapping

Each variant needs an **ExternalProductMapping** (Printify product ID + variant ID).

- Run Printify sync: **Admin → Providers** or call `/api/sync-printify`
- Or check the DB: `ExternalProductMapping` table should have rows for your product variants

## 3. Stripe webhook (production)

Orders are created when:
- **A)** Stripe webhook fires `checkout.session.completed` → webhook calls `createOrderFromSession`
- **B)** User visits `/order/success` → page calls `createOrderFromSession`

For (A) to work:
1. **Stripe Dashboard** → Developers → Webhooks (Live mode)
2. Add endpoint: `https://www.fidelismerch.com/api/webhooks/stripe`
3. Event: `checkout.session.completed`
4. Copy the **Signing secret** (whsec_...)
5. Add to **Vercel** → Settings → Environment Variables: `STRIPE_WEBHOOK_SECRET`
6. Redeploy

If webhook isn't configured, orders still get created when the user lands on the success page (B).

## 4. Vercel environment variables

Ensure these are set in Vercel (Production):

| Variable | Required for Printify | Required for order emails |
|----------|------------------------|---------------------------|
| `STRIPE_SECRET_KEY` | Yes (order creation) | Yes |
| `STRIPE_WEBHOOK_SECRET` | Yes (webhook to create orders) | Yes |
| `PRINTIFY_API_KEY` | Yes | — |
| `PRINTIFY_SHOP_ID` | Yes | — |
| `RESEND_API_KEY` | — | Yes (order confirmation emails) |

If order confirmation emails are not arriving, see [order-confirmation-email-checklist.md](./order-confirmation-email-checklist.md).

## 5. Check Vercel logs

After placing an order:
1. Vercel → Project → **Logs** (or **Deployments** → select deployment → **Functions**)
2. Look for: `[Stripe webhook] Order created` or `[Fulfillment] Routing dropship items`
3. Look for errors: `[Printify] API error` or `[Fulfillment] Printify order failed`

## 6. Check your database

- **Admin → Orders**: Does the order exist?
- If yes, check the **Fulfillment** record: status should be SUBMITTED with an external order ID
- If status is FAILED, the Printify API call failed (check logs for the error)
