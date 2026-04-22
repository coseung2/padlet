"use client";

// Vibe gallery board (layout="vibe-gallery", 2026-04-21).
// 승인된 VibeProject만 전시하는 curation 보드. vibe-arcade (studio) 보드와 분리되어
// 교사가 "전시용" 카드 그리드를 별도 페이지로 운영 가능.
//
// Phase 4: 실제 카드 그리드 + PlayModal wiring.

import { useEffect, useState } from "react";
import { StarRating } from "./vibe-arcade/StarRating";
import { VibePlayModal } from "./vibe-arcade/VibePlayModal";

type ViewerKind = "teacher" | "student" | "none";

export type VibeGalleryBoardProps = {
  boardId: string;
  classroomId: string;
  viewerKind: ViewerKind;
};

type CatalogItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  tags: string;
  playCount: number;
  reviewCount: number;
  ratingAvg: number | null;
  authorStudentId: string;
  createdAt: string;
};

export function VibeGalleryBoard(props: VibeGalleryBoardProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ id: string; title: string } | null>(null);

  const canPlay = props.viewerKind === "student";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // classroom 스코프로 승인 완료된 프로젝트만 페치. 보드가 달라도
        // 같은 classroomId를 공유하면 gallery에서 볼 수 있다.
        const res = await fetch(
          `/api/vibe/gallery?classroomId=${encodeURIComponent(props.classroomId)}&take=60`,
        );
        if (!res.ok) throw new Error(`gallery ${res.status}`);
        const data = (await res.json()) as { items: CatalogItem[] };
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.classroomId]);

  return (
    <section className="va-root vg-root">
      <header className="va-header">
        <div>
          <h1 className="va-title">🖼️ 코딩 갤러리</h1>
          <p className="va-subtitle">학급에서 승인된 바이브 프로젝트를 모아 봐요</p>
        </div>
      </header>

      {error ? (
        <div className="va-error" role="alert">
          불러오기 실패: {error}
        </div>
      ) : loading ? (
        <ul className="va-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="va-card va-card-skeleton" aria-hidden />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="va-empty">
          <p>아직 전시된 작품이 없어요.</p>
          <p className="vg-empty-hint">
            학생이 <strong>코딩 교실</strong>에서 만들어 선생님이 승인하면 여기에 올라옵니다.
          </p>
        </div>
      ) : (
        <ul className="va-grid">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="va-card vg-card-btn"
                onClick={canPlay ? () => setPlaying({ id: item.id, title: item.title }) : undefined}
                disabled={!canPlay}
                aria-label={`${item.title}${canPlay ? " 재생" : ""}`}
              >
                <div className="va-card-thumb">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={`${item.title} 썸네일`}
                      loading="lazy"
                      width={160}
                      height={120}
                    />
                  ) : (
                    <div className="va-card-thumb-fallback" aria-hidden />
                  )}
                </div>
                <div className="va-card-meta">
                  <h3 className="va-card-title">{item.title}</h3>
                  <div className="va-card-stats">
                    <StarRating value={item.ratingAvg ?? 0} size="sm" readonly />
                    <span className="va-card-plays">▶ {item.playCount}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {playing && (
        <VibePlayModal
          projectId={playing.id}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </section>
  );
}
