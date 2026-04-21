"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddStudentsModal, type CreatedStudent } from "./AddStudentsModal";
import { QRPrintSheet } from "./QRPrintSheet";
import { ClassroomDeleteModal } from "./classroom/ClassroomDeleteModal";
// parent-class-invite-v2 — per-student ParentInviteButton removed.
// Codes are now classroom-scoped (see /classroom/[id]/parent-access).
// The separate ParentManagementTab widget was pulled too — connected
// parents now surface as a count column in the student table, and the
// full inbox UI lives on the parent-access page (linked via the
// 🔗 초대 코드 · 승인 관리 action-bar button).

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
  /** Last card activity timestamp — drives the 새 활동 badge via
   *  lastVisitedBoards localStorage comparison. Optional so pickers that
   *  don't have this field still type-check. */
  updatedAt?: string;
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

type ClassroomTab = "students" | "parents" | "boards" | "settings";

export function ClassroomDetail({ classroom, allBoards }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<ClassroomTab>("students");
  const [students, setStudents] = useState(classroom.students);
  const [linkedBoardIds, setLinkedBoardIds] = useState<Set<string>>(
    new Set(classroom.boards.map((b) => b.id))
  );
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showClassroomDelete, setShowClassroomDelete] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState(false);
  const [classroomName, setClassroomName] = useState(classroom.name);
  const [renaming, setRenaming] = useState(false);
  const [renameErr, setRenameErr] = useState<string | null>(null);

  // Per-student parent-link counts, loaded once on mount and refreshed on
  // approval/revoke actions elsewhere. Plain Record keyed by studentId
  // so the table row lookup is O(1). Count = active links only.
  const [parentCounts, setParentCounts] = useState<Record<string, number>>({});

  // Classroom-role defs + current (studentId → roleKey) assignments for the
  // 역할 column dropdown. One role per student (enforced by PUT endpoint).
  const [roleDefs, setRoleDefs] = useState<
    { key: string; labelKo: string; emoji: string | null }[]
  >([]);
  const [studentRoleKey, setStudentRoleKey] = useState<Record<string, string>>({});
  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await fetch(`/api/classrooms/${classroom.id}/roles`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          defs: { id: string; key: string; labelKo: string; emoji: string | null }[];
          assignments: { studentId: string; classroomRoleId: string }[];
        };
        setRoleDefs(
          data.defs.map((d) => ({
            key: d.key,
            labelKo: d.labelKo,
            emoji: d.emoji,
          }))
        );
        const keyById = new Map(data.defs.map((d) => [d.id, d.key]));
        const next: Record<string, string> = {};
        for (const a of data.assignments) {
          const k = keyById.get(a.classroomRoleId);
          if (k) next[a.studentId] = k;
        }
        setStudentRoleKey(next);
      } catch {
        // silent — column falls back to "없음"
      }
    }
    loadRoles();
  }, [classroom.id]);

  async function handleRoleChange(studentId: string, roleKey: string) {
    const prev = studentRoleKey[studentId] ?? "";
    const next = roleKey === "" ? "" : roleKey;
    // Optimistic
    setStudentRoleKey((cur) => {
      const copy = { ...cur };
      if (next === "") delete copy[studentId];
      else copy[studentId] = next;
      return copy;
    });
    const res = await fetch(`/api/classrooms/${classroom.id}/roles/set`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId,
        roleKey: next === "" ? null : next,
      }),
    });
    if (!res.ok) {
      // rollback
      setStudentRoleKey((cur) => {
        const copy = { ...cur };
        if (prev === "") delete copy[studentId];
        else copy[studentId] = prev;
        return copy;
      });
    }
  }

  // Count of pending approval requests across this classroom. Shown as a
  // red badge next to the "초대 코드·승인 관리" action-bar button so the
  // teacher sees inbox activity without leaving the student management
  // screen. 60s poll matches the polling cadence inside /parent-access.
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Teacher's last-visit timestamps per board, stored in localStorage
  // (browser-scoped, no DB migration). Boards whose `updatedAt` is newer
  // than the stored value get a "새 활동" highlight. Navigating into the
  // board writes the new timestamp; that side happens on the board page.
  const [lastVisited, setLastVisited] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastVisitedBoards");
      if (raw) setLastVisited(JSON.parse(raw));
    } catch {
      /* ignore malformed payload */
    }
  }, []);

  useEffect(() => {
    async function loadParentLinks() {
      try {
        const res = await fetch(
          `/api/classroom/${classroom.id}/parent-links`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const counts: Record<string, number> = {};
        for (const link of data.links ?? []) {
          const sid = link.student?.id;
          if (!sid) continue;
          counts[sid] = (counts[sid] ?? 0) + 1;
        }
        setParentCounts(counts);
      } catch {
        /* best-effort; header badges fall back to 0 */
      }
    }
    async function loadPending() {
      try {
        const res = await fetch(
          `/api/parent/approvals?classroomId=${encodeURIComponent(classroom.id)}&status=pending`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        setPendingCount((data.items ?? []).length);
      } catch {
        /* ignore */
      }
    }
    loadParentLinks();
    loadPending();
    const poll = setInterval(loadPending, 60_000);
    return () => clearInterval(poll);
  }, [classroom.id]);

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

  async function handleRenameClassroom(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === classroomName) return;
    setRenaming(true);
    setRenameErr(null);
    try {
      const res = await fetch(`/api/classroom/${classroom.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setClassroomName(trimmed);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setRenameErr(body.error ?? `rename ${res.status}`);
      }
    } catch (err) {
      setRenameErr((err as Error).message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDeleteClassroom() {
    setDeletingClassroom(true);
    try {
      const res = await fetch(`/api/classroom/${classroom.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmName: classroom.name }),
      });
      if (res.ok) {
        router.push("/classroom");
      } else {
        const errText = await res.text();
        alert(`학급 삭제 실패: ${errText}`);
      }
    } catch (err) {
      console.error("[handleDeleteClassroom]", err);
      alert("학급 삭제에 실패했습니다.");
    } finally {
      setDeletingClassroom(false);
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
      {/* Header — classroom.code used to be displayed here as a 6-char
          "learner code" but no lookup path actually consumes it (student
          login uses per-student textCode; parents use ClassInviteCode).
          The field stays in the DB schema for future use. */}
      <div className="classroom-detail-header">
        <div className="classroom-detail-header-main">
          <h1 className="classroom-detail-name">{classroomName}</h1>
          <p className="classroom-detail-meta">
            학생 {students.length}명 · 보드 {linkedBoardIds.size}개
          </p>
        </div>
        <a
          href={`/classroom/${classroom.id}/parent-access`}
          className="classroom-invite-card"
        >
          <div>
            <div className="classroom-invite-label">학부모 초대 코드</div>
            <div className="classroom-invite-cta">코드 · 승인 관리 →</div>
          </div>
          {pendingCount > 0 && (
            <span
              className="classroom-invite-badge"
              aria-label={`승인 대기 ${pendingCount}건`}
              title={`승인 대기 ${pendingCount}건`}
            >
              {pendingCount}
            </span>
          )}
        </a>
      </div>

      {/* Tab nav (T6-2 handoff, 2026-04-21). 탭별 컨텐츠는 아래 조건부 렌더. */}
      <nav className="classroom-tabs" role="tablist" aria-label="학급 관리 탭">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "students"}
          className={`classroom-tab${tab === "students" ? " is-active" : ""}`}
          onClick={() => setTab("students")}
        >
          학생 명단 <span className="classroom-tab-count">{students.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "parents"}
          className={`classroom-tab${tab === "parents" ? " is-active" : ""}`}
          onClick={() => setTab("parents")}
        >
          학부모 연결
          {pendingCount > 0 && (
            <span className="classroom-tab-badge" title={`승인 대기 ${pendingCount}건`}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "boards"}
          className={`classroom-tab${tab === "boards" ? " is-active" : ""}`}
          onClick={() => setTab("boards")}
        >
          공유된 보드 <span className="classroom-tab-count">{linkedBoardIds.size}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          className={`classroom-tab${tab === "settings" ? " is-active" : ""}`}
          onClick={() => setTab("settings")}
        >
          설정
        </button>
      </nav>

      {/* ────── TAB: 학생 명단 ────── */}
      {tab === "students" && (
      <>
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
              background: "var(--color-danger)",
              color: "#fff",
              borderColor: "var(--color-danger)",
            }}
            onClick={handleBatchDelete}
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : `${selected.size}명 삭제`}
          </button>
        )}
        <QRPrintSheet students={students} classroomName={classroomName} />
      </div>

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
                <th className="classroom-th">학부모</th>
                <th className="classroom-th">역할</th>
                <th className="classroom-th classroom-th-actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  classroomId={classroom.id}
                  parentCount={parentCounts[s.id] ?? 0}
                  roleKey={studentRoleKey[s.id] ?? ""}
                  roleDefs={roleDefs}
                  onRoleChange={(k) => handleRoleChange(s.id, k)}
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
      </>
      )}

      {/* ────── TAB: 학부모 연결 ────── */}
      {tab === "parents" && (
        <section className="classroom-parents-panel">
          <div className="classroom-parents-summary">
            <div>
              <h2 className="classroom-panel-heading">학부모 초대 · 승인 관리</h2>
              <p className="classroom-panel-hint">
                학부모가 초대 코드로 자녀와 연결을 요청하면 여기서 승인합니다. 자세한 승인/거부 UI는
                전용 페이지에서 이용하세요.
              </p>
            </div>
            <div className="classroom-parents-stat">
              <span className="classroom-parents-stat-num">{pendingCount}</span>
              <span className="classroom-parents-stat-label">승인 대기</span>
            </div>
          </div>
          <a
            href={`/classroom/${classroom.id}/parent-access`}
            className="classroom-parents-cta"
          >
            🔗 초대 코드 · 승인 관리 열기 →
          </a>
        </section>
      )}

      {/* ────── TAB: 공유된 보드 ────── */}
      {tab === "boards" && (
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
              .map((b) => {
                const last = lastVisited[b.id];
                const updated = b.updatedAt;
                const isNew =
                  !!updated &&
                  (!last || new Date(updated).getTime() > new Date(last).getTime());
                return (
                  <div key={b.id} className="classroom-board-card">
                    <button
                      type="button"
                      className="classroom-board-card-body"
                      onClick={() => router.push(`/board/${b.slug}`)}
                    >
                      <span className="classroom-board-title">{b.title || "제목 없음"}</span>
                      <span className="classroom-board-layout">{b.layout}</span>
                      {isNew && (
                        <span className="classroom-board-new" title="마지막 방문 이후 새 활동">
                          🟢 새 활동
                        </span>
                      )}
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
                );
              })}
          </div>
        )}
      </div>
      )}

      {/* ────── TAB: 설정 ────── */}
      {tab === "settings" && (
        <section className="classroom-settings-panel">
          <h2 className="classroom-panel-heading">학급 설정</h2>

          <div className="classroom-setting-row">
            <label className="classroom-setting-label" htmlFor="classroom-name-input">
              학급 이름
            </label>
            <div className="classroom-setting-name-row">
              <input
                id="classroom-name-input"
                className="classroom-setting-input"
                type="text"
                defaultValue={classroomName}
                maxLength={100}
                onBlur={(e) => {
                  if (e.target.value.trim() !== classroomName) {
                    void handleRenameClassroom(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                disabled={renaming}
              />
              {renaming && <span className="classroom-setting-saving">저장 중…</span>}
            </div>
            {renameErr && (
              <p className="classroom-setting-err">이름 저장 실패: {renameErr}</p>
            )}
          </div>

          <div className="classroom-setting-row classroom-setting-danger">
            <div>
              <p className="classroom-setting-label">학급 삭제</p>
              <p className="classroom-setting-hint">
                삭제하면 연결된 학부모 액세스가 전부 해제되고 학생 계정은 비활성됩니다.
                되돌릴 수 없어요.
              </p>
            </div>
            <button
              type="button"
              className="classroom-detail-delete"
              onClick={() => setShowClassroomDelete(true)}
            >
              🗑 학급 삭제
            </button>
          </div>
        </section>
      )}

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

      {/* Classroom delete — re-type classroom name to confirm. Backend
          cascades parent-link revokes and emails the affected parents. */}
      <ClassroomDeleteModal
        open={showClassroomDelete}
        classroomName={classroomName}
        pendingCount={pendingCount}
        activeCount={Object.values(parentCounts).reduce((a, b) => a + b, 0)}
        onConfirm={async () => {
          await handleDeleteClassroom();
          setShowClassroomDelete(false);
        }}
        onCancel={() => {
          if (!deletingClassroom) setShowClassroomDelete(false);
        }}
      />
    </div>
  );
}

/* ── Student row sub-component ── */

function StudentRow({
  student,
  classroomId,
  parentCount,
  roleKey,
  roleDefs,
  onRoleChange,
  checked,
  onToggle,
  onReissue,
  onDelete,
}: {
  student: Student;
  classroomId: string;
  parentCount: number;
  roleKey: string;
  roleDefs: { key: string; labelKo: string; emoji: string | null }[];
  onRoleChange: (roleKey: string) => void;
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
      <td className="classroom-td classroom-td-parent">
        <a
          href={`/classroom/${classroomId}/parent-access?student=${student.id}`}
          className={`classroom-parent-chip ${parentCount === 0 ? "is-empty" : ""}`}
          title={parentCount === 0 ? "연결된 학부모 없음" : `학부모 ${parentCount}명`}
        >
          {parentCount === 0 ? "–" : `${parentCount}명`}
        </a>
      </td>
      <td className="classroom-td classroom-td-role">
        <select
          className="classroom-role-select"
          value={roleKey}
          onChange={(e) => onRoleChange(e.target.value)}
          aria-label={`${student.name} 역할`}
        >
          <option value="">없음</option>
          {roleDefs.map((d) => (
            <option key={d.key} value={d.key}>
              {d.emoji ? `${d.emoji} ` : ""}{d.labelKo}
            </option>
          ))}
        </select>
      </td>
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
