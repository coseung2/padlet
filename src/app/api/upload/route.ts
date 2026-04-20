import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_FILE_MIMES, isAllowedFileUpload } from "@/lib/file-attachment";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * card-file-attachment — 매직바이트 검증.
 * file.type(multipart 메타)은 클라이언트가 조작 가능하므로, 실제 바이트의
 * 파일 시그니처로 MIME 스푸핑(악성 스크립트를 application/pdf로 위장)을 차단.
 * PDF ("%PDF-")와 ZIP("PK\x03\x04") 계열(DOCX/XLSX/PPTX/HWPX/ZIP)만 엄격
 * 검사. TXT는 매직 없음 → 허용 (실행 위험 최소). HWP(구버전)는 시그니처가
 * 다양해 스킵하되 확장자+MIME 화이트리스트로 억제.
 */
function verifyFileMagic(mime: string, filename: string, head: Buffer): boolean {
  const lower = filename.toLowerCase();
  // PDF — %PDF-
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    return head.length >= 5 && head.toString("ascii", 0, 5) === "%PDF-";
  }
  // ZIP 계열 (OOXML + 순수 ZIP + HWPX): PK\x03\x04
  const isZipFamily =
    mime === "application/zip" ||
    mime === "application/x-zip-compressed" ||
    mime.includes("openxmlformats-officedocument") ||
    mime === "application/vnd.hancom.hwpx" ||
    lower.endsWith(".zip") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".hwpx");
  if (isZipFamily) {
    return (
      head.length >= 4 &&
      head[0] === 0x50 && head[1] === 0x4b &&
      head[2] === 0x03 && head[3] === 0x04
    );
  }
  // HWP(구버전)·TXT — 시그니처 검증 생략. MIME+확장자+크기 제한으로 억제.
  return true;
}

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
    // card-file-attachment: 문서 7종은 MIME + 확장자 AND 검증 (스푸핑 방어 R1)
    const isFile = !isImage && !isVideo && isAllowedFileUpload(file.type, file.name);

    if (!isImage && !isVideo && !isFile) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const fallbackExt = isImage ? "png" : isVideo ? "mp4" : "bin";
    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? fallbackExt;
    // 확장자 화이트리스트: 업로드된 파일이 실제로 허용 MIME에 매핑된 확장자만 허용.
    const allowedExts = isFile
      ? ALLOWED_FILE_MIMES[file.type] ?? []
      : null;
    const safeExt = /^[a-z0-9]+$/.test(rawExt)
      ? allowedExts
        ? allowedExts.includes(rawExt) ? rawExt : (allowedExts[0] ?? fallbackExt)
        : rawExt
      : fallbackExt;
    const filename = `${Date.now()}-${randomBytes(3).toString("hex")}.${safeExt}`;
    const pathname = `uploads/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // card-file-attachment: 파일 경로만 매직바이트 검사. 이미지/비디오는
    // 기존 경로라 회귀 위험을 피함 (기존 정책 유지).
    if (isFile && !verifyFileMagic(file.type, file.name, buffer.subarray(0, 16))) {
      return NextResponse.json(
        { error: "File contents do not match the declared type" },
        { status: 400 }
      );
    }

    // card-file-attachment: 파일은 항상 attachment로 서빙 (PDF 포함).
    // 인라인 뷰어 경로는 사용자 피드백(2026-04-20)으로 제거됨 —
    // "미리보기 어차피 안띄울거니까 파일명이랑 다운로드 버튼만". Blob에
    // 저장 시부터 강제 다운로드 지시를 심어 두면 새 탭 오픈 시 활성
    // 콘텐츠 실행 위험도 자동으로 억제됨 (보안 이득 겸함).
    // 파일명은 RFC 6266 per-encode (ASCII fallback + UTF-8 확장).
    const asciiName = file.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    const utf8Name = encodeURIComponent(file.name);
    const contentDisposition = isFile
      ? `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`
      : undefined;

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
        ...(contentDisposition ? { contentDisposition } : {}),
      });
      url = res.url;
    } else {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    const type: "image" | "video" | "file" = isImage ? "image" : isVideo ? "video" : "file";
    return NextResponse.json({
      url,
      type,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (e) {
    console.error("[POST /api/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
