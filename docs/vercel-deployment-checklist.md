# Vercel deployment checklist — Fidelis Merch Website

**Project:** Fidelis Merch Website  
**GitHub repo:** ziegman1/fidelis-merch-website

Use this while importing the repo into Vercel and doing the first production deploy.

---

## 1. Exact Vercel environment variables to add

Add these in **Vercel → Project → Settings → Environment Variables**. Set each for **Production** (and **Preview** if you want preview deployments to work).

| Variable | What to use |
|----------|-------------|
| **DATABASE_URL** | Your Supabase **transaction pooler** connection string (port 6543), with `?pgbouncer=true` at the end. Copy from Supabase Dashboard → Project Settings → Database → Connection string → **Transaction** (pooler). Replace `[YOUR-PASSWORD]` with your DB password; if the password has special characters, URL-encode them. |
| **DIRECT_URL** | Your Supabase **session pooler** connection string (port 5432), same pooler host as above. Copy from Supabase → Connection string → **Session** (pooler). Use this format so migrations work from IPv4; do not use the `db.xxx.supabase.co` direct host in Vercel. |
| **AUTH_SECRET** | A new random secret for production only. Generate with: `openssl rand -base64 32`. Do not reuse your local `.env.local` value. |
| **NEXTAUTH_URL** | Your live app URL. For first deploy use: **`https://fidelis-merch-website.vercel.app`**. After adding a custom domain, change this to that domain (e.g. `https://merch.yourdomain.com`). |
| **STRIPE_SECRET_KEY** | Stripe **live** secret key from Dashboard → Developers → API keys (`sk_live_...`). Use test key only for Preview if you want. |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | Stripe **live** publishable key (`pk_live_...`) from the same place. |
| **PRINTIFY_API_KEY** | Your Printify API key from Printify → Integrations / API. |
| **PRINTIFY_SHOP_ID** | Your Printify Shop ID from Printify (Shop / API section). |

---

## 2. Correct values / format

- **DATABASE_URL**
  - Must use the **Supabase transaction pooler** (not the direct database host).
  - Host looks like: `aws-0-<region>.pooler.supabase.com` or `aws-1-us-east-2.pooler.supabase.com`.
  - Port must be **6543**.
  - End of the URL must include **`?pgbouncer=true`** (or `&pgbouncer=true` if there are other query params). Without this, Prisma can fail in serverless.

- **DIRECT_URL**
  - Must use the **Supabase session pooler** (same pooler host as above).
  - Same host as `DATABASE_URL`, but port must be **5432** (session mode).
  - Do **not** use the direct database host `db.<project-ref>.supabase.co` here. That connection is IPv6-only and often fails from Vercel. The session pooler on port 5432 works from IPv4.

- **NEXTAUTH_URL (first production deploy)**
  - Set to: **`https://fidelis-merch-website.vercel.app`** (no trailing slash).
  - This must match the URL where the app is actually served. If you add a custom domain later, update this to that domain.

---

## 3. Exact Vercel import settings

When you import the repo (or under **Project → Settings → General**), use:

- [ ] **Framework Preset:** Next.js
- [ ] **Root Directory:** leave blank (repo root) or `.`
- [ ] **Build Command:** leave default (no custom command)
- [ ] **Output Directory:** leave default (no custom output)
- [ ] **Install Command:** leave default (`npm install` or auto-detected)

Do not override the build command or output directory.

---

## 4. What not to do

- **Do not** set `NEXTAUTH_URL` to `http://localhost:3000` in Vercel. That breaks auth redirects and cookies in production.
- **Do not** use the Supabase direct connection host (`db.xxx.supabase.co:5432`) for `DIRECT_URL` in Vercel. Use the **session pooler** (same pooler host, port 5432) so connections work from IPv4.
- **Do not** commit `.env` or `.env.local` to the repo. Secrets go only in Vercel’s Environment Variables.
- **Do not** deploy until all 8 environment variables above are set for the Production environment. A missing variable can cause build or runtime errors.

---

## 5. What to click in order in Vercel

1. **Import repo** — Vercel Dashboard → Add New → Project → Import Git Repository → select **ziegman1/fidelis-merch-website** (or connect GitHub and choose it).
2. **Review settings** — Confirm Framework Preset is Next.js, Root Directory is repo root, no custom build/output.
3. **Add env vars** — Before deploying (or in the first screen), go to Environment Variables and add all 8 variables from section 1. Set them for Production (and Preview if desired).
4. **Confirm framework/root** — In Project Settings → General, confirm Framework Preset = Next.js and Root Directory is empty or `.`.
5. **Deploy** — Click Deploy (or trigger the first deployment). Wait for the build to finish.

---

## 6. What to test immediately after deploy

- [ ] **Homepage** — Open `https://fidelis-merch-website.vercel.app` and confirm the storefront loads.
- [ ] **Shop page** — Open `/shop` and confirm the product list loads (DB-backed).
- [ ] **Product page** — Click a product and confirm the product detail page loads.
- [ ] **Auth / Admin** — Open `/admin` (or `/admin/login`). Sign in with your admin user; confirm you reach the admin dashboard.
- [ ] **DB-backed page** — Confirm at least one page that uses the database (e.g. shop or product) loads without 500 errors. If any of these fail, check Vercel logs and that `DATABASE_URL` and `DIRECT_URL` are set correctly.

---

*No secrets are stored in this doc. All sensitive values stay in `.env.local` (local) and in Vercel Environment Variables (production).*
