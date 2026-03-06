import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";
  const session = req.auth;

  if (!isAdminRoute) return NextResponse.next();

  if (isLoginPage) {
    if (session?.user?.role === "ADMIN" || session?.user?.role === "STAFF") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
