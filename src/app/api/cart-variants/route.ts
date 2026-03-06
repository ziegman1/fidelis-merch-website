import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ variantIds: z.array(z.string()).max(100) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { variantIds } = schema.parse(body);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, title: true, slug: true } } },
    });
    return NextResponse.json({ variants });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
