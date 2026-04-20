"use client";

import { upload } from "@vercel/blob/client";
import { normalizeUploadMime, mimeFromExtension } from "./file-attachment";

export type UploadedFile = {
  url: string;
  type: "image" | "video" | "file";
  name: string;
  size: number;
  mimeType: string;
};

/**
 * upload-payload-too-large — 클라이언트 직접 업로드.
 * @vercel/blob/client `upload()`로 토큰을 받아 브라우저가 Blob 스토리지에
 * 직접 PUT. 함수 본문 4.5MB 한도(FUNCTION_PAYLOAD_TOO_LARGE)를 우회.
 *
 * 반환 shape은 레거시 `/api/upload` multipart 응답과 동일 — UI 호출부
 * 수정 최소화.
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const mimeType = normalizeUploadMime(file.type ?? "", file.name) ||
    mimeFromExtension(file.name) ||
    "application/octet-stream";

  // 파일명 safe-ascii 버킷화 + 타임스탬프. addRandomSuffix: true 가
  // 서버 정책으로 걸려 있어 충돌 방지는 Blob이 담당.
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const pathname = `uploads/${Date.now()}-${safeName}`;

  const res = await upload(pathname, file, {
    access: "public",
    contentType: mimeType,
    handleUploadUrl: "/api/upload",
    multipart: true,
    // 서버 onBeforeGenerateToken 에서 MIME/확장자 화이트리스트 검증에 사용.
    clientPayload: JSON.stringify({ mimeType }),
  });

  const kind: UploadedFile["type"] = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("video/")
      ? "video"
      : "file";

  // 파일 계열은 downloadUrl(쿼리 `?download=1`)을 저장 — 브라우저가 새 탭에서
  // 인라인 렌더하지 않고 강제 다운로드하도록. PDF/HWP/DOCX 등 활성 콘텐츠
  // 실행 위험 억제. 이미지/비디오는 기존대로 url(인라인 렌더 가능).
  return {
    url: kind === "file" ? res.downloadUrl : res.url,
    type: kind,
    name: file.name,
    size: file.size,
    mimeType,
  };
}
