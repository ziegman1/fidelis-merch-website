import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  if (session?.user && isAdmin) redirect("/admin");
  return <AdminLoginForm />;
}
