-- Enable Row Level Security (RLS) on all public tables
-- Satisfies Supabase Security Advisor "RLS Disabled in Public" findings.
--
-- Your app uses Prisma with a server-side connection (typically the postgres
-- role). PostgreSQL superusers bypass RLS, so your app will continue to work.
-- Enabling RLS protects against direct API access (anon/authenticated roles)
-- which would otherwise have unrestricted access with RLS off.
--
-- Tables in public schema (from Prisma schema):

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCollection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Provider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DefaultFulfillmentAddress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShippingRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalProductMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingCheckoutCart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fulfillment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FulfillmentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PageView" ENABLE ROW LEVEL SECURITY;
