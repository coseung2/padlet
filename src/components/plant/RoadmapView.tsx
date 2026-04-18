"use client";

import { useCallback, useMemo, useState } from "react";
import type { ObservationDTO, StageDTO, StudentPlantDTO } from "@/types/plant";
import { ObservationEditor } from "./ObservationEditor";
import { NoPhotoReasonModal } from "./NoPhotoReasonModal";
import { OptimizedImage } from "../ui/OptimizedImage";

interface Props {
  plant: StudentPlantDTO;
  canEdit: boolean;
  /**
   * When true, "관찰 추가" CTA is shown on every stage (teacher drill-down mode).
   * Defaults to false — student mode only composes on the current stage.
   */
  editAnyStage?: boolean;
  onPlantUpdated: (next: StudentPlantDTO) => void;
}

export function RoadmapView({
  plant,
  canEdit,
  editAnyStage = false,
  onPlantUpdated,
}: Props) {
  const [editorStageId, setEditorStageId] = useState<string | null>(null);
  const [editingObs, setEditingObs] = useState<ObservationDTO | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [busyAdvance, setBusyAdvance] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [savingNickname, setSavingNickname] = useState(false);

  const stages = plant.species.stages;
  const currentStage = stages.find((s) => s.id === plant.currentStageId) ?? stages[0];
  const currentOrder = currentStage?.order ?? 0;

  const observationsByStage = useMemo(() => {
    const map = new Map<string, ObservationDTO[]>();
    for (const o of plant.observations) {
      const arr = map.get(o.stageId) ?? [];
      arr.push(o);
      map.set(o.stageId, arr);
    }
    return map;
  }, [plant.observations]);

  const photosOnCurrentStage = useMemo(() => {
    const obs = observationsByStage.get(currentStage?.id ?? "") ?? [];
    return obs.reduce((acc, o) => acc + o.images.length, 0);
  }, [observationsByStage, currentStage]);

  const stageState = useCallback(
    (order: number): "visited" | "active" | "upcoming" => {
      if (order < currentOrder) return "visited";
      if (order === currentOrder) return "active";
      return "upcoming";
    },
    [currentOrder]
  );

  async function refreshPlant() {
    const res = await fetch(`/api/student-plants/${plant.id}`);
    if (!res.ok) return;
    const j = await res.json();
    if (j?.studentPlant) onPlantUpdated(j.studentPlant as StudentPlantDTO);
  }

  async function handleCreateObservation(payload: { memo: string; images: { url: string }[] }) {
    if (!editorStageId) return;
    const res = await fetch(`/api/student-plants/${plant.id}/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: editorStageId,
        memo: payload.memo,
        images: payload.images,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? "저장 실패");
    }
    await refreshPlant();
    setEditorStageId(null);
    setEditingObs(null);
  }

  async function handlePatchObservation(obsId: string, payload: { memo: string; images: { url: string }[] }) {
    const res = await fetch(`/api/student-plants/${plant.id}/observations/${obsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? "수정 실패");
    }
    await refreshPlant();
    setEditorStageId(null);
    setEditingObs(null);
  }

  async function handleDeleteObservation(obs: ObservationDTO) {
    if (!confirm("이 기록을 삭제할까요?")) return;
    const res = await fetch(`/api/student-plants/${plant.id}/observations/${obs.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error ?? "삭제 실패");
      return;
    }
    await refreshPlant();
  }

  async function handleAdvanceRequest() {
    setBusyAdvance(true);
    try {
      const res = await fetch(`/api/student-plants/${plant.id}/advance-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await refreshPlant();
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (j?.error === "require_reason") {
        setReasonError(null);
        setReasonOpen(true);
        return;
      }
      alert(j?.message ?? j?.error ?? "다음 단계 이동 실패");
    } finally {
      setBusyAdvance(false);
    }
  }

  async function handleReasonSubmit(reason: string) {
    setBusyAdvance(true);
    setReasonError(null);
    try {
      const res = await fetch(`/api/student-plants/${plant.id}/advance-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noPhotoReason: reason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setReasonError(j?.message ?? j?.error ?? "사유 저장 실패");
        return;
      }
      await refreshPlant();
      setReasonOpen(false);
    } finally {
      setBusyAdvance(false);
    }
  }

  async function handleNicknameSave() {
    if (nicknameDraft == null) return;
    const trimmed = nicknameDraft.trim();
    if (!trimmed || trimmed === plant.nickname) {
      setNicknameDraft(null);
      return;
    }
    setSavingNickname(true);
    try {
      const res = await fetch(`/api/student-plants/${plant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "별명 저장 실패");
        return;
      }
      const j = await res.json();
      if (j?.studentPlant) onPlantUpdated(j.studentPlant as StudentPlantDTO);
      setNicknameDraft(null);
    } finally {
      setSavingNickname(false);
    }
  }

  const composerOpen = editorStageId !== null;
  const editorStage: StageDTO | null =
    editorStageId ? stages.find((s) => s.id === editorStageId) ?? null : null;

  return (
    <div className="plant-roadmap">
      <header className="plant-head">
        <span className="plant-head-emoji" aria-hidden>{plant.species.emoji}</span>
        <div>
          <div className="plant-head-name">{plant.species.nameKo}</div>
          {nicknameDraft != null ? (
            <div className="plant-head-nickname-edit">
              <input
                type="text"
                maxLength={20}
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                aria-label="별명 편집"
                disabled={savingNickname}
              />
              <button type="button" onClick={handleNicknameSave} disabled={savingNickname}>
                {savingNickname ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                onClick={() => setNicknameDraft(null)}
                disabled={savingNickname}
              >
                취소
              </button>
            </div>
          ) : (
            <div className="plant-head-nickname">
              “{plant.nickname}”
              {canEdit && (
                <button
                  type="button"
                  className="plant-head-nickname-edit-btn"
                  onClick={() => setNicknameDraft(plant.nickname)}
                  aria-label="별명 편집"
                >
                  편집
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="plant-timeline" role="list" aria-label="성장 타임라인">
        {stages.map((s, idx) => {
          const state = stageState(s.order);
          const obs = observationsByStage.get(s.id) ?? [];
          const isCurrent = s.id === currentStage.id;
          const isLast = idx === stages.length - 1;
          const isFirst = idx === 0;
          const canComposeHere =
            canEdit && (editAnyStage || isCurrent);
          return (
            <section
              key={s.id}
              className="plant-stage-row"
              data-state={state}
              role="listitem"
            >
              <aside className="plant-stage-rail" aria-hidden="true">
                <span
                  className="plant-stage-connector plant-stage-connector--top"
                  data-hidden={isFirst ? "true" : "false"}
                  data-state={state}
                />
                <span className="plant-stage-node" data-state={state}>
                  {s.order}
                </span>
                <span
                  className="plant-stage-connector plant-stage-connector--bottom"
                  data-hidden={isLast ? "true" : "false"}
                  data-state={state === "visited" ? "visited" : "upcoming"}
                />
              </aside>

              <div
                className="plant-stage-body"
                role="region"
                aria-label={`${s.order}단계: ${s.nameKo} (${
                  state === "active" ? "현재" : state === "visited" ? "완료" : "예정"
                })`}
              >
                <header className="plant-stage-body-head">
                  <h3>
                    <span aria-hidden className="plant-stage-body-icon">{s.icon}</span>
                    {s.order}단계 · {s.nameKo}
                    {isCurrent && <span className="plant-stage-body-pill">현재</span>}
                  </h3>
                  {s.description && <p>{s.description}</p>}
                </header>

                {s.observationPoints.length > 0 && (
                  <div className="plant-stage-body-points">
                    <h4>관찰 포인트</h4>
                    <ul>
                      {s.observationPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="plant-stage-body-obs">
                  {obs.length === 0 ? (
                    <p className="plant-stage-body-empty">
                      {state === "upcoming" ? "아직 도달 전" : "아직 기록이 없어요."}
                    </p>
                  ) : (
                    <div className="plant-stage-body-obs-grid">
                      {obs.map((o) => (
                        <article key={o.id} className="plant-obs-card">
                          <div className="plant-obs-meta">
                            <span>{new Date(o.observedAt).toLocaleString("ko-KR")}</span>
                            <span>{o.images.length}장</span>
                          </div>
                          {o.images.length > 0 && (
                            <div className="plant-obs-imgs">
                              {o.images.map((img) => (
                                <div
                                  key={img.id}
                                  className="plant-obs-img optimized-img-wrap"
                                  onClick={() => setLightbox(img.url)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setLightbox(img.url);
                                    }
                                  }}
                                >
                                  <OptimizedImage
                                    src={img.thumbnailUrl ?? img.url}
                                    alt="관찰 사진"
                                    sizes="(max-width: 768px) 33vw, 160px"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {o.memo && <p className="plant-obs-memo">{o.memo}</p>}
                          {o.noPhotoReason && (
                            <p className="plant-obs-reason">사진 없음: {o.noPhotoReason}</p>
                          )}
                          {canEdit && (
                            <div className="plant-obs-actions">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingObs(o);
                                  setEditorStageId(s.id);
                                }}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteObservation(o)}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {canComposeHere && (
                  <div className="plant-stage-body-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        setEditingObs(null);
                        setEditorStageId(s.id);
                      }}
                    >
                      관찰 추가
                    </button>
                    {isCurrent && canEdit && (
                      <button
                        type="button"
                        onClick={handleAdvanceRequest}
                        disabled={busyAdvance}
                        title={
                          photosOnCurrentStage > 0
                            ? "다음 단계로"
                            : "사진이 없어요 — 사유를 적게 됩니다"
                        }
                      >
                        다음 단계로 →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ObservationEditor
        open={composerOpen}
        title={
          editingObs
            ? "관찰 기록 수정"
            : editorStage
            ? `${editorStage.order}단계 · ${editorStage.nameKo} 기록 추가`
            : "관찰 기록 추가"
        }
        initial={editingObs}
        onCancel={() => {
          setEditorStageId(null);
          setEditingObs(null);
        }}
        onSubmit={async (payload) => {
          if (editingObs) {
            await handlePatchObservation(editingObs.id, payload);
          } else {
            await handleCreateObservation(payload);
          }
        }}
      />

      <NoPhotoReasonModal
        open={reasonOpen}
        onCancel={() => setReasonOpen(false)}
        onSubmit={handleReasonSubmit}
        busy={busyAdvance}
        error={reasonError}
      />

      {lightbox && (
        <div
          className="plant-lightbox"
          role="dialog"
          aria-label="사진 원본"
          onClick={() => setLightbox(null)}
        >
          <div className="plant-lightbox-frame optimized-img-wrap">
            <OptimizedImage
              src={lightbox}
              alt="관찰 사진 원본"
              sizes="90vw"
              priority
              fit="contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
