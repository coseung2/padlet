"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignmentSlotDTO } from "@/types/assignment";
import { ReturnReasonBanner } from "./ReturnReasonBanner";

type Props = {
  slot: AssignmentSlotDTO | null;
  guideText: string;
  canSubmit: boolean;
};

export function AssignmentStudentView({ slot, guideText, canSubmit }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(slot?.card.content ?? "");
  const [linkUrl, setLinkUrl] = useState(slot?.card.linkUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slot) {
    return (
      <div className="assign-student assign-student--empty">
        <p>배정된 과제가 없습니다.</p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!slot) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/assignment-slots/${slot.id}/submission`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: content || undefined,
          linkUrl: linkUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "submission_failed");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  const isReturned = slot.submissionStatus === "returned";
  const isSubmitted =
    slot.submissionStatus === "submitted" ||
    slot.submissionStatus === "viewed" ||
    slot.submissionStatus === "reviewed";

  return (
    <div className="assign-student">
      {isReturned && slot.returnReason && (
        <ReturnReasonBanner reason={slot.returnReason} />
      )}
      {guideText && (
        <section className="assign-guide" aria-labelledby="assign-guide-label">
          <div id="assign-guide-label" className="assign-guide__label">
            안내
          </div>
          <div className="assign-guide__body">{guideText}</div>
        </section>
      )}

      <section className="assign-submit-card">
        <label className="assign-submit-card__label" htmlFor="assign-content">
          제출 내용
        </label>
        <textarea
          id="assign-content"
          className="assign-submit-card__textarea"
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!canSubmit || busy}
          placeholder="제출할 내용을 입력하세요."
        />
        <label className="assign-submit-card__label" htmlFor="assign-link">
          링크(선택)
        </label>
        <input
          id="assign-link"
          type="url"
          className="assign-submit-card__input"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          disabled={!canSubmit || busy}
          placeholder="https://..."
        />
        {error && <div className="assign-submit-card__error">제출 실패: {error}</div>}
        <div className="assign-submit-card__actions">
          <button
            type="button"
            className="assign-btn assign-btn--primary"
            disabled={!canSubmit || busy}
            onClick={handleSubmit}
            aria-disabled={!canSubmit}
          >
            {isSubmitted ? "다시 제출하기" : isReturned ? "재제출하기" : "제출하기"}
          </button>
          {!canSubmit && (
            <span className="assign-submit-card__note">
              {slot.gradingStatus === "graded" || slot.gradingStatus === "released"
                ? "채점이 완료되어 수정할 수 없습니다."
                : "마감이 지나 제출할 수 없습니다."}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
