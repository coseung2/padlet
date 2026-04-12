"use client";

import { useState } from "react";
import { SubmitModal, ViewModal, type SubmissionData } from "./SubmissionModals";

type MemberData = {
  userId: string;
  userName: string;
  role: string;
};

type Props = {
  boardId: string;
  description: string;
  initialSubmissions: SubmissionData[];
  members: MemberData[];
  currentUserId: string;
  currentRole: "owner" | "editor" | "viewer";
};

export function AssignmentBoard({
  boardId,
  description,
  initialSubmissions,
  members,
  currentUserId,
  currentRole,
}: Props) {
  const [submissions, setSubmissions] = useState<SubmissionData[]>(initialSubmissions);
  const [viewingSub, setViewingSub] = useState<SubmissionData | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const isTeacher = currentRole === "owner";
  const students = members.filter((m) => m.role !== "owner");
  const mySub = submissions.find((s) => s.userId === currentUserId) ?? null;

  const submitted = submissions.length;
  const total = students.length;
  const percent = total > 0 ? Math.round((submitted / total) * 100) : 0;

  function getSubmission(userId: string) {
    return submissions.find((s) => s.userId === userId) ?? null;
  }

  function getStudentName(userId: string) {
    return members.find((m) => m.userId === userId)?.userName ?? userId;
  }

  async function handleSubmit(content: string, linkUrl: string, fileUrl: string) {
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardId,
          content,
          linkUrl: linkUrl || null,
          fileUrl: fileUrl || null,
        }),
      });
      if (res.ok) {
        const { submission } = await res.json();
        setSubmissions((prev) => {
          const filtered = prev.filter((s) => s.userId !== currentUserId);
          return [...filtered, submission];
        });
        setShowSubmitModal(false);
      } else {
        alert(`제출 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReview(subId: string, status: string, feedback?: string, grade?: string) {
    try {
      const res = await fetch(`/api/submissions/${subId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, feedback, grade }),
      });
      if (res.ok) {
        const { submission } = await res.json();
        setSubmissions((prev) => prev.map((s) => (s.id === submission.id ? submission : s)));
        setViewingSub(submission);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const statusLabel: Record<string, string> = {
    submitted: "제출완료",
    reviewed: "확인완료",
    returned: "반려",
  };

  return (
    <div className="board-canvas-wrap">
      <div className="assign-board">
        {/* 과제 설명 */}
        {description && (
          <div className="assign-description">{description}</div>
        )}

        {/* ── 교사 화면 ── */}
        {isTeacher && (
          <>
            <div className="assign-progress">
              <span className="assign-progress-text">
                제출 현황: {submitted}/{total}명 완료
              </span>
              <div className="assign-progress-bar">
                <div className="assign-progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>

            <div className="assign-grid">
              {students.map((m) => {
                const sub = getSubmission(m.userId);
                return (
                  <div
                    key={m.userId}
                    className={`assign-card ${sub ? `assign-card-${sub.status}` : "assign-card-none"}`}
                    onClick={sub ? () => setViewingSub(sub) : undefined}
                  >
                    <div className="assign-card-avatar">
                      {m.userName.charAt(0)}
                    </div>
                    <div className="assign-card-name">{m.userName}</div>
                    <div className={`assign-card-status ${sub ? `status-${sub.status}` : ""}`}>
                      {sub ? statusLabel[sub.status] : "미제출"}
                    </div>
                    {sub?.grade && (
                      <div className="assign-card-grade">{sub.grade}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── 학생 화면 ── */}
        {!isTeacher && (
          <div className="assign-student-view">
            {mySub ? (
              <div className="assign-my-submission">
                <div className="assign-my-header">
                  <span className={`assign-badge assign-badge-${mySub.status}`}>
                    {statusLabel[mySub.status]}
                  </span>
                  {mySub.grade && <span className="assign-my-grade">{mySub.grade}</span>}
                </div>
                <div className="assign-my-content">{mySub.content}</div>
                {mySub.linkUrl && (
                  <a href={mySub.linkUrl} target="_blank" rel="noopener noreferrer" className="assign-link">
                    🔗 {mySub.linkUrl}
                  </a>
                )}
                {mySub.fileUrl && (
                  <a href={mySub.fileUrl} target="_blank" rel="noopener noreferrer" className="assign-link">
                    📎 첨부파일
                  </a>
                )}
                {mySub.feedback && (
                  <div className="assign-feedback">
                    <strong>선생님 피드백:</strong> {mySub.feedback}
                  </div>
                )}
                <button
                  type="button"
                  className="assign-submit-btn"
                  onClick={() => setShowSubmitModal(true)}
                >
                  다시 제출
                </button>
              </div>
            ) : (
              <div className="assign-empty-state">
                <p>아직 제출하지 않았습니다.</p>
                <button
                  type="button"
                  className="assign-submit-btn assign-submit-btn-large"
                  onClick={() => setShowSubmitModal(true)}
                >
                  과제 제출
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <SubmitModal
          existing={mySub}
          onSubmit={handleSubmit}
          onClose={() => setShowSubmitModal(false)}
        />
      )}

      {/* View submission modal (teacher) */}
      {viewingSub && isTeacher && (
        <ViewModal
          submission={viewingSub}
          studentName={viewingSub.userId ? getStudentName(viewingSub.userId) : "공개 신청자"}
          onReview={handleReview}
          onClose={() => setViewingSub(null)}
        />
      )}
    </div>
  );
}
