import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    PENDING: "outline",
    PAID: "secondary",
    FULFILLING: "default",
    SHIPPED: "default",
    COMPLETE: "default",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-brand-primary tracking-wide">Orders</h1>
      <div className="rounded-md border border-zinc-700">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
              <TableHead className="text-cream">Order</TableHead>
              <TableHead className="text-cream">Email</TableHead>
              <TableHead className="text-cream">Total</TableHead>
              <TableHead className="text-cream">Status</TableHead>
              <TableHead className="text-cream">Date</TableHead>
              <TableHead className="text-right text-cream">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow className="border-zinc-700">
                <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id} className="border-zinc-700 hover:bg-zinc-800/50">
                  <TableCell className="font-mono text-sm text-cream">{o.id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-zinc-400">{o.email}</TableCell>
                  <TableCell className="text-brand-accent font-medium">${(o.totalCents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status] ?? "outline"} className="border-zinc-500">
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/orders/${o.id}`} className="text-sm text-brand-primary hover:underline">
                      View
                    </Link>
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
