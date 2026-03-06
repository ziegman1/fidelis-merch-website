import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  rates: z.array(
    z.object({
      id: z.string(),
      zoneType: z.string(),
      name: z.string(),
      priceCents: z.number(),
    })
  ),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { rates } = schema.parse(body);
    for (const r of rates) {
      await prisma.shippingRate.update({
        where: { id: r.id },
        data: { name: r.name, priceCents: r.priceCents },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
