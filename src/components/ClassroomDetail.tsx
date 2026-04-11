"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddStudentsModal } from "./AddStudentsModal";
import { QRPrintSheet } from "./QRPrintSheet";

type Student = {
  id: string;
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

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

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
                <th className="classroom-th classroom-th-num">#</th>
                <th className="classroom-th">이름</th>
                <th className="classroom-th">QR</th>
                <th className="classroom-th">코드</th>
                <th className="classroom-th">등록일</th>
                <th className="classroom-th classroom-th-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  index={i + 1}
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

      {/* Add students modal */}
      {showAddStudents && (
        <AddStudentsModal
          open={showAddStudents}
          classroomId={classroom.id}
          onClose={() => setShowAddStudents(false)}
          onAdded={() => {
            setShowAddStudents(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ── Student row sub-component ── */

function StudentRow({
  student,
  index,
  onReissue,
  onDelete,
}: {
  student: Student;
  index: number;
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
      <td className="classroom-td classroom-td-num">{index}</td>
      <td className="classroom-td classroom-td-name">{student.name}</td>
      <td className="classroom-td classroom-td-qr">
        {qrSrc ? (
          <img src={qrSrc} alt="QR" className="classroom-qr-thumb" />
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
