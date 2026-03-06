# Fidelis Merch — Assumptions

Decisions and assumptions made during the “Get Started” pass. Update this doc as requirements change.

---

## Product & Catalog

- **Slug:** Products have a unique `slug` for URLs; auto-generated from title if not provided.
- **Collections:** Many-to-many Product ↔ Collection; a product can be in multiple collections.
- **Variants:** Each Product has one or more ProductVariants (e.g. size, color); each variant has its own SKU, price, and (for self-fulfilled) inventory.
- **Images:** Product-level and/or variant-level images; at least one image per product for storefront.

---

## Fulfillment

- **Fulfillment type is per product:** Entire product is either `dropship` or `self_fulfilled`.
- **Dropship:** One provider per product (e.g. Printify); external IDs stored in `ExternalProductMapping` (e.g. `printify_product_id`, `printify_variant_id`).
- **Self-fulfilled:** Optional `Inventory` record per variant (stock integer); admin marks items “made” and “shipped” and can enter carrier + tracking.
- **Mixed orders:** One order can contain both dropship and self-fulfilled items; each type routed to the appropriate path (provider vs internal tasks).
- **Credentials:** Printify API key and shop ID can live in env vars; admin “Providers” UI stores which provider is active and references (e.g. provider_id); sensitive keys not stored in DB in v1 unless we add encryption.

---

## Orders & Payments

- **Stripe:** Hosted Checkout Session; success URL includes session_id; we create Order + OrderItems from session (line items linked to ProductVariant).
- **Order status:** e.g. PENDING, PAID, FULFILLING, SHIPPED, COMPLETE; payment confirmation drives transition to PAID and triggers fulfillment routing.
- **Guest checkout:** No login required; we store email and shipping address on Order.
- **User accounts (v2):** Optional; same Order model can later link to User.

---

## Admin

- **Roles:** ADMIN (full access), STAFF (products, orders, fulfillment; maybe no provider secrets), CUSTOMER (storefront only).
- **Auth:** Auth.js with credentials or a provider (e.g. Google); role stored on User in DB, used by middleware for `/admin`.
- **Provider config:** Admin can set Printify API key + shop ID (stored in env or DB); UI shows “connected” status; no bulk import in v1.

---

## Storefront

- **Home:** Hero, featured collections, featured products, mission/brand block (content can be from DB or static for v1).
- **Shop:** List products with filters (collection, price range, search); optional filter by fulfillment type.
- **Cart:** Client-side (e.g. React state + localStorage) for v1; no DB cart required.
- **Checkout:** Redirect to Stripe Hosted Checkout; return to `/order/success?session_id=...`.

---

## Provider Abstraction

- **Interface:** `createOrder(orderItems)`, `getOrderStatus(externalOrderId)`; later `listExternalProducts()` for bulk import.
- **Printify:** Implement `createOrder` in v1; status via polling or manual refresh; webhooks optional later.
- **New providers:** Implement same interface; register in a provider registry or config; no refactor of order/fulfillment flow.

---

## Design & Assets

- **Logo:** Use provided PNGs (transparent, black background) where appropriate; paths referenced in layout/header.
- **Colors/fonts:** As in `/docs/branding.md`; Tailwind theme extended via `tailwind.config.ts`.
- **Responsive:** Mobile-first; nav collapses to drawer on small screens.

---

## Environment & Deployment

- **Database:** PostgreSQL (e.g. Vercel Postgres, Neon, or local).
- **Deployment:** Vercel; server actions and API routes supported; env vars set in Vercel dashboard.
- **Secrets:** AUTH_SECRET, STRIPE keys, PRINTIFY keys, RESEND_API_KEY; DATABASE_URL; no secrets in repo.
