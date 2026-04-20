import {
  ALLOWED_FILE_MIMES,
  isAllowedFileUpload,
} from "@/lib/file-attachment";

export const ALLOWED_IMAGE = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const ALLOWED_VIDEO = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const MAX_SIZE = 50 * 1024 * 1024;

export type UploadKind = "image" | "video" | "file";

export type UploadPolicy = {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  addRandomSuffix: true;
  tokenPayload: string;
};

export type UploadTokenPayload = {
  kind: UploadKind;
  mimeType: string;
  originalName: string;
};

/**
 * upload-payload-too-large — 클라이언트가 제시한 pathname + clientPayload
 * (MIME)을 화이트리스트 기준으로 검증한 뒤 Blob client-token 생성 옵션을
 * 반환. 함수 본문 한도(4.5MB)를 우회하기 위한 client direct upload 경로의
 * 게이트.
 *
 * 실패 시 에러를 throw — 호출자(onBeforeGenerateToken)는 이를 그대로
 * 상위로 전파해 token 발급을 거부한다.
 */
export function buildUploadPolicy(
  pathname: string,
  clientPayload: string | null,
): UploadPolicy {
  if (!pathname.startsWith("uploads/")) {
    throw new Error("invalid pathname: must start with 'uploads/'");
  }
  const filename = pathname.slice("uploads/".length);
  if (!filename || filename.includes("/")) {
    throw new Error("invalid pathname: filename must not be empty or contain '/'");
  }

  const claimed = parseClientPayload(clientPayload);
  const mime = claimed.mimeType;

  const isImage = (ALLOWED_IMAGE as readonly string[]).includes(mime);
  const isVideo = (ALLOWED_VIDEO as readonly string[]).includes(mime);
  const isFile = !isImage && !isVideo && isAllowedFileUpload(mime, filename);

  if (!isImage && !isVideo && !isFile) {
    throw new Error(
      `지원하지 않는 파일 형식 (${mime || "type 없음"}, 파일=${filename})`,
    );
  }

  const kind: UploadKind = isImage ? "image" : isVideo ? "video" : "file";
  const allowedContentTypes = isImage
    ? [...ALLOWED_IMAGE]
    : isVideo
      ? [...ALLOWED_VIDEO]
      : (ALLOWED_FILE_MIMES[mime] ? [mime] : []);

  const payload: UploadTokenPayload = {
    kind,
    mimeType: mime,
    originalName: filename,
  };

  return {
    allowedContentTypes,
    maximumSizeInBytes: MAX_SIZE,
    addRandomSuffix: true,
    tokenPayload: JSON.stringify(payload),
  };
}

/** clientPayload는 uploadFile()에서 JSON stringify한 { mimeType } shape. */
function parseClientPayload(raw: string | null): { mimeType: string } {
  if (!raw) throw new Error("missing clientPayload");
  try {
    const obj = JSON.parse(raw) as { mimeType?: unknown };
    if (typeof obj.mimeType !== "string" || !obj.mimeType) {
      throw new Error("invalid clientPayload: mimeType required");
    }
    return { mimeType: obj.mimeType };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("invalid clientPayload")) throw e;
    throw new Error("invalid clientPayload: not JSON");
  }
}
