import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      variants: { take: 1 },
      provider: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-fidelis-gold tracking-wide">Products</h1>
        <Button asChild className="bg-fidelis-gold text-black hover:bg-fidelis-gold/90">
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>
      <div className="rounded-md border border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
              <TableHead className="text-cream">Title</TableHead>
              <TableHead className="text-cream">Slug</TableHead>
              <TableHead className="text-cream">Fulfillment</TableHead>
              <TableHead className="text-cream">Provider</TableHead>
              <TableHead className="text-cream">Status</TableHead>
              <TableHead className="text-right text-cream">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow className="border-zinc-700">
                <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                  No products yet. <Link href="/admin/products/new" className="text-fidelis-gold hover:underline">Add one</Link>.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.id} className="border-zinc-700 hover:bg-zinc-800/50">
                  <TableCell className="font-medium text-cream">{p.title}</TableCell>
                  <TableCell className="text-zinc-400">{p.slug}</TableCell>
                  <TableCell>
                    <Badge variant={p.fulfillmentType === "dropship" ? "secondary" : "outline"} className="border-fidelis-gold/50">
                      {p.fulfillmentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">{p.provider?.name ?? "—"}</TableCell>
                  <TableCell>
                    {p.published ? (
                      <Badge className="bg-green-900/50 text-green-300">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-500 text-zinc-400">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="text-fidelis-gold">
                      <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
