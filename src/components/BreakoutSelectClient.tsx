"use client";

/**
 * BreakoutSelectClient — student group chooser (BR-5 self-select).
 * Picks the group's entry section, POSTs to membership API, then navigates.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type Group = {
  groupIndex: number;
  entrySectionId: string;
  totalCount: number;
  sections: Array<{ id: string; title: string; count: number }>;
};

type Props = {
  assignmentId: string;
  boardSlug: string;
  groups: Group[];
  groupCapacity: number;
  studentName: string;
};

export function BreakoutSelectClient({
  assignmentId,
  boardSlug,
  groups,
  groupCapacity,
  studentName,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(group: Group) {
    if (pending !== null) return;
    setPending(group.groupIndex);
    setError(null);
    try {
      const res = await fetch(
        `/api/breakout/assignments/${assignmentId}/membership`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sectionId: group.entrySectionId }),
        }
      );
      if (res.ok) {
        router.push(`/board/${boardSlug}/s/${group.entrySectionId}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setError("이미 모둠을 선택했어요. 변경은 교사 승인이 필요해요.");
      } else if (data.error === "capacity_reached") {
        setError(`모둠 ${group.groupIndex}은 이미 정원이 찼어요. 다른 모둠을 골라주세요.`);
      } else {
        setError(`선택 실패: ${data.error ?? res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      setError("네트워크 오류로 선택하지 못했어요.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section style={{ padding: "16px" }}>
      <p style={{ marginBottom: 12, color: "var(--color-muted,#555)" }}>
        {studentName} 님, 참여할 모둠을 한 번만 고를 수 있어요. (정원 {groupCapacity}명)
      </p>
      {error && (
        <div role="alert" style={{ color: "var(--color-danger,#c00)", marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {groups.map((g) => {
          const isFull = g.totalCount >= groupCapacity * g.sections.length;
          return (
            <button
              key={g.groupIndex}
              type="button"
              disabled={isFull || pending !== null}
              onClick={() => pick(g)}
              className="column-card"
              style={{
                padding: 16,
                minHeight: 120,
                cursor: isFull ? "not-allowed" : "pointer",
                textAlign: "left",
                border: "2px solid var(--color-border,#ddd)",
                borderRadius: 8,
                opacity: isFull ? 0.5 : 1,
              }}
              aria-label={`모둠 ${g.groupIndex} 선택`}
            >
              <h3 style={{ fontSize: "1.1rem", marginBottom: 8 }}>모둠 {g.groupIndex}</h3>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>
                현재 {g.totalCount} / {groupCapacity * g.sections.length}명
              </p>
              {isFull && (
                <p style={{ color: "var(--color-muted,#888)", fontSize: "0.85rem", marginTop: 4 }}>
                  정원 초과
                </p>
              )}
              {pending === g.groupIndex && (
                <p style={{ fontSize: "0.85rem", marginTop: 4 }}>선택 중…</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
