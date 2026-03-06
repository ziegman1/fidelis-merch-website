import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminProvidersPage() {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">Providers</h1>
      <p className="text-zinc-400 max-w-2xl">
        Dropship providers (e.g. Printify). Configure API keys in environment variables (PRINTIFY_API_KEY, PRINTIFY_SHOP_ID).
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => (
          <Card key={p.id} className="border-fidelis-gold/20 bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-cream">{p.name}</CardTitle>
                <CardDescription>{p.slug}</CardDescription>
              </div>
              <Badge className={p.isActive ? "bg-green-900/50 text-green-300" : "bg-zinc-700"}>
                {p.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                {p._count.products} product(s) linked
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
