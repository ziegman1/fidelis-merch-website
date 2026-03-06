# Fidelis Merch

E-commerce site for **Fidelis International Seminary** — storefront, admin product/order management, and multi-supplier fulfillment (Printify + self-fulfilled).

## Tech stack

- **Next.js** (App Router) + TypeScript
- **TailwindCSS** + shadcn/ui
- **PostgreSQL** + Prisma ORM
- **Auth.js** (NextAuth v5) for admin auth
- **Stripe** for payments
- **Resend** (optional) for transactional email
- **Zod** for validation

## Local setup

### 1. Dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and set:

```bash
cp .env.example .env.local
```

Required for local run:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local |
| `STRIPE_SECRET_KEY` | Stripe test key (sk_test_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable key (pk_test_...) |

Optional (for full flows):

- `STRIPE_WEBHOOK_SECRET` — for webhooks (v1.5)
- `RESEND_API_KEY`, `EMAIL_FROM` — order emails
- `PRINTIFY_API_KEY`, `PRINTIFY_SHOP_ID` — Printify dropship

### 3. Database

```bash
npm run db:migrate
npm run db:seed
```

Seed creates:

- Admin user: **admin@fidelis.example** / **admin123**
- Printify provider
- Featured & Apparel collections
- Two sample products (self-fulfilled tumbler, dropship tee)

### 4. Run dev server

```bash
npm run dev
```

- **Storefront:** http://localhost:3000  
- **Admin:** http://localhost:3000/admin (sign in with seed admin)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema (no migrations) |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Project layout

- `/docs` — Implementation plan, branding, assumptions
- `/prisma` — Schema, migrations, seed
- `/src/app` — App Router routes
  - `(storefront)/` — Home, shop, product, cart, checkout, order success
  - `admin/` — Dashboard, products, orders, providers, settings
  - `api/` — Auth, cart-variants, checkout
- `/src/lib` — db, auth, orders, fulfillment (provider abstraction + Printify)
- `/src/components` — UI (shadcn), providers

## Design

Brand colors and typography are defined in **`/docs/branding.md`** and applied via Tailwind theme in `src/app/globals.css` (e.g. `fidelis-gold`, `fidelis-red`, `cream`). Replace `/public/logo/fidelis-icon.svg` with your logo asset if desired.

## Fulfillment

- **Dropship:** Products with `fulfillmentType: dropship` and a provider (e.g. Printify) are sent to the provider when an order is paid; external IDs are stored in `ExternalProductMapping`.
- **Self-fulfilled:** Products with `fulfillmentType: self_fulfilled` get an internal `Fulfillment` record; admin can mark items made/shipped and add tracking.

See `/docs/implementation-plan.md` for v1.5 and v2 scope.
