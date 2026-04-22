"use client";

import { useEffect, useRef } from "react";
import type { CardData } from "../DraggableCard";
import { useDJPlayer } from "./DJPlayerProvider";

type Props = {
  card: CardData;
  canControl: boolean;
  onNext: () => void | Promise<void>;
};

function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m2) return m2[1];
  const m3 = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (m3) return m3[1];
  return null;
}

/**
 * NOW PLAYING 카드.
 * - `hostRef` 가 달린 썸네일 자리를 provider 에 host 로 등록 → 재생 중이면
 *   iframe 이 그 rect 위에 올라앉음 (프로바이더는 iframe 을 re-parent 하지
 *   않고 fixed position 으로 덮음). 페이지 이탈 시 등록 해제 → PiP 로 전환.
 * - 썸네일 `<img>` 는 iframe 이 덮는 영역과 동일 — iframe 이 불투명해서
 *   시각적으로 숨겨지고, 재생 중이 아닐 땐 썸네일이 자연스럽게 보임.
 */
export function DJNowPlayingHeader({ card, canControl, onNext }: Props) {
  const {
    activeCard,
    playing,
    play,
    toggle,
    registerHost,
    setAdvanceHandler,
    openExternalPip,
    pipExternalOpen,
    pipExternalSupported,
  } = useDJPlayer();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  const videoId = extractVideoId(card.videoUrl ?? card.linkUrl);
  const isActive = activeCard?.id === card.id;

  // DJ 보드가 마운트된 동안 썸네일 자리를 host 로 등록. 언마운트 시 해제.
  useEffect(() => {
    registerHost(hostRef.current);
    return () => {
      registerHost(null);
    };
  }, [registerHost]);

  // 다음 곡 advance 핸들러 provider 에 위임 — 자동 advance + PiP next 버튼.
  useEffect(() => {
    setAdvanceHandler(() => onNext());
    return () => {
      setAdvanceHandler(null);
    };
  }, [onNext, setAdvanceHandler]);

  // NOW PLAYING 변경 시 자동 로드 (auto-advance 이후).
  useEffect(() => {
    if (!activeCard) return;
    if (activeCard.id === card.id) return;
    if (!videoId) return;
    play({
      id: card.id,
      title: card.title,
      linkImage: card.linkImage ?? null,
      videoId,
    });
  }, [card.id, card.title, card.linkImage, videoId, activeCard, play]);

  function handlePlayToggle() {
    if (!videoId) return;
    if (isActive) {
      toggle();
    } else {
      play({
        id: card.id,
        title: card.title,
        linkImage: card.linkImage ?? null,
        videoId,
      });
    }
  }

  return (
    <section
      className="dj-nowplaying"
      role="status"
      aria-live="polite"
      aria-label={`지금 재생: ${card.title}`}
    >
      <div className="dj-nowplaying-label">▶ NOW PLAYING</div>
      <div className="dj-nowplaying-body">
        {/* host 자리 — iframe 이 fixed position 으로 이 rect 위에 덮임.
            재생 중이 아닐 때는 썸네일 이미지가 그대로 보이고, 재생 시작
            하면 iframe 이 같은 위치에 올라앉음. */}
        <div ref={hostRef} className="dj-thumb-lg dj-nowplaying-host">
          {card.linkImage ? (
            <img
              className="dj-nowplaying-host-img"
              src={card.linkImage}
              width={240}
              height={135}
              alt=""
            />
          ) : (
            <div className="dj-nowplaying-host-fallback" aria-hidden="true">
              ♪
            </div>
          )}
        </div>
        <div className="dj-nowplaying-info">
          <div className="dj-track-title">{card.title}</div>
          <div className="dj-track-meta">
            {card.linkDesc && <span>{card.linkDesc}</span>}
            {submitter && <span> · {submitter}님 신청</span>}
          </div>
          <div className="dj-nowplaying-actions">
            {videoId && (
              <button
                type="button"
                className="dj-play-btn"
                onClick={handlePlayToggle}
                aria-label={isActive && playing ? "일시정지" : "재생"}
                aria-pressed={isActive && playing}
              >
                {isActive && playing ? "❚❚ 일시정지" : "▶ 재생"}
              </button>
            )}
            {canControl && (
              <button
                type="button"
                className="dj-next-btn"
                onClick={() => onNext()}
                aria-label="다음 곡으로"
              >
                ⏭ 다음
              </button>
            )}
            {isActive && playing && pipExternalSupported && !pipExternalOpen && (
              <button
                type="button"
                className="dj-next-btn"
                onClick={() => {
                  void openExternalPip();
                }}
                aria-label="외부 창으로 빼기"
                title="브라우저를 최소화해도 계속 재생됩니다"
              >
                📺 외부 창
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
