"use client";

import { useEffect, useState } from "react";
import type { ObservationDTO, StageDTO } from "@/types/plant";

interface Props {
  open: boolean;
  stage: StageDTO | null;
  observations: ObservationDTO[]; // already filtered for this stage
  canEdit: boolean;
  isCurrentStage: boolean;
  hasPhotosOnCurrent: boolean;
  onClose: () => void;
  onAddObservation: () => void;
  onEditObservation: (obs: ObservationDTO) => void;
  onDeleteObservation: (obs: ObservationDTO) => Promise<void>;
  onAdvanceStage: () => void;
  onOpenLightbox: (url: string) => void;
}

export function StageDetailSheet({
  open,
  stage,
  observations,
  canEdit,
  isCurrentStage,
  hasPhotosOnCurrent,
  onClose,
  onAddObservation,
  onEditObservation,
  onDeleteObservation,
  onAdvanceStage,
  onOpenLightbox,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !stage) return null;

  async function handleDelete(obs: ObservationDTO) {
    if (!confirm("이 기록을 삭제할까요?")) return;
    setDeletingId(obs.id);
    try {
      await onDeleteObservation(obs);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        className="plant-sheet-backdrop"
        aria-label="닫기"
        onClick={onClose}
        style={{ border: 0, cursor: "default" }}
      />
      <aside className="plant-sheet" role="dialog" aria-labelledby="plant-sheet-title">
        <div className="plant-sheet-head">
          <div className="plant-sheet-title" id="plant-sheet-title">
            <span aria-hidden style={{ marginRight: 6 }}>{stage.icon}</span>
            {stage.order}단계 · {stage.nameKo}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="시트 닫기"
            style={{ background: "none", border: 0, fontSize: 18, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {stage.description && (
          <p style={{ color: "var(--color-text-muted)", marginTop: 0 }}>{stage.description}</p>
        )}

        {stage.observationPoints.length > 0 && (
          <div className="plant-sheet-points">
            <h4>관찰 포인트</h4>
            <ul>
              {stage.observationPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="plant-obs-list" aria-label="관찰 기록 목록">
          {observations.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", margin: "14px 0" }}>
              아직 기록이 없어요.
            </p>
          ) : (
            observations.map((o) => (
              <article key={o.id} className="plant-obs-card">
                <div className="plant-obs-meta">
                  <span>{new Date(o.observedAt).toLocaleString("ko-KR")}</span>
                  <span>{o.images.length}장</span>
                </div>
                {o.images.length > 0 && (
                  <div className="plant-obs-imgs">
                    {o.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.thumbnailUrl ?? img.url}
                        alt="관찰 사진"
                        onClick={() => onOpenLightbox(img.url)}
                      />
                    ))}
                  </div>
                )}
                {o.memo && <p className="plant-obs-memo">{o.memo}</p>}
                {o.noPhotoReason && (
                  <p className="plant-obs-reason">사진 없음: {o.noPhotoReason}</p>
                )}
                {canEdit && (
                  <div className="plant-obs-actions">
                    <button type="button" onClick={() => onEditObservation(o)}>수정</button>
                    <button
                      type="button"
                      onClick={() => handleDelete(o)}
                      disabled={deletingId === o.id}
                    >
                      {deletingId === o.id ? "삭제 중…" : "삭제"}
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {canEdit && (
          <div className="plant-sheet-actions">
            <button
              type="button"
              className="primary"
              onClick={onAddObservation}
              disabled={!isCurrentStage && observations.length === 0 && !canEdit}
            >
              관찰 추가
            </button>
            {isCurrentStage && (
              <button
                type="button"
                onClick={onAdvanceStage}
                title={hasPhotosOnCurrent ? "다음 단계로" : "사진이 없어요 — 사유를 적게 됩니다"}
              >
                다음 단계로 →
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
