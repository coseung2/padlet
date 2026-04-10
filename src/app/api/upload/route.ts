import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
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

    const ext = file.name.split(".").pop() ?? (isImage ? "png" : "mp4");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, type: isImage ? "image" : "video" });
  } catch (e) {
    console.error("[POST /api/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
