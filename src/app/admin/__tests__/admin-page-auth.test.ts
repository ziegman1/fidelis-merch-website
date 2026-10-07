import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  calls: [] as string[],
  session: null as null | { user: { id: string; role: string } },
  findUniqueResult: null as unknown,
}));

// Stub next-auth itself so the real src/auth.ts (and its requireAdmin) is exercised.
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: async () => {
      h.calls.push("auth");
      return h.session;
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: unknown) => config }));

vi.mock("@/lib/db", () => {
  const result = (method: string) => {
    if (method === "findMany" || method === "groupBy") return [];
    if (method === "count") return 0;
    if (method === "findUnique") return h.findUniqueResult;
    return null;
  };
  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_, method) =>
          method === "then"
            ? undefined
            : async () => {
                h.calls.push(`prisma.${name}.${String(method)}`);
                return result(String(method));
              },
      }
    );
  const prisma = new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === "then") return undefined;
        if (name === "$queryRaw") {
          return async () => {
            h.calls.push("prisma.$queryRaw");
            return [];
          };
        }
        return model(String(name));
      },
    }
  );
  return { prisma };
});

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const ROOT = path.resolve(__dirname, "../../../..");
const SYNTHETIC_ID = "synthetic-nonexistent-id";

const syntheticOrder = {
  id: SYNTHETIC_ID,
  email: "synthetic@example.invalid",
  status: "PAID",
  totalCents: 0,
  shippingName: null,
  shippingLine1: null,
  shippingLine2: null,
  shippingCity: null,
  shippingState: null,
  shippingPostalCode: null,
  shippingCountry: "US",
  items: [],
  fulfillments: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const syntheticProduct = {
  id: SYNTHETIC_ID,
  title: "Synthetic",
  slug: "synthetic",
  description: null,
  shortDescription: null,
  featuredImage: null,
  fulfillmentType: "self_fulfilled",
  providerId: null,
  provider: null,
  status: "DRAFT",
  published: false,
  tags: [],
  colorOrder: null,
  primaryImageId: null,
  markOutOfStock: false,
  paused: false,
  comingSoon: false,
  images: [],
  variants: [],
  collections: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

type PageCase = {
  route: string;
  callback: string;
  load: () => Promise<{ default: (props: never) => unknown }>;
  props?: Record<string, unknown>;
  fixture?: unknown;
  loadsData: boolean;
};

const params = { params: Promise.resolve({ id: SYNTHETIC_ID }) };

const PAGES: PageCase[] = [
  { route: "/admin", callback: "/admin", load: () => import("@/app/admin/page"), loadsData: true },
  { route: "/admin/orders", callback: "/admin/orders", load: () => import("@/app/admin/orders/page"), loadsData: true },
  {
    route: "/admin/orders/[id]",
    callback: "/admin/orders",
    load: () => import("@/app/admin/orders/[id]/page"),
    props: params,
    fixture: syntheticOrder,
    loadsData: true,
  },
  {
    route: "/admin/products",
    callback: "/admin/products",
    load: () => import("@/app/admin/products/page"),
    props: { searchParams: Promise.resolve({}) },
    loadsData: true,
  },
  {
    route: "/admin/products/[id]/edit",
    callback: "/admin/products",
    load: () => import("@/app/admin/products/[id]/edit/page"),
    props: params,
    fixture: syntheticProduct,
    loadsData: true,
  },
  { route: "/admin/products/new", callback: "/admin/products/new", load: () => import("@/app/admin/products/new/page"), loadsData: true },
  { route: "/admin/stats", callback: "/admin/stats", load: () => import("@/app/admin/stats/page"), loadsData: true },
  { route: "/admin/shipping", callback: "/admin/shipping", load: () => import("@/app/admin/shipping/page"), loadsData: true },
  { route: "/admin/providers", callback: "/admin/providers", load: () => import("@/app/admin/providers/page"), loadsData: true },
  { route: "/admin/settings", callback: "/admin/settings", load: () => import("@/app/admin/settings/page"), loadsData: false },
];

const prismaCalls = () => h.calls.filter((c) => c.startsWith("prisma."));

async function render(page: PageCase) {
  const mod = await page.load();
  return mod.default((page.props ?? {}) as never);
}

beforeEach(() => {
  h.calls.length = 0;
  h.session = null;
  h.findUniqueResult = null;
});

describe.each(PAGES)("$route", (page) => {
  it("redirects unauthenticated requests to /admin/login before loading any data", async () => {
    await expect(render(page)).rejects.toThrow(
      `NEXT_REDIRECT:/admin/login?callbackUrl=${encodeURIComponent(page.callback)}`
    );
    expect(h.calls).toEqual(["auth"]);
  });

  it("redirects non-admin users to / before loading any data", async () => {
    h.session = { user: { id: "u1", role: "CUSTOMER" } };
    await expect(render(page)).rejects.toThrow("NEXT_REDIRECT:/");
    expect(h.calls).toEqual(["auth"]);
  });

  it.each(["ADMIN", "STAFF"])("renders for %s, authorizing before any query", async (role) => {
    h.session = { user: { id: "u1", role } };
    h.findUniqueResult = page.fixture ?? null;
    await expect(render(page)).resolves.toBeTruthy();
    expect(h.calls[0]).toBe("auth");
    if (page.loadsData) expect(prismaCalls().length).toBeGreaterThan(0);
    else expect(prismaCalls()).toEqual([]);
  });
});

describe("/admin/products/[id]/preview (existing inline check)", () => {
  const load = () => import("@/app/admin/products/[id]/preview/page");

  it.each([null, "CUSTOMER"])("shows the sign-in message without loading data for %s", async (role) => {
    h.session = role ? { user: { id: "u1", role } } : null;
    const mod = await load();
    await expect(mod.default(params as never)).resolves.toBeTruthy();
    expect(h.calls).toEqual(["auth"]);
  });

  it.each(["ADMIN", "STAFF"])("queries only after authorizing %s", async (role) => {
    h.session = { user: { id: "u1", role } };
    const mod = await load();
    await expect(mod.default(params as never)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(h.calls[0]).toBe("auth");
    expect(prismaCalls()).toEqual(["prisma.product.findUnique"]);
  });
});

describe("admin layout", () => {
  const load = () => import("@/app/admin/layout");

  it("redirects unauthenticated requests to /admin/login", async () => {
    const { default: AdminLayout } = await load();
    await expect(AdminLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT:/admin/login");
  });

  it("redirects non-admin users to /", async () => {
    h.session = { user: { id: "u1", role: "CUSTOMER" } };
    const { default: AdminLayout } = await load();
    await expect(AdminLayout({ children: null })).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it.each(["ADMIN", "STAFF"])("renders for %s", async (role) => {
    h.session = { user: { id: "u1", role } };
    const { default: AdminLayout } = await load();
    await expect(AdminLayout({ children: null })).resolves.toBeTruthy();
  });

  it("does not trust a request header to decide whether to enforce auth", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/admin/layout.tsx"), "utf8");
    expect(src).not.toMatch(/x-pathname|next\/headers/);
    expect(fs.existsSync(path.join(ROOT, "src/proxy.ts"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "src/middleware.ts"))).toBe(false);
  });
});

describe("/admin/login", () => {
  const load = () => import("@/app/(admin-auth)/admin/login/page");

  it("lives outside the protected admin layout", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/admin/login"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "src/app/(admin-auth)/admin/login/page.tsx"))).toBe(true);
    const layout = fs.readFileSync(path.join(ROOT, "src/app/(admin-auth)/admin/login/layout.tsx"), "utf8");
    expect(layout).not.toMatch(/auth|prisma|redirect/);
  });

  it.each([null, "CUSTOMER"])("renders the login form for %s", async (role) => {
    h.session = role ? { user: { id: "u1", role } } : null;
    const { default: LoginPage } = await load();
    await expect(LoginPage()).resolves.toBeTruthy();
    expect(prismaCalls()).toEqual([]);
  });

  it("sends signed-in admins to /admin", async () => {
    h.session = { user: { id: "u1", role: "ADMIN" } };
    const { default: LoginPage } = await load();
    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
  });
});

describe("every admin page authorizes before its first query", () => {
  const adminDir = path.join(ROOT, "src/app/admin");
  const pages = (fs.readdirSync(adminDir, { recursive: true }) as string[])
    .filter((f) => f.endsWith("page.tsx"))
    .map((f) => path.join(adminDir, f));

  it("covers every page in the matrix above", () => {
    const covered = new Set([...PAGES.map((p) => p.route), "/admin/products/[id]/preview"]);
    const routes = pages.map((p) => "/admin" + path.dirname(path.relative(adminDir, p)).replace(/^\.$/, "").replace(/^(?!$)/, "/"));
    expect(routes.sort()).toEqual([...covered].sort());
  });

  it.each(pages.map((p) => [path.relative(ROOT, p), p]))("%s", (_, file) => {
    const src = fs.readFileSync(file, "utf8");
    const body = src.slice(src.indexOf("export default async function"));
    const guard = body.search(/await requireAdminPage\(|await auth\(\)/);
    const firstQuery = body.search(/prisma\./);
    expect(guard).toBeGreaterThanOrEqual(0);
    if (firstQuery >= 0) expect(guard).toBeLessThan(firstQuery);
  });
});

describe("removed debug endpoints", () => {
  it.each(["src/app/api/test-email", "src/app/api/debug/printify"])("%s no longer has a route", (dir) => {
    for (const name of ["route.ts", "route.tsx", "route.js", "page.tsx"]) {
      expect(fs.existsSync(path.join(ROOT, dir, name))).toBe(false);
    }
  });
});
