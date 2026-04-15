"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddStudentsModal, type CreatedStudent } from "./AddStudentsModal";
import { QRPrintSheet } from "./QRPrintSheet";
// parent-class-invite-v2 — per-student ParentInviteButton removed.
// Codes are now classroom-scoped (see /classroom/[id]/parent-access).
import { ParentManagementTab } from "./parent/ParentManagementTab";

type Student = {
  id: string;
  number: number | null;
  name: string;
  qrToken: string;
  textCode: string;
  createdAt: string;
};

type Board = {
  id: string;
  slug: string;
  title: string;
  layout: string;
};

type Props = {
  classroom: {
    id: string;
    name: string;
    code: string;
    students: Student[];
    boards: Board[];
  };
  allBoards: Board[]; // teacher's all boards for picker
};

export function ClassroomDetail({ classroom, allBoards }: Props) {
  const router = useRouter();
  const [students, setStudents] = useState(classroom.students);
  const [linkedBoardIds, setLinkedBoardIds] = useState<Set<string>>(
    new Set(classroom.boards.map((b) => b.id))
  );
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const allSelected = students.length > 0 && selected.size === students.length;

  function handleStudentsAdded(newStudents: CreatedStudent[]) {
    // Optimistic: splice new students into the existing list locally,
    // keeping the table sorted by student number (with unnumbered at the end).
    setStudents((prev) => {
      const normalized = newStudents.map((s) => ({
        id: s.id,
        number: s.number,
        name: s.name,
        qrToken: s.qrToken,
        textCode: s.textCode,
        createdAt: s.createdAt,
      }));
      const merged = [...prev, ...normalized];
      merged.sort((a, b) => {
        if (a.number == null && b.number == null) {
          return a.createdAt.localeCompare(b.createdAt);
        }
        if (a.number == null) return 1;
        if (b.number == null) return -1;
        return a.number - b.number;
      });
      return merged;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s.id)));
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}명의 학생을 삭제하시겠습니까?`)) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/classroom/${classroom.id}/students/batch-delete`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ studentIds: Array.from(selected) }),
        }
      );
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => !selected.has(s.id)));
        setSelected(new Set());
      } else {
        alert(`삭제 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
    setDeleting(false);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(classroom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function handleReissue(studentId: string) {
    if (!confirm("이 학생의 QR 코드를 재발급하시겠습니까? 기존 코드는 사용할 수 없게 됩니다.")) {
      return;
    }
    try {
      const res = await fetch(
        `/api/classroom/${classroom.id}/students/${studentId}/reissue`,
        { method: "POST" }
      );
      if (res.ok) {
        const { student: updated } = await res.json();
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, ...updated } : s))
        );
      } else {
        alert(`재발급 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLinkBoard(boardId: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classroomId: classroom.id }),
      });
      if (res.ok) {
        setLinkedBoardIds((prev) => new Set(prev).add(boardId));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUnlinkBoard(boardId: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classroomId: null }),
      });
      if (res.ok) {
        setLinkedBoardIds((prev) => {
          const next = new Set(prev);
          next.delete(boardId);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(studentId: string) {
    if (!confirm("이 학생을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(
        `/api/classroom/${classroom.id}/students/${studentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      } else {
        alert(`삭제 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="classroom-detail">
      {/* Header */}
      <div className="classroom-detail-header">
        <h1 className="classroom-detail-name">{classroom.name}</h1>
        <button
          type="button"
          className="classroom-detail-code"
          onClick={handleCopyCode}
          title="클릭하여 복사"
        >
          {classroom.code}
          <span className="classroom-detail-code-hint">
            {copied ? "복사됨!" : "복사"}
          </span>
        </button>
      </div>

      {/* Action bar */}
      <div className="classroom-action-bar">
        <button
          type="button"
          className="classroom-action-btn"
          onClick={() => setShowAddStudents(true)}
        >
          + 학생 추가
        </button>
        {selected.size > 0 && (
          <button
            type="button"
            className="classroom-action-btn"
            style={{
              background: "var(--color-danger, #e53e3e)",
              color: "#fff",
              borderColor: "var(--color-danger, #e53e3e)",
            }}
            onClick={handleBatchDelete}
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : `${selected.size}명 삭제`}
          </button>
        )}
        <QRPrintSheet students={students} classroomName={classroom.name} />
      </div>

      {/* Student table */}
      <div className="classroom-table-wrap">
        {students.length === 0 ? (
          <div className="classroom-empty">
            <p className="classroom-empty-text">아직 학생이 없습니다</p>
            <button
              type="button"
              className="classroom-empty-btn"
              onClick={() => setShowAddStudents(true)}
            >
              + 학생 추가
            </button>
          </div>
        ) : (
          <table className="classroom-table">
            <thead>
              <tr>
                <th className="classroom-th" style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    title="전체 선택"
                  />
                </th>
                <th className="classroom-th classroom-th-num">#</th>
                <th className="classroom-th">이름</th>
                <th className="classroom-th">QR</th>
                <th className="classroom-th">코드</th>
                <th className="classroom-th">등록일</th>
                <th className="classroom-th classroom-th-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  checked={selected.has(s.id)}
                  onToggle={() => toggleSelect(s.id)}
                  onReissue={() => handleReissue(s.id)}
                  onDelete={() => handleDelete(s.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Board management */}
      <div className="classroom-boards-section">
        <div className="classroom-boards-header">
          <h2 className="classroom-boards-heading">학급 보드</h2>
          <button
            type="button"
            className="classroom-action-btn"
            onClick={() => setShowBoardPicker(!showBoardPicker)}
          >
            {showBoardPicker ? "닫기" : "+ 보드 연결"}
          </button>
        </div>

        {/* Board picker */}
        {showBoardPicker && (
          <div className="classroom-board-picker">
            {allBoards.filter((b) => !linkedBoardIds.has(b.id)).length === 0 ? (
              <p className="classroom-board-picker-empty">연결할 보드가 없습니다. 대시보드에서 보드를 먼저 만들어주세요.</p>
            ) : (
              allBoards
                .filter((b) => !linkedBoardIds.has(b.id))
                .map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="classroom-board-picker-item"
                    onClick={() => handleLinkBoard(b.id)}
                  >
                    <span className="classroom-board-title">{b.title || "제목 없음"}</span>
                    <span className="classroom-board-layout">{b.layout}</span>
                    <span className="classroom-board-link-action">+ 연결</span>
                  </button>
                ))
            )}
          </div>
        )}

        {/* Linked boards */}
        {linkedBoardIds.size === 0 ? (
          <p className="classroom-boards-empty">연결된 보드가 없습니다. 보드를 연결하면 학생들이 볼 수 있습니다.</p>
        ) : (
          <div className="classroom-boards-grid">
            {allBoards
              .filter((b) => linkedBoardIds.has(b.id))
              .map((b) => (
                <div key={b.id} className="classroom-board-card">
                  <button
                    type="button"
                    className="classroom-board-card-body"
                    onClick={() => router.push(`/board/${b.slug}`)}
                  >
                    <span className="classroom-board-title">{b.title || "제목 없음"}</span>
                    <span className="classroom-board-layout">{b.layout}</span>
                  </button>
                  <button
                    type="button"
                    className="classroom-board-unlink"
                    onClick={() => handleUnlinkBoard(b.id)}
                    title="연결 해제"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Parent management (PV-8 widget mounted here for discoverability) */}
      <section
        className="classroom-parent-section"
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 className="classroom-boards-heading" style={{ margin: 0 }}>
            학부모 관리
          </h2>
          <a
            href={`/classroom/${classroom.id}/parent-access`}
            className="btn btn-secondary"
            style={{ fontSize: 13 }}
          >
            🔗 초대 코드 · 승인 관리
          </a>
        </div>
        <ParentManagementTab classroomId={classroom.id} />
      </section>

      {/* Add students modal */}
      {showAddStudents && (
        <AddStudentsModal
          open={showAddStudents}
          classroomId={classroom.id}
          onClose={() => setShowAddStudents(false)}
          onAdded={(newStudents) => {
            setShowAddStudents(false);
            handleStudentsAdded(newStudents);
          }}
        />
      )}
    </div>
  );
}

/* ── Student row sub-component ── */

function StudentRow({
  student,
  checked,
  onToggle,
  onReissue,
  onDelete,
}: {
  student: Student;
  checked: boolean;
  onToggle: () => void;
  onReissue: () => void;
  onDelete: () => void;
}) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  // Generate tiny QR preview on mount
  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      const url = `${window.location.origin}/qr/${student.qrToken}`;
      QRCode.toDataURL(url, { width: 40, margin: 1 }).then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      });
    });
    return () => { cancelled = true; };
  }, [student.qrToken]);

  const dateStr = new Date(student.createdAt).toLocaleDateString("ko-KR");

  return (
    <tr className="classroom-tr">
      <td className="classroom-td" style={{ width: 36 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
        />
      </td>
      <td className="classroom-td classroom-td-num">{student.number ?? "-"}</td>
      <td className="classroom-td classroom-td-name">{student.name}</td>
      <td className="classroom-td classroom-td-qr">
        {qrSrc ? (
          // QR is a data: URL generated client-side — next/image can't optimize it
          // and the origin is our own page, so a raw <img> is intentional here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QR" className="classroom-qr-thumb" loading="lazy" />
        ) : (
          <span className="classroom-qr-placeholder" />
        )}
      </td>
      <td className="classroom-td classroom-td-code">
        <code className="classroom-text-code">{student.textCode}</code>
      </td>
      <td className="classroom-td classroom-td-date">{dateStr}</td>
      <td className="classroom-td classroom-td-actions">
        <div className="classroom-row-actions">
          <button
            type="button"
            className="classroom-row-btn classroom-row-btn-reissue"
            onClick={onReissue}
            title="QR 재발급"
          >
            재발급
          </button>
          <button
            type="button"
            className="classroom-row-btn classroom-row-btn-delete"
            onClick={onDelete}
            title="삭제"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
