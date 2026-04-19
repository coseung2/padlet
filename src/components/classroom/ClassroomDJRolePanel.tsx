"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  name: string;
  number: number | null;
};

type Assignment = {
  id: string;
  studentId: string;
  classroomRoleId: string;
  student: Student;
};

type RoleDef = {
  id: string;
  key: string;
  labelKo: string;
  emoji: string | null;
};

type Props = {
  classroomId: string;
  students: Student[];
};

export function ClassroomDJRolePanel({ classroomId, students }: Props) {
  const [defs, setDefs] = useState<RoleDef[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/roles`);
        if (!res.ok) return;
        const data = await res.json();
        setDefs(data.defs ?? []);
        setAssignments(data.assignments ?? []);
      } finally {
        setLoaded(true);
      }
    })();
  }, [classroomId]);

  const djDef = defs.find((d) => d.key === "dj");
  const djAssignments = djDef
    ? assignments.filter((a) => a.classroomRoleId === djDef.id)
    : [];
  const djStudentIds = new Set(djAssignments.map((a) => a.studentId));

  async function handleToggle(studentId: string, currentlyDJ: boolean) {
    if (!djDef || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (currentlyDJ) {
        const assignment = djAssignments.find((a) => a.studentId === studentId);
        if (!assignment) return;
        const res = await fetch(
          `/api/classrooms/${classroomId}/roles/assign/${assignment.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          setError("해제 실패");
          return;
        }
        setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
      } else {
        const res = await fetch(
          `/api/classrooms/${classroomId}/roles/assign`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ studentId, roleKey: "dj" }),
          }
        );
        if (!res.ok) {
          const msg = (await res.json().catch(() => ({}))).error;
          setError(typeof msg === "string" ? msg : "지정 실패");
          return;
        }
        const { assignment } = await res.json();
        const student = students.find((s) => s.id === studentId);
        if (!student) return;
        setAssignments((prev) => [
          ...prev,
          { ...assignment, student },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <section className="classroom-dj-panel">
        <h3>🎧 DJ 역할</h3>
        <p className="dj-panel-loading">불러오는 중…</p>
      </section>
    );
  }

  if (!djDef) {
    return (
      <section className="classroom-dj-panel">
        <h3>🎧 DJ 역할</h3>
        <p className="dj-panel-error">
          DJ 역할이 정의되지 않았어요 (seed 실행 필요).
        </p>
      </section>
    );
  }

  return (
    <section className="classroom-dj-panel">
      <h3>🎧 DJ 역할</h3>
      <p className="dj-panel-desc">
        DJ로 지정된 학생은 DJ 큐 보드에서 곡 승인·순서 변경·삭제 권한을 갖습니다.
      </p>

      {djAssignments.length > 0 && (
        <div className="dj-panel-current">
          <span className="dj-panel-label">현재 DJ:</span>
          {djAssignments.map((a) => (
            <span key={a.id} className="dj-panel-chip">
              {a.student.number ? `${a.student.number}번 ` : ""}
              {a.student.name}
            </span>
          ))}
        </div>
      )}

      {error && <p className="dj-panel-error">{error}</p>}

      <ul className="dj-panel-students">
        {students.map((s) => {
          const isDJ = djStudentIds.has(s.id);
          return (
            <li key={s.id} className="dj-panel-student-row">
              <span>
                {s.number ? `${s.number}번 ` : ""}
                {s.name}
              </span>
              <button
                type="button"
                className={`dj-panel-toggle ${isDJ ? "is-on" : ""}`}
                onClick={() => handleToggle(s.id, isDJ)}
                disabled={busy}
                aria-pressed={isDJ}
              >
                {isDJ ? "DJ 해제" : "DJ 지정"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
