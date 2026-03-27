"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_SITE_COPY } from "@/data/site-copy-defaults";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { siteCopySaveSchema, type SiteCopySaveInput } from "@/lib/site-copy-zod";

const REVALIDATE_PATHS = [
  "/",
  "/about",
  "/mission",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
  "/shipping",
  "/returns",
  "/merch",
] as const;

export async function saveSiteCopyAction(
  data: SiteCopySaveInput,
): Promise<{ ok: true } | { ok: false; error: string; details?: unknown }> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = siteCopySaveSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      details: parsed.error.flatten(),
    };
  }

  try {
    await prisma.siteCopy.upsert({
      where: { id: "default" },
      create: { id: "default", payload: parsed.data as object },
      update: { payload: parsed.data as object },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Could not save to database. Is DATABASE_URL configured?" };
  }

  for (const p of REVALIDATE_PATHS) {
    revalidatePath(p);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Reset stored copy to code defaults (still requires Save to persist, or we could save directly) */
export async function resetSiteCopyToDefaultsAction(): Promise<
  { ok: true; data: typeof DEFAULT_SITE_COPY } | { ok: false; error: string }
> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  return { ok: true, data: structuredClone(DEFAULT_SITE_COPY) };
}
