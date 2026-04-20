"use client";

// Vibe-arcade board root (Seed 13).
// Layout-level entry rendered from src/app/board/[id]/page.tsx when
// Board.layout === "vibe-arcade". Handles gate-off, catalog list, and
// delegates into Studio / PlayModal / TeacherDashboard sub-components.
//
// Sub-components are scaffolded here as stubs. Full UI lands in follow-up
// commits (phase7, this session only ships the skeleton + data fetching).

import { useCallback, useEffect, useState } from "react";
import { StarRating } from "./vibe-arcade/StarRating";

type ViewerKind = "teacher" | "student" | "none";

export type VibeArcadeBoardProps = {
  boardId: string;
  classroomId: string;
  viewerKind: ViewerKind;
  studentId: string | null;
};

type VibeArcadeConfig = {
  boardId: string;
  enabled: boolean;
  moderationPolicy: string;
  perStudentDailyTokenCap: number | null;
  classroomDailyTokenPool: number;
  crossClassroomVisible: boolean;
  reviewAuthorDisplay: string;
  reviewRatingSystem: string;
  allowRemix: boolean;
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

const TABS = [
  { key: "new", label: "신작" },
  { key: "popular", label: "인기" },
  { key: "to-review", label: "🎯 평가 미작성" },
] as const;

export function VibeArcadeBoard(props: VibeArcadeBoardProps) {
  const [config, setConfig] = useState<VibeArcadeConfig | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("new");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/vibe/config?boardId=${props.boardId}`);
        if (!res.ok) throw new Error(`config ${res.status}`);
        const cfg = (await res.json()) as VibeArcadeConfig;
        if (!cancelled) setConfig(cfg);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.boardId]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/vibe/projects?boardId=${props.boardId}&tab=${tab}&take=30`,
      );
      if (!res.ok) throw new Error(`catalog ${res.status}`);
      const data = (await res.json()) as { items: CatalogItem[] };
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [props.boardId, tab]);

  useEffect(() => {
    if (config?.enabled) void loadCatalog();
  }, [config?.enabled, loadCatalog]);

  if (!config) {
    return <div className="va-loading">불러오는 중…</div>;
  }

  if (!config.enabled) {
    return (
      <section className="va-gate-off" role="status">
        <div className="va-gate-off-inner">
          <span className="va-gate-off-icon" aria-hidden>
            🔒
          </span>
          <h2>학급 아케이드가 아직 열리지 않았어요</h2>
          <p>
            선생님이 보드 설정에서 <strong>학급 아케이드</strong>를 켜면 여기에서 친구들의 작품을
            만들고 플레이할 수 있어요.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="va-root">
      <header className="va-header">
        <div>
          <h1 className="va-title">🎮 학급 아케이드</h1>
          <p className="va-subtitle">반 친구들이 만든 작품을 플레이해 보세요</p>
        </div>
      </header>

      <nav className="va-tabs" role="tablist" aria-label="카탈로그 탭">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`va-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="va-error" role="alert">
          불러오기 실패: {error}
          <button type="button" onClick={() => void loadCatalog()}>
            재시도
          </button>
        </div>
      ) : loading ? (
        <ul className="va-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="va-card va-card-skeleton" aria-hidden />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="va-empty">
          <p>첫 작품을 만들어 보세요</p>
          {props.viewerKind === "student" ? (
            <button type="button" className="va-cta">
              + 새로 만들기
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="va-grid">
          {items.map((item) => (
            <li key={item.id} className="va-card">
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
            </li>
          ))}
        </ul>
      )}

      {props.viewerKind === "student" ? (
        <button type="button" className="va-fab" aria-label="새 작품 만들기">
          +
        </button>
      ) : null}

      {/* TODO(phase7-followup): PlayModal, VibeCodingStudio, TeacherModerationDashboard */}
    </section>
  );
}
