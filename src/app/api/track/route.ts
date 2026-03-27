/**
 * Lightweight page view tracking for storefront analytics.
 * Called by client on storefront page loads. Does not track admin routes.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : null;
    if (!path || !path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    const referrer = req.headers.get("referer") ?? null;
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = (forwarded?.split(",")[0]?.trim() ?? realIp ?? "").slice(0, 45);
    const visitorId = ip
      ? createHash("sha256").update(ip + (process.env.ANALYTICS_SALT ?? "ziegs-merch")).digest("hex").slice(0, 16)
      : null;

    await prisma.pageView.create({
      data: { path, referrer, visitorId },
    });
  } catch {
    // Fail silently — don't break the site
  }
  return NextResponse.json({ ok: true });
}
