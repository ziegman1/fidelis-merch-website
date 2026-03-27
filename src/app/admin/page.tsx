import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const [productCount, orderCount, collectionCount] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.collection.count(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/25 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-cream">Products</CardTitle>
            <CardDescription>Total products</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-primary">{productCount}</p>
            <Button asChild variant="outline" size="sm" className="mt-2 border-brand-primary/50 text-brand-primary">
              <Link href="/admin/products">Manage</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-brand-primary/25 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-cream">Orders</CardTitle>
            <CardDescription>Total orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-primary">{orderCount}</p>
            <Button asChild variant="outline" size="sm" className="mt-2 border-brand-primary/50 text-brand-primary">
              <Link href="/admin/orders">View</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-brand-primary/25 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-cream">Collections</CardTitle>
            <CardDescription>Product collections</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-primary">{collectionCount}</p>
            <Button asChild variant="outline" size="sm" className="mt-2 border-brand-primary/50 text-brand-primary">
              <Link href="/admin/products">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
