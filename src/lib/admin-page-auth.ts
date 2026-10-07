import { redirect } from "next/navigation";
import { auth, requireAdmin } from "@/auth";

/**
 * Must be the first call in every admin page, before any data is loaded.
 * The admin layout's redirect does not stop the page itself from rendering.
 */
export async function requireAdminPage(callbackPath = "/admin") {
  const session = await auth();
  if (!session?.user) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  if (!requireAdmin(session)) redirect("/");
  return session;
}
