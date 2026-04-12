"use client";

/**
 * BreakoutAssignmentManager — teacher dashboard (BR-7 + BR-8).
 *
 * Features:
 *   - Roster list (students of the classroom) + unassigned/assigned status
 *   - Assign / move / remove a student (teacher-assign friendly buttons,
 *     S-Pen-friendly target sizes — no drag for v1)
 *   - Per-group link-fixed share link copy
 *   - CSV roster import (BR-8)
 */
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type BreakoutMembershipData = {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: number | null;
  sectionId: string;
};

export type BreakoutRosterStudent = {
  id: string;
  name: string;
  number: number | null;
};

type SectionLite = { id: string; title: string; order: number };

type Props = {
  assignmentId: string;
  boardSlug: string;
  deployMode: "link-fixed" | "self-select" | "teacher-assign";
  groupCapacity: number;
  sharedSectionTitles: string[];
  sections: SectionLite[];
  memberships: BreakoutMembershipData[];
  roster: BreakoutRosterStudent[];
  onChange: (next: BreakoutMembershipData[]) => void;
  onRosterChange?: (added: BreakoutRosterStudent[]) => void;
  onClose: () => void;
};

type GroupAggregate = {
  groupIndex: number;
  entrySection: SectionLite;
  members: BreakoutMembershipData[];
};

function parseGroupIndex(title: string): number | null {
  const m = /^모둠\s+(\d+)\s+·/.exec(title);
  return m ? Number(m[1]) : null;
}

export function BreakoutAssignmentManager({
  assignmentId,
  boardSlug,
  deployMode,
  groupCapacity,
  sharedSectionTitles,
  sections,
  memberships,
  roster,
  onChange,
  onClose,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const sharedSet = useMemo(() => new Set(sharedSectionTitles), [sharedSectionTitles]);

  const groups: GroupAggregate[] = useMemo(() => {
    const byIndex = new Map<number, GroupAggregate>();
    for (const s of sections) {
      if (sharedSet.has(s.title)) continue;
      const gi = parseGroupIndex(s.title);
      if (gi == null) continue;
      const existing = byIndex.get(gi);
      if (!existing) {
        byIndex.set(gi, { groupIndex: gi, entrySection: s, members: [] });
      }
    }
    // members attach by sectionId → aggregate by the section's group index
    for (const m of memberships) {
      const section = sections.find((s) => s.id === m.sectionId);
      if (!section) continue;
      const gi = parseGroupIndex(section.title);
      if (gi == null) continue;
      byIndex.get(gi)?.members.push(m);
    }
    return Array.from(byIndex.values()).sort((a, b) => a.groupIndex - b.groupIndex);
  }, [sections, memberships, sharedSet]);

  const assignedStudentIds = useMemo(
    () => new Set(memberships.map((m) => m.studentId)),
    [memberships]
  );

  async function assignStudent(student: BreakoutRosterStudent, group: GroupAggregate) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/breakout/assignments/${assignmentId}/membership`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sectionId: group.entrySection.id,
            studentId: student.id,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`배정 실패: ${data.error ?? res.statusText}`);
        return;
      }
      const { membership } = await res.json();
      onChange([
        ...memberships,
        {
          id: membership.id,
          studentId: student.id,
          studentName: student.name,
          studentNumber: student.number,
          sectionId: membership.sectionId,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function moveMember(m: BreakoutMembershipData, target: GroupAggregate) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/breakout/assignments/${assignmentId}/membership/${m.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sectionId: target.entrySection.id }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`이동 실패: ${data.error ?? res.statusText}`);
        return;
      }
      const { membership } = await res.json();
      onChange(
        memberships.map((row) =>
          row.id === m.id ? { ...row, sectionId: membership.sectionId } : row
        )
      );
    } finally {
      setPending(false);
    }
  }

  async function removeMember(m: BreakoutMembershipData) {
    if (pending) return;
    if (!window.confirm(`${m.studentName} 학생을 모둠에서 제거할까요?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/breakout/assignments/${assignmentId}/membership/${m.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`제거 실패: ${data.error ?? res.statusText}`);
        return;
      }
      onChange(memberships.filter((row) => row.id !== m.id));
    } finally {
      setPending(false);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError(null);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/breakout/assignments/${assignmentId}/roster-import`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`업로드 실패: ${data.error ?? res.statusText}`);
        return;
      }
      const { created, existing, failed } = await res.json();
      setImportResult(`새로 추가 ${created}, 기존 ${existing}, 실패 ${failed}`);
      router.refresh();
    } finally {
      setPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function copyLink(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const url = `${window.location.origin}/board/${boardSlug}/s/${section.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => alert(`링크 복사됨: ${url}`))
      .catch(() => alert(`복사 실패. 수동 복사: ${url}`));
  }

  const unassignedRoster = roster.filter((s) => !assignedStudentIds.has(s.id));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="모둠 배정 관리"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface,#fff)",
          borderRadius: 8,
          maxWidth: 960,
          width: "95vw",
          maxHeight: "90vh",
          overflow: "auto",
          padding: 20,
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>모둠 배정 관리</h2>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </header>

        {error && (
          <div role="alert" style={{ color: "var(--color-danger,#c00)", marginBottom: 8 }}>
            {error}
          </div>
        )}
        {importResult && (
          <div style={{ color: "var(--color-success,#070)", marginBottom: 8 }}>{importResult}</div>
        )}

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: "1rem" }}>학생 명단 CSV 업로드</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted,#555)" }}>
            name, number 헤더가 포함된 CSV를 올려주세요. 반에 없는 학생이면 새로 추가됩니다.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            disabled={pending}
          />
        </section>

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: "1rem" }}>
            미배정 학생 ({unassignedRoster.length}명)
          </h3>
          {unassignedRoster.length === 0 ? (
            <p style={{ color: "var(--color-muted,#555)" }}>
              모든 학생이 배정됐어요.
            </p>
          ) : (
            <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {unassignedRoster.map((s) => (
                <li
                  key={s.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: 6,
                    border: "1px solid var(--color-border,#eee)",
                    borderRadius: 4,
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {s.number != null ? `${s.number}. ${s.name}` : s.name}
                  </span>
                  {deployMode === "teacher-assign" || deployMode === "link-fixed" ? (
                    groups.map((g) => (
                      <button
                        key={g.groupIndex}
                        type="button"
                        disabled={pending || g.members.length >= groupCapacity}
                        onClick={() => assignStudent(s, g)}
                      >
                        → {g.groupIndex}
                      </button>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "var(--color-muted,#888)" }}>
                      학생이 직접 선택
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 style={{ fontSize: "1rem" }}>모둠별 배정 현황</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {groups.map((g) => (
              <div
                key={g.groupIndex}
                style={{
                  border: "1px solid var(--color-border,#ddd)",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <strong>모둠 {g.groupIndex}</strong>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-muted,#555)" }}>
                    {g.members.length} / {groupCapacity}
                  </span>
                </div>
                {deployMode === "link-fixed" && (
                  <button
                    type="button"
                    onClick={() => copyLink(g.entrySection.id)}
                    style={{ marginBottom: 8, fontSize: "0.85rem" }}
                  >
                    🔗 섹션 링크 복사
                  </button>
                )}
                {g.members.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--color-muted,#888)" }}>
                    비어 있음
                  </p>
                ) : (
                  <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                    {g.members.map((m) => (
                      <li
                        key={m.id}
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          {m.studentNumber != null
                            ? `${m.studentNumber}. ${m.studentName}`
                            : m.studentName}
                        </span>
                        {groups
                          .filter((target) => target.groupIndex !== g.groupIndex)
                          .map((target) => (
                            <button
                              key={target.groupIndex}
                              type="button"
                              onClick={() => moveMember(m, target)}
                              disabled={pending || target.members.length >= groupCapacity}
                              title={`모둠 ${target.groupIndex}로 이동`}
                            >
                              →{target.groupIndex}
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={() => removeMember(m)}
                          disabled={pending}
                          aria-label="제거"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
