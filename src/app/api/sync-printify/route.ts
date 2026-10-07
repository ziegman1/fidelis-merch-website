/**
 * Trigger Printify product sync from API to DB.
 * Admin-only. POST or GET — use sparingly; rate limits apply.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncPrintifyToDb } from "@/lib/catalog/sync-printify-to-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncPrintifyToDb();
  return NextResponse.json(result);
}

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncPrintifyToDb();
  return NextResponse.json(result);
}
