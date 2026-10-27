import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  
  // Security check: Only admins can upload blog images
  if (!isAdminUser(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "No file content provided" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, GIF or AVIF images can be uploaded" }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Images must be 5 MB or smaller" }, { status: 413 });
  }

  const file = await request.arrayBuffer();
  if (file.byteLength === 0 || file.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Images must be between 1 byte and 5 MB" }, { status: 413 });
  }

  // Keep only a safe basename so the client cannot choose a blob path.
  const safeName = (filename.split(/[\\/]/).pop() ?? "image").replace(/[^A-Za-z0-9._-]/g, "-").slice(-100) || "image";

  try {
    const blob = await put(`blog/${safeName}`, file, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
