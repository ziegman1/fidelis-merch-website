# Go-live checklist — Supabase + Vercel

Use this list to get the site live. Order matters for some steps.

---

## 1. Supabase (database)

1. Go to [supabase.com](https://supabase.com) and create a **new project** (organization → New project).
2. Pick a region close to your users and set a strong **database password**. Save it somewhere safe.
3. In the project dashboard: **Project Settings** (gear) → **Database**.
4. Under **Connection string**:
   - **URI (Transaction pooler)** — use this for **Vercel** (serverless). It uses port **6543** and is ideal for many short-lived connections. Copy it and replace `[YOUR-PASSWORD]` with your database password.
   - **URI (Direct)** — use this for **running migrations** from your machine. It uses port **5432**. Copy it and replace the password.

**Connection strings:**

- **`DATABASE_URL`** (for the app on Vercel): use the **Transaction pooler** URI (port 6543).  
  Append `?pgbouncer=true` so Prisma works with the pooler, e.g.  
  `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true`
- **`DIRECT_URL`** (for migrations only): use the **Direct** URI (port 5432), e.g.  
  `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`

You can also use the **Connect** button on the Supabase dashboard and switch between “Transaction” and “Direct” to get the right strings.

---

## 2. Vercel (hosting)

1. Push your repo to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** and import your repo.
3. Leave **Framework Preset** as Next.js and **Build Command** as `npm run build`. Root directory stays default unless your app lives in a subfolder.
4. Do **not** deploy yet — add environment variables first (step 3).

---

## 3. Environment variables on Vercel

In Vercel: **Project → Settings → Environment Variables**. Add these for **Production** (and **Preview** if you want):

| Variable | Where to get it | Notes |
|----------|-----------------|--------|
| `DATABASE_URL` | Supabase → Transaction pooler URI (port 6543) | Add `?pgbouncer=true` at the end. |
| `DIRECT_URL` | Supabase → Direct URI (port 5432) | Used only for migrations; not at runtime. |
| `AUTH_SECRET` | Generate: `openssl rand -base64 32` | New secret for production only. |
| `NEXTAUTH_URL` | Your live URL | e.g. `https://your-app.vercel.app` or `https://merch.yourdomain.com`. |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Live key | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Live key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | After adding webhook (step 7) | Optional but recommended. |
| `PRINTIFY_API_KEY` | Printify API / Integrations | |
| `PRINTIFY_SHOP_ID` | Printify → Shop / API | |
| `RESEND_API_KEY` | Resend dashboard | Optional; for order emails. |
| `EMAIL_FROM` | Your choice | Optional; e.g. `Fidelis Merch <orders@yourdomain.com>`. |

**Important:** Use the **pooler** URL for `DATABASE_URL` (with `?pgbouncer=true`). Using the direct URL (5432) on Vercel can exhaust connections.

---

## 4. Deploy and run migrations

1. In Vercel, trigger a **deploy** (e.g. **Deploy** from the project page, or push a commit). The first build might fail if the app needs the DB; that’s okay.
2. Run migrations against the **production** database using the **direct** connection (not the pooler). From your **local** machine, with the Supabase **direct** URI (port 5432):

   ```bash
   DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" npx prisma migrate deploy
   ```

   Or set `DIRECT_URL` in a `.env.production` or in Vercel, then run:

   ```bash
   npx prisma migrate deploy
   ```

   (Prisma uses `DIRECT_URL` for migrations and `DATABASE_URL` for the app when both are set.)

3. Redeploy on Vercel if the first deploy failed due to missing tables.

---

## 5. Admin user

- **Option A:** Seed once against production (only if the DB is empty and you want sample data):

  ```bash
  DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres" npx tsx prisma/seed.ts
  ```

  Then **change the seed admin password immediately** (seed uses `admin@fidelis.example` / `admin123`).

- **Option B:** Skip seed and create an admin user another way (e.g. sign up then set `role = 'ADMIN'` in Supabase Table Editor).

---

## 6. Stripe (live)

- In [Stripe Dashboard](https://dashboard.stripe.com) switch to **Live** and add your **live** keys to Vercel (step 3).
- Under **Settings → Checkout**, set success/cancel URLs to your production URLs (e.g. `https://your-app.vercel.app/order/success`).
- **(Optional but recommended)** Add a webhook endpoint so orders are created even if the customer never loads the success page (see step 7).

---

## 7. Printify and default address

- In **Admin → Settings** (on your live site), set your **Default fulfillment address** (where Printify ships for international orders and your “ship from” for self-fulfilled).
- In **Admin → Shipping**, set shipping rates if you haven’t already.

---

## 8. Custom domain (optional)

- In Vercel: **Project → Settings → Domains** → add your domain and follow the DNS instructions.
- Update **`NEXTAUTH_URL`** and Stripe success/cancel URLs to use that domain, then redeploy.

---

## 9. Verify

- Open the live storefront, add a product, and complete a test checkout.
- Sign in at **/admin** and check orders, products, and **Settings** (default address, shipping).
- For an order with a Printify item, confirm it appears in Printify with the correct ship-to address.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create Supabase project; get **Transaction pooler** (6543) and **Direct** (5432) URIs. |
| 2 | Create Vercel project and connect repo. |
| 3 | Set env vars on Vercel (use pooler + `?pgbouncer=true` for `DATABASE_URL`, direct for `DIRECT_URL`). |
| 4 | Deploy; run `prisma migrate deploy` with `DIRECT_URL` (direct Supabase URI). |
| 5 | Seed or create admin user; change default password if you seeded. |
| 6 | Configure Stripe live keys and success URL. |
| 7 | Set Printify keys and default fulfillment address in Admin. |
| 8 | Add custom domain and set `NEXTAUTH_URL` if needed. |
| 9 | Run a test order and check admin + Printify. |

---

## Local development with Supabase

If you use a **local** Postgres (e.g. Docker), keep using that for `DATABASE_URL` and `DIRECT_URL` (same value for both). If you use a **Supabase** project for local dev, use the same two URLs (pooler for `DATABASE_URL`, direct for `DIRECT_URL`) in `.env.local`, and add `?pgbouncer=true` to the pooler URL.
