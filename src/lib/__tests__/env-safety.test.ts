import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertApprovedDevelopmentDatabase,
  assertBlobWriteAllowed,
  assertDatabaseAllowed,
  assertPrintifyReadAllowed,
  assertPrintifyWriteAllowed,
  assertSafeNonProductionStartup,
  assertStripePublishableKeyAllowed,
  assertStripeSecretKeyAllowed,
  DEVELOPMENT_DATABASE_FINGERPRINTS,
  enableProductionOperatorMode,
  EnvironmentSafetyError,
  getDatabaseIdentity,
  getDeploymentEnvironment,
  getEmailDeliveryMode,
  isPrintifyReadAllowed,
  PRODUCTION_BLOB_STORE_FINGERPRINTS,
  PRODUCTION_DATABASE_FINGERPRINTS,
  resetProductionOperatorModeForTests,
} from "@/lib/env-safety";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// A fake project registered as "production" for the duration of each test.
const FAKE_PROD_REF = "abcdefghijklmnopqrst";
const FAKE_PROD_FINGERPRINT = sha(`supabase:${FAKE_PROD_REF}`);
const PROD_POOLER_URL = `postgresql://postgres.${FAKE_PROD_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
const PROD_DIRECT_URL = `postgresql://postgres:pw@db.${FAKE_PROD_REF}.supabase.co:5432/postgres`;
const DEV_URL = "postgresql://dev:dev@127.0.0.1:5432/fidelis_dev";

const FAKE_PROD_BLOB_TOKEN = "vercel_blob_rw_FakeProdStore1_notarealsecret";
const FAKE_DEV_BLOB_TOKEN = "vercel_blob_rw_FakeDevStore22_notarealsecret";
const FAKE_PROD_BLOB_FINGERPRINT = sha("vercel-blob-store:FakeProdStore1");

const DEVELOPMENT = { NODE_ENV: "development" };
const LOCAL_BUILD = { NODE_ENV: "production" };
const PREVIEW = { VERCEL_ENV: "preview", NODE_ENV: "production" };
const TEST = { NODE_ENV: "test" };
const PRODUCTION = { VERCEL_ENV: "production", NODE_ENV: "production" };

beforeEach(() => {
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).add(FAKE_PROD_FINGERPRINT);
  (PRODUCTION_BLOB_STORE_FINGERPRINTS as Set<string>).add(FAKE_PROD_BLOB_FINGERPRINT);
});

afterEach(() => {
  (PRODUCTION_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_PROD_FINGERPRINT);
  (PRODUCTION_BLOB_STORE_FINGERPRINTS as Set<string>).delete(FAKE_PROD_BLOB_FINGERPRINT);
  resetProductionOperatorModeForTests();
});

describe("environment classification", () => {
  it("classifies production, preview, development and test", () => {
    expect(getDeploymentEnvironment(PRODUCTION)).toBe("production");
    expect(getDeploymentEnvironment(PREVIEW)).toBe("preview");
    expect(getDeploymentEnvironment(DEVELOPMENT)).toBe("development");
    expect(getDeploymentEnvironment(TEST)).toBe("test");
    expect(getDeploymentEnvironment({ VITEST: "true" })).toBe("test");
  });

  it("treats a local production build as development", () => {
    expect(getDeploymentEnvironment(LOCAL_BUILD)).toBe("development");
  });

  it("does not treat a pulled production env under `next dev` as production", () => {
    expect(getDeploymentEnvironment({ VERCEL_ENV: "production", NODE_ENV: "development" })).toBe("development");
  });

  it("is running as test under vitest", () => {
    expect(getDeploymentEnvironment()).toBe("test");
  });

  it("keeps the real production database and Blob store fingerprints registered", () => {
    expect(PRODUCTION_DATABASE_FINGERPRINTS.has("30698822b00e73c356ca1816be0a7c582038c41715ad749b55e76e6203ae67a2")).toBe(true);
    expect(PRODUCTION_BLOB_STORE_FINGERPRINTS.has("554cec6940a5d742ccafe0690afb3932d1768c88a05f0a783f32e4ae3264b324")).toBe(true);
    expect(PRODUCTION_BLOB_STORE_FINGERPRINTS.has("a4098df629550a19789cb69a2469daee11dc55dceff4d4cabbed169103c4236d")).toBe(true);
  });
});

describe("database identity", () => {
  it("identifies Supabase projects from pooler usernames and direct hosts, including quoted values", () => {
    expect(getDatabaseIdentity(PROD_POOLER_URL)).toBe(`supabase:${FAKE_PROD_REF}`);
    expect(getDatabaseIdentity(PROD_DIRECT_URL)).toBe(`supabase:${FAKE_PROD_REF}`);
    expect(getDatabaseIdentity(`"${PROD_DIRECT_URL}"`)).toBe(`supabase:${FAKE_PROD_REF}`);
  });

  it("does not rely on the word production", () => {
    expect(getDatabaseIdentity("postgresql://u:p@production.example.com:5432/production")).toBe(
      "postgres:production.example.com:5432/production"
    );
  });

  it("returns null for unidentifiable URLs", () => {
    expect(getDatabaseIdentity("not a url")).toBeNull();
    expect(getDatabaseIdentity("mysql://u:p@host/db")).toBeNull();
    expect(getDatabaseIdentity("postgresql://postgres:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres")).toBeNull();
  });
});

describe("database guard", () => {
  it.each([
    ["development", DEVELOPMENT],
    ["preview", PREVIEW],
    ["test", TEST],
    ["local build", LOCAL_BUILD],
  ])("%s cannot use the production database", (_label, base) => {
    expect(() => assertDatabaseAllowed({ ...base, DATABASE_URL: PROD_POOLER_URL })).toThrow(/PRODUCTION database/);
    expect(() => assertDatabaseAllowed({ ...base, DATABASE_URL: DEV_URL, DIRECT_URL: PROD_DIRECT_URL })).toThrow(/DIRECT_URL/);
    expect(() => assertDatabaseAllowed({ ...base, DATABASE_URL: DEV_URL, POSTGRES_URL_NON_POOLING: PROD_DIRECT_URL })).toThrow(
      /POSTGRES_URL_NON_POOLING/
    );
  });

  it("refuses unidentifiable database URLs outside production", () => {
    expect(() => assertDatabaseAllowed({ ...DEVELOPMENT, DATABASE_URL: "garbage" })).toThrow(EnvironmentSafetyError);
  });

  it("fails closed when safe development database credentials are missing", () => {
    expect(() => assertDatabaseAllowed(DEVELOPMENT)).toThrow(/DATABASE_URL is not set/);
    expect(() => assertDatabaseAllowed(PREVIEW)).toThrow(/DATABASE_URL is not set/);
    expect(() => assertSafeNonProductionStartup(DEVELOPMENT)).toThrow(/DATABASE_URL is not set/);
  });

  it("allows a separate development database", () => {
    expect(() => assertDatabaseAllowed({ ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: DEV_URL })).not.toThrow();
    expect(() => assertDatabaseAllowed(TEST)).not.toThrow();
  });

  it("permits the production database in production", () => {
    expect(() => assertDatabaseAllowed({ ...PRODUCTION, DATABASE_URL: PROD_POOLER_URL, DIRECT_URL: PROD_DIRECT_URL })).not.toThrow();
  });
});

describe("approved development database allowlist", () => {
  const FAKE_DEV_REF = "devdevdevdevdevdevdv";
  const FAKE_DEV_FINGERPRINT = sha(`supabase:${FAKE_DEV_REF}`);
  const APPROVED_POOLER_URL = `postgresql://postgres.${FAKE_DEV_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  const APPROVED_DIRECT_URL = `postgresql://postgres:pw@db.${FAKE_DEV_REF}.supabase.co:5432/postgres`;
  const APPROVED = { ...DEVELOPMENT, DATABASE_URL: APPROVED_POOLER_URL, DIRECT_URL: APPROVED_DIRECT_URL };

  beforeEach(() => (DEVELOPMENT_DATABASE_FINGERPRINTS as Set<string>).add(FAKE_DEV_FINGERPRINT));
  afterEach(() => (DEVELOPMENT_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_DEV_FINGERPRINT));

  it("registers only the verified fidelis-merch-dev fingerprint, never a production one", () => {
    (DEVELOPMENT_DATABASE_FINGERPRINTS as Set<string>).delete(FAKE_DEV_FINGERPRINT);
    expect([...DEVELOPMENT_DATABASE_FINGERPRINTS]).toEqual(["a7979765f6ea614874d4ddde2ee04e4fa7f14c95de6c9d19d01f18b19e31c796"]);
    for (const fp of DEVELOPMENT_DATABASE_FINGERPRINTS) expect(PRODUCTION_DATABASE_FINGERPRINTS.has(fp)).toBe(false);
  });

  it("permits an allowlisted database in development", () => {
    expect(() => assertApprovedDevelopmentDatabase(APPROVED)).not.toThrow();
  });

  it("refuses an identifiable but non-allowlisted development database", () => {
    expect(() => assertApprovedDevelopmentDatabase({ ...DEVELOPMENT, DATABASE_URL: DEV_URL, DIRECT_URL: DEV_URL })).toThrow(
      /DATABASE_URL is not an approved development database/
    );
    expect(() => assertApprovedDevelopmentDatabase({ ...APPROVED, POSTGRES_URL: DEV_URL })).toThrow(/POSTGRES_URL is not an approved/);
  });

  it("refuses production, unidentifiable and missing databases", () => {
    expect(() => assertApprovedDevelopmentDatabase({ ...DEVELOPMENT, DATABASE_URL: PROD_POOLER_URL })).toThrow(/PRODUCTION database/);
    expect(() => assertApprovedDevelopmentDatabase({ ...APPROVED, DIRECT_URL: PROD_DIRECT_URL })).toThrow(/PRODUCTION database/);
    expect(() => assertApprovedDevelopmentDatabase({ ...DEVELOPMENT, DATABASE_URL: "garbage" })).toThrow(/cannot be identified/);
    expect(() => assertApprovedDevelopmentDatabase(DEVELOPMENT)).toThrow(/DATABASE_URL is not set/);
  });

  it("refuses every environment other than development, even with an allowlisted database", () => {
    for (const base of [PREVIEW, TEST, PRODUCTION, { VITEST: "true" }]) {
      expect(() => assertApprovedDevelopmentDatabase({ ...base, DATABASE_URL: APPROVED_POOLER_URL })).toThrow(/only runs in the "development"/);
    }
  });

  it("is refused in production operator mode", () => {
    enableProductionOperatorMode("seed-development", ["--production"], { FIDELIS_PRODUCTION_OPERATOR: "seed-development" });
    expect(() => assertApprovedDevelopmentDatabase(APPROVED)).toThrow(/not "production"/);
  });
});

describe("Stripe guard", () => {
  const LIVE = "sk_live_dummy_not_real";
  it.each([
    ["development", DEVELOPMENT],
    ["preview", PREVIEW],
    ["test", TEST],
  ])("%s cannot use a Stripe live key", (_label, env) => {
    expect(() => assertStripeSecretKeyAllowed(LIVE, env)).toThrow(/LIVE-mode/);
    expect(() => assertStripeSecretKeyAllowed("rk_live_dummy", env)).toThrow(/LIVE-mode/);
    expect(() => assertStripePublishableKeyAllowed("pk_live_dummy", env)).toThrow(EnvironmentSafetyError);
  });

  it("refuses unrecognized key formats outside production", () => {
    expect(() => assertStripeSecretKeyAllowed("garbage", DEVELOPMENT)).toThrow(/unrecognized/);
  });

  it("allows test keys outside production", () => {
    expect(assertStripeSecretKeyAllowed("sk_test_dummy", DEVELOPMENT)).toBe("sk_test_dummy");
    expect(assertStripePublishableKeyAllowed("pk_test_dummy", PREVIEW)).toBe("pk_test_dummy");
  });

  it("permits a live key in production", () => {
    expect(assertStripeSecretKeyAllowed(LIVE, PRODUCTION)).toBe(LIVE);
    expect(assertStripePublishableKeyAllowed("pk_live_dummy", PRODUCTION)).toBe("pk_live_dummy");
  });

  it("startup check refuses live keys outside production", () => {
    expect(() => assertSafeNonProductionStartup({ ...DEVELOPMENT, DATABASE_URL: DEV_URL, STRIPE_SECRET_KEY: LIVE })).toThrow(/LIVE-mode/);
    expect(() =>
      assertSafeNonProductionStartup({ ...PRODUCTION, DATABASE_URL: PROD_POOLER_URL, STRIPE_SECRET_KEY: LIVE })
    ).not.toThrow();
  });
});

describe("Printify guard", () => {
  it.each([
    ["development", DEVELOPMENT],
    ["preview", PREVIEW],
    ["test", TEST],
  ])("%s cannot create Printify orders, even with reads enabled", (_label, env) => {
    expect(() => assertPrintifyWriteAllowed({ ...env, FIDELIS_ALLOW_PRINTIFY_READS: "true" })).toThrow(/disabled/);
  });

  it("disables reads outside production by default and always in test", () => {
    expect(isPrintifyReadAllowed(DEVELOPMENT)).toBe(false);
    expect(isPrintifyReadAllowed(PREVIEW)).toBe(false);
    expect(isPrintifyReadAllowed({ ...DEVELOPMENT, FIDELIS_ALLOW_PRINTIFY_READS: "true" })).toBe(true);
    expect(isPrintifyReadAllowed({ ...TEST, FIDELIS_ALLOW_PRINTIFY_READS: "true" })).toBe(false);
    expect(() => assertPrintifyReadAllowed(TEST)).toThrow(EnvironmentSafetyError);
  });

  it("permits Printify in production", () => {
    expect(() => assertPrintifyWriteAllowed(PRODUCTION)).not.toThrow();
    expect(isPrintifyReadAllowed(PRODUCTION)).toBe(true);
  });
});

describe("email delivery mode", () => {
  it("never sends to real recipients outside production", () => {
    expect(getEmailDeliveryMode(DEVELOPMENT)).toBe("suppress");
    expect(getEmailDeliveryMode(PREVIEW)).toBe("suppress");
    expect(getEmailDeliveryMode({ ...PREVIEW, FIDELIS_EMAIL_SINK: "resend-test" })).toBe("sink");
    expect(getEmailDeliveryMode({ ...TEST, FIDELIS_EMAIL_SINK: "resend-test" })).toBe("suppress");
  });

  it("sends normally in production, ignoring the sink setting", () => {
    expect(getEmailDeliveryMode({ ...PRODUCTION, FIDELIS_EMAIL_SINK: "resend-test" })).toBe("send");
  });
});

describe("Blob guard", () => {
  it.each([
    ["development", DEVELOPMENT],
    ["preview", PREVIEW],
  ])("%s cannot write to the production Blob store", (_label, env) => {
    expect(() => assertBlobWriteAllowed({ ...env, BLOB_READ_WRITE_TOKEN: FAKE_PROD_BLOB_TOKEN })).toThrow(/disabled/);
    expect(() =>
      assertBlobWriteAllowed({ ...env, FIDELIS_ALLOW_BLOB_WRITES: "true", BLOB_READ_WRITE_TOKEN: FAKE_PROD_BLOB_TOKEN })
    ).toThrow(/PRODUCTION Blob store/);
  });

  it("always refuses Blob writes in test", () => {
    expect(() =>
      assertBlobWriteAllowed({ ...TEST, FIDELIS_ALLOW_BLOB_WRITES: "true", BLOB_READ_WRITE_TOKEN: FAKE_DEV_BLOB_TOKEN })
    ).toThrow(/test environment/);
  });

  it("allows an explicitly enabled non-production store", () => {
    expect(() =>
      assertBlobWriteAllowed({ ...DEVELOPMENT, FIDELIS_ALLOW_BLOB_WRITES: "true", BLOB_READ_WRITE_TOKEN: FAKE_DEV_BLOB_TOKEN })
    ).not.toThrow();
  });

  it("permits Blob writes in production", () => {
    expect(() => assertBlobWriteAllowed({ ...PRODUCTION, BLOB_READ_WRITE_TOKEN: FAKE_PROD_BLOB_TOKEN })).not.toThrow();
  });
});

describe("production operator mode", () => {
  it("is off without --production", () => {
    expect(enableProductionOperatorMode("resend-order-emails", ["node", "script"], DEVELOPMENT)).toBe(false);
  });

  it("requires FIDELIS_PRODUCTION_OPERATOR to name the script", () => {
    expect(() => enableProductionOperatorMode("resend-order-emails", ["--production"], DEVELOPMENT)).toThrow(
      /FIDELIS_PRODUCTION_OPERATOR=resend-order-emails/
    );
    expect(() =>
      enableProductionOperatorMode("resend-order-emails", ["--production"], { ...DEVELOPMENT, FIDELIS_PRODUCTION_OPERATOR: "seed-admin" })
    ).toThrow(EnvironmentSafetyError);
  });

  it("is unavailable in preview and test", () => {
    const op = { FIDELIS_PRODUCTION_OPERATOR: "seed-admin" };
    expect(() => enableProductionOperatorMode("seed-admin", ["--production"], { ...PREVIEW, ...op })).toThrow(/preview/);
    expect(() => enableProductionOperatorMode("seed-admin", ["--production"], { ...TEST, ...op })).toThrow(/test/);
  });

  it("switches the process to production only with both signals", () => {
    const env = { ...DEVELOPMENT, FIDELIS_PRODUCTION_OPERATOR: "seed-admin" };
    expect(enableProductionOperatorMode("seed-admin", ["--production"], env)).toBe(true);
    expect(getDeploymentEnvironment(env)).toBe("production");
  });
});
