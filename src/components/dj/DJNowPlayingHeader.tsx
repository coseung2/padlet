import type { CardData } from "../DraggableCard";

type Props = {
  card: CardData;
  canControl: boolean;
  onNext: () => void;
};

export function DJNowPlayingHeader({ card, canControl, onNext }: Props) {
  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  return (
    <section
      className="dj-nowplaying"
      role="status"
      aria-live="polite"
      aria-label={`지금 재생: ${card.title}`}
    >
      <div className="dj-nowplaying-label">▶ NOW PLAYING</div>
      <div className="dj-nowplaying-body">
        {card.linkImage && (
          <img
            className="dj-thumb dj-thumb-lg"
            src={card.linkImage}
            width={240}
            height={135}
            alt=""
          />
        )}
        <div className="dj-nowplaying-info">
          <div className="dj-track-title">{card.title}</div>
          <div className="dj-track-meta">
            {card.linkDesc && <span>{card.linkDesc}</span>}
            {submitter && <span> · {submitter}님 신청</span>}
          </div>
        </div>
        {canControl && (
          <button
            type="button"
            className="dj-next-btn"
            onClick={onNext}
            aria-label="다음 곡으로"
          >
            ⏭
          </button>
        )}
      </div>
    </section>
  );
}
