# Fidelis Merch — Implementation Plan

## Overview

Phased approach to deliver a production-ready e-commerce site for Fidelis International Seminary with multi-supplier fulfillment (Printify + self-fulfilled), admin product/order management, and a brand-aligned storefront.

---

## Phase 1 — Get Started (Current)

**Goal:** Runnable storefront + admin + basic fulfillment routing.

| Deliverable | Description |
|-------------|-------------|
| Repo structure | Next.js App Router, TypeScript, Tailwind, shadcn/ui, Prisma, Auth.js |
| Routes | Storefront: `/`, `/shop`, `/product/[slug]`, `/cart`, `/checkout`, `/order/success`; Admin: `/admin/*` |
| Auth + RBAC | Auth.js; roles ADMIN, STAFF, CUSTOMER; middleware protecting `/admin` |
| Prisma schema | User, Product, ProductVariant, Collection, Provider, Order, OrderItem, Fulfillment, Shipment, Inventory, etc. |
| Product CRUD | Admin: create/edit products; choose fulfillment_type; link Printify or define self-fulfilled SKUs |
| Storefront UI | Home (hero, featured), shop with filters, product detail, cart; brand-driven design |
| Stripe checkout | Hosted Checkout (v1); create Order + OrderItems on success |
| Provider abstraction | `FulfillmentProvider` interface; `PrintifyProvider` adapter with `createOrder` |
| Fulfillment routing | On order paid: dropship items → `provider.createOrder()`; self-fulfilled → internal fulfillment tasks |
| Design system | `/docs/branding.md`; Tailwind theme tokens from logo/brand assets |
| Docs | README (setup, env), `.env.example`, `/docs/assumptions.md` |

**Out of scope for V1:** Printify bulk import, webhooks (use polling/manual refresh), user accounts (guest checkout OK).

---

## Phase 1.5 — Polish & Operations

- Stripe webhooks for payment confirmation (idempotent).
- Resend transactional emails: order confirmation, shipping updates.
- Admin: fulfillment status refresh (poll Printify), mark self-fulfilled as “made”/“shipped”, enter tracking.
- Optional: simple cart persistence (cookie or DB).
- Basic SEO (metadata, structured data).

---

## Phase 2 — Scale & Extensibility

- **Additional providers:** Implement second provider (e.g., Printful) using same `FulfillmentProvider` interface.
- **Printify bulk import:** Admin UI to sync/import products from Printify catalog.
- **User accounts:** Sign up / sign in; order history, saved addresses.
- **Inventory:** Low-stock alerts for self-fulfilled; optional oversell protection.
- **Analytics:** Simple admin dashboard (orders, revenue); optional integration (e.g., Plausible).

---

## Technical Decisions

- **Fulfillment:** Provider-agnostic service layer; all provider calls go through adapters.
- **Credentials:** Provider settings in DB; sensitive keys in env or encrypted at rest when feasible.
- **Orders:** Single Order record; OrderItems reference ProductVariant; Fulfillment records per provider/shipment group.
- **Design:** Single design system doc; Tailwind theme extends default palette with brand colors/fonts.
