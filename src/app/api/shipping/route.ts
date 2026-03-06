import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ country: z.string().min(1).max(3).toUpperCase() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { country } = schema.parse(body);
    const zoneType = country === "US" ? "domestic_us" : "international";
    const rate = await prisma.shippingRate.findUnique({
      where: { zoneType },
    });
    if (!rate) {
      return NextResponse.json(
        { error: "Shipping rate not configured" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      zoneType,
      country,
      rate: {
        id: rate.id,
        name: rate.name,
        priceCents: rate.priceCents,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid country code" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
