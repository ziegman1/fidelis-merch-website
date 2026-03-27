import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB (under Vercel body limit)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 4 MB)" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "jpg";
  const pathname = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      ...(token ? { token } : {}),
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    const hasToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
    const isVercel = Boolean(process.env.VERCEL);
    const errMessage = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.name : "Error";

    console.error("[upload] Blob put failed:", {
      hasToken,
      isVercel,
      errName,
      errMessage,
    });

    const tokenRelated =
      errName === "BlobAccessError" ||
      errName === "BlobStoreNotFoundError" ||
      errMessage.toLowerCase().includes("token") ||
      errMessage.toLowerCase().includes("unauthorized") ||
      errMessage.toLowerCase().includes("access denied");

    const safeMessage = tokenRelated
      ? "Blob store token missing or invalid. In Vercel: set BLOB_READ_WRITE_TOKEN for Production, then redeploy."
      : errMessage.length < 200
        ? errMessage
        : "Upload failed.";

    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
