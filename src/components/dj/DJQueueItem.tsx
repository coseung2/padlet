import type { CardData } from "../DraggableCard";

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  played: "재생됨",
  rejected: "거부",
};

type Props = {
  card: CardData;
  canControl: boolean;
  isOwnPending: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onApprove: () => void;
  onReject: () => void;
  onMarkPlayed: () => void;
  onDelete: () => void;
};

export function DJQueueItem({
  card,
  canControl,
  isOwnPending,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onApprove,
  onReject,
  onMarkPlayed,
  onDelete,
}: Props) {
  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  const status = card.queueStatus ?? "pending";
  const statusLabel = STATUS_LABEL[status] ?? status;

  return (
    <li
      className={[
        "dj-queue-item",
        `dj-status-${status}`,
        isDragging && "is-dragging",
        isDragOver && "is-drag-over",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={canControl}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {canControl && (
        <span
          className="dj-drag-handle"
          aria-label={`${card.title} 순서 변경`}
        >
          ⋮⋮
        </span>
      )}

      {card.linkImage && (
        <img
          className="dj-thumb"
          src={card.linkImage}
          width={96}
          height={54}
          alt=""
        />
      )}

      <div className="dj-item-info">
        <div className="dj-track-title">{card.title}</div>
        <div className="dj-track-meta">
          {card.linkDesc && <span>{card.linkDesc}</span>}
          {submitter && <span> · {submitter}님</span>}
        </div>
      </div>

      <span className={`dj-status-pill dj-status-pill-${status}`}>
        {statusLabel}
      </span>

      {canControl && (
        <div className="dj-item-actions">
          {status === "pending" && (
            <>
              <button
                type="button"
                className="dj-action-btn"
                onClick={onApprove}
                aria-label="승인"
              >
                승인
              </button>
              <button
                type="button"
                className="dj-action-btn dj-action-reject"
                onClick={onReject}
                aria-label="거부"
              >
                거부
              </button>
            </>
          )}
          {status === "approved" && (
            <button
              type="button"
              className="dj-action-btn"
              onClick={onMarkPlayed}
              aria-label="재생 완료"
            >
              재생
            </button>
          )}
          <button
            type="button"
            className="dj-action-btn dj-action-delete"
            onClick={onDelete}
            aria-label="삭제"
          >
            삭제
          </button>
        </div>
      )}

      {!canControl && isOwnPending && (
        <button
          type="button"
          className="dj-action-btn dj-action-cancel-own"
          onClick={onDelete}
        >
          취소
        </button>
      )}
    </li>
  );
}
