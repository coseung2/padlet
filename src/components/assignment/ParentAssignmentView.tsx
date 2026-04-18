import type { AssignmentSlotDTO } from "@/types/assignment";
import { ReturnReasonBanner } from "./ReturnReasonBanner";

const STATUS_LABEL: Record<string, string> = {
  assigned: "미제출",
  submitted: "제출",
  viewed: "확인중",
  returned: "반려",
  reviewed: "확인됨",
  orphaned: "삭제됨",
};

type Props = {
  slot: AssignmentSlotDTO;
  boardTitle: string;
  guideText: string;
};

export function ParentAssignmentView({ slot, boardTitle, guideText }: Props) {
  const label = STATUS_LABEL[slot.submissionStatus] ?? slot.submissionStatus;
  const thumb = slot.card.thumbUrl ?? slot.card.imageUrl;

  return (
    <div className="parent-assign">
      <header className="parent-assign__header">
        <h1 className="parent-assign__title">{boardTitle}</h1>
        <span className={`assign-badge assign-badge--${slot.submissionStatus}`}>{label}</span>
      </header>
      {slot.submissionStatus === "returned" && slot.returnReason && (
        <ReturnReasonBanner reason={slot.returnReason} />
      )}
      {guideText && (
        <section className="assign-guide">
          <div className="assign-guide__label">안내</div>
          <div className="assign-guide__body">{guideText}</div>
        </section>
      )}
      <section className="parent-assign__content">
        {thumb && (
          <img src={thumb} alt="" className="parent-assign__image" loading="lazy" />
        )}
        {slot.card.content && <p className="parent-assign__text">{slot.card.content}</p>}
        {slot.card.linkUrl && (
          <a
            href={slot.card.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="parent-assign__link"
          >
            🔗 {slot.card.linkUrl}
          </a>
        )}
        {!thumb && !slot.card.content && !slot.card.linkUrl && (
          <p className="parent-assign__empty">아직 제출된 내용이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
