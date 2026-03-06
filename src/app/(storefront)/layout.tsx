import Link from "next/link";
import Image from "next/image";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-cream">
      <header className="border-b border-fidelis-gold/30 sticky top-0 z-50 bg-black/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between min-h-20 py-2">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-black">
              <Image
                src="/logo/fidelis-shield.png"
                alt="Fidelis"
                width={80}
                height={80}
                className="object-cover w-full h-full"
                style={{ objectPosition: "center 70%" }}
                priority
              />
            </div>
            <span className="font-serif text-xl text-fidelis-gold tracking-wide hidden sm:inline">
              Fidelis Merch
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/shop" className="text-sm text-zinc-300 hover:text-fidelis-gold transition-colors">
              Shop
            </Link>
            <Link href="/cart" className="text-sm text-zinc-300 hover:text-fidelis-gold transition-colors">
              Cart
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-fidelis-gold/20 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
          <p className="font-serif text-fidelis-gold tracking-wide">Fidelis International Seminary</p>
          <p className="mt-1">JUDE 1:3</p>
          <p className="mt-4">© {new Date().getFullYear()} Fidelis Merch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
