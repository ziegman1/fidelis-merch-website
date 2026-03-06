import Link from "next/link";
import { headers } from "next/headers";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <div className="min-h-screen bg-black text-cream">{children}</div>;
  }

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  if (!session?.user) redirect(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen bg-black text-cream">
      <header className="border-b border-fidelis-gold/30 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/admin" className="font-serif text-xl text-fidelis-gold tracking-wide">
            Fidelis Admin
          </Link>
          <nav className="flex items-center gap-6">
            {adminNav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-zinc-300 hover:text-fidelis-gold transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
              Storefront
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button type="submit" variant="outline" size="sm" className="border-fidelis-gold/50 text-fidelis-gold">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
