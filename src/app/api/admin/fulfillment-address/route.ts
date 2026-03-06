import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const putSchema = z.object({
  name: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const address = await prisma.defaultFulfillmentAddress.findFirst();
  return NextResponse.json(address ?? null);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = putSchema.parse(body);
    const existing = await prisma.defaultFulfillmentAddress.findFirst();
    const toNull = (v: string | undefined) => (v === "" || v === undefined ? null : v);
    if (existing) {
      const updated = await prisma.defaultFulfillmentAddress.update({
        where: { id: existing.id },
        data: {
          name: data.name !== undefined ? toNull(data.name) : existing.name,
          line1: data.line1 !== undefined ? toNull(data.line1) : existing.line1,
          line2: data.line2 !== undefined ? toNull(data.line2) : existing.line2,
          city: data.city !== undefined ? toNull(data.city) : existing.city,
          state: data.state !== undefined ? toNull(data.state) : existing.state,
          postalCode: data.postalCode !== undefined ? toNull(data.postalCode) : existing.postalCode,
          country: data.country !== undefined ? toNull(data.country) ?? "US" : existing.country,
        },
      });
      return NextResponse.json(updated);
    }
    const created = await prisma.defaultFulfillmentAddress.create({
      data: {
        name: toNull(data.name),
        line1: toNull(data.line1),
        line2: toNull(data.line2),
        city: toNull(data.city),
        state: toNull(data.state),
        postalCode: toNull(data.postalCode),
        country: toNull(data.country) ?? "US",
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
