"use client";

import Link from "next/link";
import { useState } from "react";
import type { SpeciesDTO, TeacherSummaryDTO } from "@/types/plant";
import { PlantAllowListModal } from "./PlantAllowListModal";

interface Props {
  summary: TeacherSummaryDTO;
  allSpecies: SpeciesDTO[]; // full catalog, not just allowed
  allowedSpecies: SpeciesDTO[]; // classroom allow-list
  classroomId: string;
  onAllowListSaved: () => void;
}

function formatAgo(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
}

export function TeacherSummaryView({
  summary,
  allSpecies,
  allowedSpecies,
  classroomId,
  onAllowListSaved,
}: Props) {
  const [showAllow, setShowAllow] = useState(false);

  const stages = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="plant-teacher">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>학급 식물 관찰일지</h2>
          <p style={{ margin: "4px 0", color: "var(--color-text-muted)" }}>
            식물 선택: {summary.plantedCount} / {summary.totalStudents}명
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowAllow(true)} className="plant-species-badge" style={{ fontSize: 13, padding: "6px 12px", background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-btn)", cursor: "pointer" }}>
            🌱 식물 허용 목록
          </button>
          <Link
            href={`/classroom/${classroomId}/plant-matrix`}
            className="plant-species-badge"
            style={{ fontSize: 13, padding: "6px 12px", background: "var(--color-accent)", color: "#fff", borderRadius: "var(--radius-btn)", textDecoration: "none" }}
          >
            📊 매트릭스 뷰
          </Link>
        </div>
      </div>

      <h3 style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "8px 0" }}>단계별 분포</h3>
      <div className="plant-distribution">
        {stages.map((s) => (
          <div className="plant-dist-item" key={s}>
            <span className="plant-dist-count">{summary.distribution[String(s)] ?? 0}</span>
            <span className="plant-dist-label">{s}단계</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "18px 0 8px" }}>학생</h3>
      <table className="plant-student-table">
        <thead>
          <tr>
            <th>번호</th>
            <th>이름</th>
            <th>식물</th>
            <th>현재 단계</th>
            <th>최근 관찰</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {summary.students.map((s) => (
            <tr key={s.id}>
              <td>{s.number ?? "—"}</td>
              <td>{s.name}</td>
              <td>
                {s.speciesEmoji ? `${s.speciesEmoji} ${s.speciesName} (${s.nickname})` : "— 미선택 —"}
              </td>
              <td>{s.currentStageOrder ? `${s.currentStageOrder}. ${s.currentStageName}` : "—"}</td>
              <td>{formatAgo(s.lastObservedAt)}</td>
              <td>
                {s.stalled && <span className="plant-stalled-badge">정체 7일+</span>}
              </td>
            </tr>
          ))}
          {summary.students.length === 0 && (
            <tr>
              <td colSpan={6} className="plant-empty-state">아직 학생이 없어요.</td>
            </tr>
          )}
        </tbody>
      </table>

      <PlantAllowListModal
        open={showAllow}
        allSpecies={allSpecies}
        initialAllowed={new Set(allowedSpecies.map((s) => s.id))}
        classroomId={classroomId}
        onClose={() => setShowAllow(false)}
        onSaved={() => {
          setShowAllow(false);
          onAllowListSaved();
        }}
      />
    </div>
  );
}
