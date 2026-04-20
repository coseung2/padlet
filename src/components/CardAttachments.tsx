"use client";

import { memo } from "react";
import { extractCanvaDesignId, hasCanvaShareToken } from "@/lib/canva";
import { CanvaEmbedSlot } from "./CanvaEmbedSlot";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { CardFileAttachment } from "./CardFileAttachment";

function getYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/) ??
    null;
  return m?.[1] ?? null;
}

type AttachmentItem = {
  id: string;
  kind: string;
  url: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  order: number;
};

type Props = {
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDesc?: string | null;
  linkImage?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  /** multi-attachment (2026-04-20): 정규화 첨부 배열. 있으면 이 배열이
   *  우선 렌더되고, 비어있을 때만 위의 single-field fallback이 동작. */
  attachments?: AttachmentItem[];
};

// All props are primitives/null, so default shallow equality is safe.
// Memoizing avoids re-rendering attachment previews on every unrelated
// parent state update (drag, selection, modal toggles, etc.).
export const CardAttachments = memo(function CardAttachments({ imageUrl, linkUrl, linkTitle, linkDesc, linkImage, videoUrl, fileUrl, fileName, fileSize, fileMimeType, attachments }: Props) {
  const hasAttachments = (attachments?.length ?? 0) > 0;
  if (!hasAttachments && !imageUrl && !linkUrl && !videoUrl && !fileUrl) return null;

  // 링크는 attachments에 포함되지 않으므로 별개 렌더. multi-attachment
  // 카드에서도 링크는 최대 1개(현 스키마 제약).
  const canvaDesignId = linkUrl ? extractCanvaDesignId(linkUrl) : null;
  const hasShareToken = Boolean(linkUrl && hasCanvaShareToken(linkUrl));
  const canRenderCanvaEmbed = Boolean(canvaDesignId && (linkImage || hasShareToken));

  // multi-attachment: 링크·canva·youtube는 기존 로직 그대로, 나머지
  // 이미지/동영상/파일은 attachments 배열을 우선 렌더.
  const sorted = hasAttachments
    ? [...(attachments ?? [])].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="card-attachments">
      {hasAttachments
        ? sorted.map((a) => {
            if (a.kind === "image") {
              return (
                <div key={a.id} className="card-attach-image optimized-img-wrap">
                  <OptimizedImage
                    src={a.url}
                    alt={a.fileName ?? ""}
                    sizes="(max-width: 768px) 100vw, 480px"
                  />
                </div>
              );
            }
            if (a.kind === "video") {
              const yt = getYouTubeId(a.url);
              if (yt) {
                return (
                  <div key={a.id} className="card-attach-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${yt}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube"
                    />
                  </div>
                );
              }
              return (
                <div key={a.id} className="card-attach-video">
                  <video src={a.url} controls preload="metadata" />
                </div>
              );
            }
            // file
            return (
              <CardFileAttachment
                key={a.id}
                fileUrl={a.url}
                fileName={a.fileName}
                fileSize={a.fileSize}
                fileMimeType={a.mimeType}
              />
            );
          })
        : (
          <>
            {imageUrl && (
              <div className="card-attach-image optimized-img-wrap">
                <OptimizedImage
                  src={imageUrl}
                  alt=""
                  sizes="(max-width: 768px) 100vw, 480px"
                />
              </div>
            )}
            {videoUrl && (() => {
              const yt = getYouTubeId(videoUrl);
              return yt ? (
                <div className="card-attach-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${yt}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube"
                  />
                </div>
              ) : (
                <div className="card-attach-video">
                  <video src={videoUrl} controls preload="metadata" />
                </div>
              );
            })()}
            {fileUrl && (
              <CardFileAttachment
                fileUrl={fileUrl}
                fileName={fileName ?? null}
                fileSize={fileSize ?? null}
                fileMimeType={fileMimeType ?? null}
              />
            )}
          </>
        )}
      {linkUrl && canRenderCanvaEmbed && canvaDesignId ? (
        // Delegated to CanvaEmbedSlot (T0-② virtualization): thumbnail by
        // default, iframe mounts only on activation + in viewport, with a
        // global LRU-3 budget. key={designId} forces full remount when the
        // card's design changes so the slot's internal load state resets.
        <CanvaEmbedSlot
          key={canvaDesignId}
          designId={canvaDesignId}
          linkUrl={linkUrl}
          linkTitle={linkTitle ?? null}
          linkImage={linkImage ?? null}
          linkDesc={linkDesc ?? null}
        />
      ) : linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`card-link-preview ${linkImage ? "has-image" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {linkImage && (
            <div className="card-link-preview-image optimized-img-wrap">
              <OptimizedImage
                src={linkImage}
                alt=""
                sizes="(max-width: 768px) 40vw, 120px"
              />
            </div>
          )}
          <div className="card-link-preview-body">
            <span className="card-link-preview-title">
              {linkTitle || (() => {
                try { return new URL(linkUrl).hostname.replace(/^www\./, ""); }
                catch { return linkUrl; }
              })()}
            </span>
            {linkDesc && (
              <span className="card-link-preview-desc">{linkDesc}</span>
            )}
            <span className="card-link-preview-url">
              🔗 {(() => {
                try { return new URL(linkUrl).hostname.replace(/^www\./, ""); }
                catch { return linkUrl; }
              })()}
            </span>
          </div>
        </a>
      ) : null}
    </div>
  );
});

// NOTE: Legacy inline CanvaEmbed has been replaced by the virtualized
// CanvaEmbedSlot in ./CanvaEmbedSlot.tsx (T0-② tablet-crash mitigation).
// OptimizedImage (T0-④) is used for thumbnails and link previews above.
