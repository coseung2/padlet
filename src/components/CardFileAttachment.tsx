"use client";

import { memo, useMemo, useState } from "react";
import {
  fileMimeToIcon,
  fileMimeToLabel,
  formatBytes,
  isMobileUA,
  LARGE_PDF_WARN_BYTES,
} from "@/lib/file-attachment";

type Props = {
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
};

function FileCard({
  fileUrl,
  fileName,
  fileSize,
  fileMimeType,
  ctaLabel,
}: Props & { ctaLabel: string }) {
  const icon = fileMimeToIcon(fileMimeType ?? "");
  const label = fileMimeToLabel(fileMimeType ?? "");
  const displayName = fileName ?? "파일";
  return (
    <div
      className="card-attach-file"
      aria-label={`첨부된 파일: ${displayName}${fileSize ? `, ${formatBytes(fileSize)}` : ""}`}
    >
      <span className="card-attach-file-icon" aria-hidden>
        {icon}
      </span>
      <div className="card-attach-file-body">
        <span className="card-attach-file-name" title={displayName}>
          {displayName}
        </span>
        <span className="card-attach-file-meta">
          {fileSize ? formatBytes(fileSize) : "—"} · {label}
        </span>
      </div>
      <a
        href={fileUrl}
        download={fileName ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="card-attach-file-download"
        onClick={(e) => e.stopPropagation()}
        aria-label={`${displayName} ${ctaLabel}`}
      >
        📥 {ctaLabel}
      </a>
    </div>
  );
}

export const CardFileAttachment = memo(function CardFileAttachment({
  fileUrl,
  fileName,
  fileSize,
  fileMimeType,
}: Props) {
  const mime = fileMimeType ?? "";
  const isPdf = mime === "application/pdf";

  // UA 감지는 client-only (SSR 동안엔 desktop 가정). typeof window 가드.
  const mobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isMobileUA(window.navigator.userAgent);
  }, []);

  const isLarge = (fileSize ?? 0) >= LARGE_PDF_WARN_BYTES;

  // 큰 PDF는 iframe을 기본 언마운트로 두고 사용자가 "펼쳐서 보기"로 opt-in.
  const [expanded, setExpanded] = useState(false);

  if (!isPdf || mobile) {
    // 비-PDF 전 유형 + 모바일 UA → 파일 카드 (다운로드/열기)
    return (
      <FileCard
        fileUrl={fileUrl}
        fileName={fileName}
        fileSize={fileSize}
        fileMimeType={fileMimeType}
        ctaLabel={mobile && isPdf ? "열기" : "다운로드"}
      />
    );
  }

  if (isLarge && !expanded) {
    return (
      <div className="card-attach-pdf-large">
        <div className="card-attach-pdf-warning" role="status">
          ⚠️ 파일이 커서 로딩이 느릴 수 있어요
          {fileSize ? ` (${formatBytes(fileSize)})` : ""}
        </div>
        <button
          type="button"
          className="card-attach-pdf-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          펼쳐서 보기
        </button>
        <FileCard
          fileUrl={fileUrl}
          fileName={fileName}
          fileSize={fileSize}
          fileMimeType={fileMimeType}
          ctaLabel="다운로드"
        />
      </div>
    );
  }

  // 데스크톱 + PDF(<10MB 또는 사용자가 펼침) → iframe 인라인 뷰어
  return (
    <div className="card-attach-pdf">
      <iframe
        // #view=FitH: 뷰어가 폭에 맞춰 렌더. 브라우저 기본 PDF 뷰어가 해석.
        src={`${fileUrl}#view=FitH`}
        title={`PDF 미리보기: ${fileName ?? "파일"}`}
        loading="lazy"
        // PDF 뷰어 내부 폼/탐색과 카드 클릭 간 충돌 방지.
        onClick={(e) => e.stopPropagation()}
      />
      <div className="card-attach-pdf-footer">
        <span className="card-attach-pdf-name">{fileName ?? "PDF"}</span>
        <a
          href={fileUrl}
          download={fileName ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="card-attach-pdf-download"
          onClick={(e) => e.stopPropagation()}
        >
          📥 다운로드
        </a>
      </div>
    </div>
  );
});
