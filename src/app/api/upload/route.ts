import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: Request) {
  try {
    await getCurrentUser(); // auth check

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE.includes(file.type);
    const isVideo = ALLOWED_VIDEO.includes(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? (isImage ? "png" : "mp4");
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : (isImage ? "png" : "mp4");
    const filename = `${Date.now()}-${randomBytes(3).toString("hex")}.${safeExt}`;
    const pathname = `uploads/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Vercel Lambda filesystem is read-only outside /tmp — must use Blob
    // in production. Fall back to public/uploads/ only for local dev
    // without BLOB_READ_WRITE_TOKEN.
    let url: string;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const res = await put(pathname, buffer, {
        access: "public",
        contentType: file.type,
        token: blobToken,
        multipart: true,
        addRandomSuffix: false,
      });
      url = res.url;
    } else {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    return NextResponse.json({ url, type: isImage ? "image" : "video" });
  } catch (e) {
    console.error("[POST /api/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
