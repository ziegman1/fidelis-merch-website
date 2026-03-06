import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal proxy: only sets x-pathname for /admin so layout can do path-aware auth.
 * No auth, Prisma, or heavy imports — keeps Edge bundle under size limit.
 */
export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", path);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
