"use client";

import { memo, useState } from "react";
import { extractCanvaDesignId } from "@/lib/canva";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

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
};

// All props are primitives/null, so default shallow equality is safe.
// Memoizing avoids re-rendering attachment previews on every unrelated
// parent state update (drag, selection, modal toggles, etc.).
export const CardAttachments = memo(function CardAttachments({ imageUrl, linkUrl, linkTitle, linkDesc, linkImage, videoUrl }: Props) {
  if (!imageUrl && !linkUrl && !videoUrl) return null;

  const ytId = videoUrl ? getYouTubeId(videoUrl) : null;
  const canvaDesignId = linkUrl ? extractCanvaDesignId(linkUrl) : null;
  // Only render the live Canva iframe when the server's oEmbed resolver
  // actually succeeded. A successful resolve always fills linkImage from
  // oEmbed.thumbnail_url, so the absence of linkImage means the resolver
  // returned null (timeout / private design / endpoint drift) and we
  // should fall back to the generic card-link-preview instead of
  // attempting an iframe that would leak a Canva login prompt or a
  // blank area.
  const canRenderCanvaEmbed = Boolean(canvaDesignId && linkImage);

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
        // key={designId} forces fresh iframeLoaded/iframeFailed state when
        // the card's linkUrl points to a different Canva design, so a
        // stale `failed` flag from the previous design doesn't stick.
        <CanvaEmbed
          key={canvaDesignId}
          designId={canvaDesignId}
          linkUrl={linkUrl}
          linkTitle={linkTitle ?? null}
          linkImage={linkImage ?? null}
          linkDesc={linkDesc ?? null}
        />
      ) : linkUrl && (
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
      )}
    </div>
  );
});

// Canva live-embed branch. Paints the cached thumbnail first so the card
// has something visible immediately, then fades it out once the iframe
// paints. An iframe load error falls through to the existing
// .card-link-preview below (rendered by the parent) — here we render a
// minimal fallback anchor so the card is never empty even if the parent
// branch is skipped.
type CanvaEmbedProps = {
  designId: string;
  linkUrl: string;
  linkTitle: string | null;
  linkImage: string | null;
  linkDesc: string | null;
};

const CanvaEmbed = memo(function CanvaEmbed({
  designId,
  linkUrl,
  linkTitle,
  linkImage,
  linkDesc,
}: CanvaEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
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
            {linkTitle || "Canva design"}
          </span>
          {linkDesc && (
            <span className="card-link-preview-desc">{linkDesc}</span>
          )}
          <span className="card-link-preview-url">🔗 canva.com</span>
        </div>
      </a>
    );
  }

  const embedSrc = `https://www.canva.com/design/${designId}/view?embed&meta`;
  const title = linkTitle || "Canva design";

  return (
    <div className="card-canva-embed" data-loaded={loaded ? "true" : "false"}>
      {linkImage && (
        <OptimizedImage
          src={linkImage}
          alt={`${title} preview`}
          sizes="(max-width: 768px) 100vw, 480px"
        />
      )}
      <iframe
        src={embedSrc}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
});
