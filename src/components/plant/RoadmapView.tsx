"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ObservationDTO, StudentPlantDTO } from "@/types/plant";
import { StageDetailSheet } from "./StageDetailSheet";
import { ObservationEditor } from "./ObservationEditor";
import { NoPhotoReasonModal } from "./NoPhotoReasonModal";

interface Props {
  plant: StudentPlantDTO;
  canEdit: boolean; // true for the student who owns this plant
  onPlantUpdated: (next: StudentPlantDTO) => void;
}

export function RoadmapView({ plant, canEdit, onPlantUpdated }: Props) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [editingObs, setEditingObs] = useState<ObservationDTO | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [busyAdvance, setBusyAdvance] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const activeNodeRef = useRef<HTMLButtonElement | null>(null);

  const stages = plant.species.stages;
  const currentStage = stages.find((s) => s.id === plant.currentStageId) ?? stages[0];
  const currentOrder = currentStage?.order ?? 0;
  const selectedStage = stages.find((s) => s.id === selectedStageId) ?? null;

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

  // Scroll active node into center on mount
  useEffect(() => {
    if (activeNodeRef.current) {
      activeNodeRef.current.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
    }
  }, []);

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
    const res = await fetch(`/api/student-plants/${plant.id}/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: selectedStage?.id ?? currentStage.id,
        memo: payload.memo,
        images: payload.images,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? "저장 실패");
    }
    await refreshPlant();
    setEditorOpen(false);
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
    setEditorOpen(false);
    setEditingObs(null);
  }

  async function handleDeleteObservation(obs: ObservationDTO) {
    const res = await fetch(`/api/student-plants/${plant.id}/observations/${obs.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? "삭제 실패");
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
        setSelectedStageId(null);
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
      setSelectedStageId(null);
    } finally {
      setBusyAdvance(false);
    }
  }

  return (
    <div className="plant-roadmap">
      <header className="plant-head">
        <span className="plant-head-emoji" aria-hidden>{plant.species.emoji}</span>
        <div>
          <div className="plant-head-name">{plant.species.nameKo}</div>
          <div className="plant-head-nickname">“{plant.nickname}”</div>
        </div>
      </header>

      <div className="plant-line-scroll" role="list" aria-label="성장 단계">
        <div className="plant-line">
          {stages.map((s, idx) => {
            const state = stageState(s.order);
            const showLineAfter = idx < stages.length - 1;
            const nextState = showLineAfter ? stageState(stages[idx + 1].order) : null;
            const future = state === "upcoming" || nextState === "upcoming";
            return (
              <div key={s.id} style={{ display: "contents" }}>
                <div className="plant-node-wrap" role="listitem">
                  <button
                    ref={state === "active" ? activeNodeRef : undefined}
                    type="button"
                    className="plant-node"
                    data-state={state}
                    aria-current={state === "active" ? "step" : undefined}
                    aria-label={`${s.order}단계: ${s.nameKo} (${state === "active" ? "현재" : state === "visited" ? "완료" : "예정"})`}
                    onClick={() => setSelectedStageId(s.id)}
                  >
                    {s.order}
                  </button>
                  <span className="plant-node-label">
                    <span className="plant-node-label-icon" aria-hidden>{s.icon}</span>
                    {s.nameKo}
                  </span>
                </div>
                {showLineAfter && (
                  <span className="plant-connector" data-future={future} aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="plant-line-cta">
        <button type="button" onClick={() => setSelectedStageId(currentStage.id)}>
          {currentStage.order}단계 관찰 기록 보기
        </button>
      </div>

      <StageDetailSheet
        open={!!selectedStage}
        stage={selectedStage}
        observations={selectedStage ? observationsByStage.get(selectedStage.id) ?? [] : []}
        canEdit={canEdit}
        isCurrentStage={selectedStage?.id === currentStage.id}
        hasPhotosOnCurrent={photosOnCurrentStage > 0}
        onClose={() => setSelectedStageId(null)}
        onAddObservation={() => {
          setEditingObs(null);
          setEditorOpen(true);
        }}
        onEditObservation={(obs) => {
          setEditingObs(obs);
          setEditorOpen(true);
        }}
        onDeleteObservation={handleDeleteObservation}
        onAdvanceStage={handleAdvanceRequest}
        onOpenLightbox={(url) => setLightbox(url)}
      />

      <ObservationEditor
        open={editorOpen}
        title={editingObs ? "관찰 기록 수정" : "관찰 기록 추가"}
        initial={editingObs}
        onCancel={() => {
          setEditorOpen(false);
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
          <img src={lightbox} alt="관찰 사진 원본" />
        </div>
      )}
    </div>
  );
}
