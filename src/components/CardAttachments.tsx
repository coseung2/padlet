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
};

// All props are primitives/null, so default shallow equality is safe.
// Memoizing avoids re-rendering attachment previews on every unrelated
// parent state update (drag, selection, modal toggles, etc.).
export const CardAttachments = memo(function CardAttachments({ imageUrl, linkUrl, linkTitle, linkDesc, linkImage, videoUrl, fileUrl, fileName, fileSize, fileMimeType }: Props) {
  if (!imageUrl && !linkUrl && !videoUrl && !fileUrl) return null;

  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;
  const canvaDesignId = linkUrl ? extractCanvaDesignId(linkUrl) : null;
  // Open the live-iframe gate when EITHER:
  //   (a) oEmbed succeeded → linkImage is the Canva thumbnail, the URL
  //       was pre-validated as public, safe to embed.
  //   (b) the pasted URL carries a share token → the design is publicly
  //       viewable (Canva's own "링크가 있는 누구나" flag), so the
  //       iframe will render even though our anon oEmbed call got 401.
  //       We lose the pre-loaded thumbnail but CanvaEmbedSlot shows a
  //       neutral placeholder and the iframe itself fills in on load.
  //
  // Path (a) used to be the only trigger. The consequence was that
  // student-pasted public links showed a plain link preview with no
  // live iframe (reported 2026-04-15) — path (b) fixes that without
  // regressing the oEmbed-pre-validated path.
  const hasShareToken = Boolean(linkUrl && hasCanvaShareToken(linkUrl));
  const canRenderCanvaEmbed = Boolean(canvaDesignId && (linkImage || hasShareToken));

  return (
    <div className="card-attachments">
      {imageUrl && (
        <div className="card-attach-image optimized-img-wrap">
          <OptimizedImage
            src={imageUrl}
            alt=""
            sizes="(max-width: 768px) 100vw, 480px"
          />
        </div>
      )}
      {videoUrl && ytId && (
        <div className="card-attach-video">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube"
          />
        </div>
      )}
      {videoUrl && !ytId && (
        <div className="card-attach-video">
          <video src={videoUrl} controls preload="metadata" />
        </div>
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
      {fileUrl && (
        <CardFileAttachment
          fileUrl={fileUrl}
          fileName={fileName ?? null}
          fileSize={fileSize ?? null}
          fileMimeType={fileMimeType ?? null}
        />
      )}
    </div>
  );
});

// NOTE: Legacy inline CanvaEmbed has been replaced by the virtualized
// CanvaEmbedSlot in ./CanvaEmbedSlot.tsx (T0-② tablet-crash mitigation).
// OptimizedImage (T0-④) is used for thumbnails and link previews above.
