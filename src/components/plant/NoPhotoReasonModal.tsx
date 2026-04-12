"use client";

import { useEffect, useState } from "react";

const PRESETS = [
  { value: "weather", label: "날씨가 안 좋았어요" },
  { value: "forgot", label: "관찰을 깜빡했어요" },
  { value: "no_class", label: "수업이 없었어요" },
  { value: "other", label: "기타" },
];

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
}

export function NoPhotoReasonModal({ open, onCancel, onSubmit, busy, error }: Props) {
  const [pick, setPick] = useState<string>("");
  const [other, setOther] = useState("");

  useEffect(() => {
    if (!open) {
      setPick("");
      setOther("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const reasonText = pick === "other" ? other.trim() : PRESETS.find((p) => p.value === pick)?.label ?? "";
  const canSubmit = reasonText.length > 0 && !busy;

  return (
    <div className="plant-modal-backdrop" role="dialog" aria-modal="true" aria-label="사진 없음 사유">
      <div className="plant-modal">
        <h3>사진이 없네요</h3>
        <p style={{ color: "var(--color-text-muted)", marginTop: 0 }}>
          다음 단계로 가기 전에, 이번 단계에 사진이 없는 이유를 알려주세요.
        </p>
        <div className="plant-reason-list">
          {PRESETS.map((p) => (
            <label key={p.value}>
              <input
                type="radio"
                name="no-photo-reason"
                value={p.value}
                checked={pick === p.value}
                onChange={() => setPick(p.value)}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
        {pick === "other" && (
          <textarea
            className="plant-reason-other"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="사유를 직접 적어주세요 (200자 이내)"
            maxLength={200}
          />
        )}
        {error && <p className="plant-error">{error}</p>}
        <div className="plant-modal-actions">
          <button type="button" onClick={onCancel} disabled={busy}>취소</button>
          <button
            type="button"
            className="primary"
            onClick={() => canSubmit && onSubmit(reasonText)}
            disabled={!canSubmit}
          >
            {busy ? "저장 중…" : "계속"}
          </button>
        </div>
      </div>
    </div>
  );
}
