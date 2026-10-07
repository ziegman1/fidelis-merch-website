/**
 * Server-side admin auth helpers.
 * Use in server actions and API routes.
 */

import { auth } from "@/auth";

export function requireAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
}

export async function requireAdminSession(): Promise<{ id: string; role: string } | null> {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return null;
  }
  return { id: session.user.id!, role: session.user.role };
}
