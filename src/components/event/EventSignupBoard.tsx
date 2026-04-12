"use client";

/**
 * Teacher-facing landing for `layout === "event-signup"`.
 *
 * Renders a compact control panel (poster, dates, venue, selections) plus
 * navigation tiles into /edit and /review, and the QR share card. Heavy
 * editing lives in the edit route — this is a dashboard, not a form.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrShareCard } from "./QrShareCard";

type Props = {
  boardId: string;
  slug: string;
  accessMode: string;
  accessToken: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  eventPosterUrl: string | null;
  venue: string | null;
  maxSelections: number | null;
  canEdit: boolean;
};

function formatKo(iso: string | null): string {
  if (!iso) return "미정";
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return "미정";
  }
}

export function EventSignupBoard(props: Props) {
  const { boardId, slug, canEdit } = props;
  const [token, setToken] = useState<string | null>(props.accessToken);
  const [mode, setMode] = useState<string>(props.accessMode);
  const [rotating, setRotating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rotate = useCallback(async () => {
    if (!canEdit) return;
    if (!confirm("이전 QR이 무효화됩니다. 계속할까요?")) return;
    setRotating(true);
    setErr(null);
    try {
      const res = await fetch("/api/event/rotate-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "rotate_failed");
      setToken(j.board?.accessToken ?? null);
      setMode(j.board?.accessMode ?? "public-link");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRotating(false);
    }
  }, [boardId, canEdit]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    if (mode !== "public-link" || !token) return null;
    return `${window.location.origin}/b/${slug}?t=${token}`;
  }, [mode, slug, token]);

  return (
    <section className="event-signup-board" aria-label="행사 신청 보드 대시보드">
      <header className="event-hero">
        {props.eventPosterUrl && (
          <img
            src={props.eventPosterUrl}
            alt="행사 포스터"
            className="event-poster"
          />
        )}
        <dl className="event-meta">
          <div>
            <dt>장소</dt>
            <dd>{props.venue ?? "미정"}</dd>
          </div>
          <div>
            <dt>정원</dt>
            <dd>{props.maxSelections ?? "미정"}</dd>
          </div>
          <div>
            <dt>신청 기간</dt>
            <dd>
              {formatKo(props.applicationStart)} ~ {formatKo(props.applicationEnd)}
            </dd>
          </div>
        </dl>
      </header>

      {canEdit && (
        <nav className="event-nav">
          <a className="event-nav-tile" href={`/board/${boardId}/event/edit`}>
            ⚙ 행사 설정 / 폼 빌더
          </a>
          <a className="event-nav-tile" href={`/board/${boardId}/event/review`}>
            📋 심사 & 신청 리스트
          </a>
          <a className="event-nav-tile" href={`/b/${slug}/result`}>
            🏆 결과 발표 페이지
          </a>
        </nav>
      )}

      {canEdit && (
        <QrShareCard
          boardId={boardId}
          publicUrl={publicUrl}
          mode={mode}
          onRotate={rotate}
          rotating={rotating}
          err={err}
        />
      )}

      {!canEdit && (
        <p className="event-viewer-note">
          이 보드는 행사 신청용입니다. 학생은 공개 링크(QR)로 접근하세요.
        </p>
      )}
    </section>
  );
}
