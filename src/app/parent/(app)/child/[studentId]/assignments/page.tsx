import { db } from "@/lib/db";
import { requireParentScopeForStudent } from "@/lib/parent-scope";

// Parent assignments tab. Mirrors the API filter logic — see route.ts for
// the rationale on the applicantName+applicantNumber join approximation.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_KR: Record<string, string> = {
  submitted: "제출됨",
  reviewed: "검토 완료",
  returned: "반려",
  assigned: "미제출",
  viewed: "확인중",
  orphaned: "삭제됨",
  pending_approval: "승인 대기",
  approved: "승인",
  rejected: "거절",
};

export default async function ChildAssignmentsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireParentScopeForStudent(
    new Request("https://internal.local/page"),
    studentId
  );

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, number: true, classroomId: true },
  });
  if (!student) {
    return <EmptyState message="자녀 정보를 불러올 수 없습니다." />;
  }

  // AB-1: AssignmentSlot-backed rows take precedence — they carry the
  // returnReason + submissionStatus that Submission alone can't express.
  const slotRows = await db.assignmentSlot.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: {
      board: { select: { id: true, title: true, slug: true } },
      submission: {
        select: { content: true, feedback: true, grade: true, linkUrl: true },
      },
    },
  });
  const slotBoardIds = new Set(slotRows.map((r) => r.boardId));

  const legacy = await db.submission.findMany({
    where: {
      board: {
        classroomId: student.classroomId,
        accessMode: "classroom",
        id: { notIn: Array.from(slotBoardIds) },
      },
      applicantName: student.name,
      ...(student.number != null ? { applicantNumber: student.number } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      linkUrl: true,
      status: true,
      feedback: true,
      grade: true,
      createdAt: true,
      board: { select: { id: true, title: true, slug: true } },
    },
  });

  type Row = {
    key: string;
    title: string;
    status: string;
    content: string | null;
    feedback: string | null;
    grade: string | null;
    returnReason: string | null;
    createdAt: Date;
  };
  const merged: Row[] = [
    ...slotRows.map((r): Row => ({
      key: `slot-${r.id}`,
      title: r.board.title,
      status: r.submissionStatus,
      content: r.submission?.content ?? null,
      feedback: r.submission?.feedback ?? null,
      grade: r.grade ?? r.submission?.grade ?? null,
      returnReason: r.returnReason ?? null,
      createdAt: r.createdAt,
    })),
    ...legacy.map((s): Row => ({
      key: `legacy-${s.id}`,
      title: s.board.title,
      status: s.status,
      content: s.content,
      feedback: s.feedback,
      grade: s.grade,
      returnReason: null,
      createdAt: s.createdAt,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (merged.length === 0) {
    return <EmptyState message="아직 자녀의 숙제 제출 기록이 없습니다." />;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gap: 10,
      }}
    >
      {merged.map((s) => (
        <li
          key={s.key}
          style={{
            padding: 14,
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, minWidth: 0 }}>
              {s.title}
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--color-primary-soft, #eef2ff)",
                color: "var(--color-primary, #4f46e5)",
                whiteSpace: "nowrap",
              }}
            >
              {STATUS_KR[s.status] ?? s.status}
            </span>
          </div>
          {s.returnReason ? (
            <p
              style={{
                margin: "8px 0 0",
                padding: 10,
                background: "var(--color-status-returned-bg, #ffebee)",
                borderRadius: 6,
                fontSize: 13,
                color: "var(--color-status-returned-text, #c62828)",
              }}
            >
              <strong>반려 사유:</strong> {s.returnReason}
            </p>
          ) : null}
          {s.content ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.4 }}>
              {s.content.length > 140 ? `${s.content.slice(0, 140)}…` : s.content}
            </p>
          ) : null}
          {s.feedback ? (
            <p
              style={{
                margin: "8px 0 0",
                padding: 8,
                background: "var(--color-surface-muted, #f9fafb)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--color-text, #111827)",
              }}
            >
              <strong>교사 피드백:</strong> {s.feedback}
            </p>
          ) : null}
          {s.grade ? (
            <div style={{ marginTop: 6, fontSize: 12 }}>평가: {s.grade}</div>
          ) : null}
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--color-text-muted, #6b7280)",
            }}
          >
            {new Date(s.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 20,
        background: "var(--color-surface, #fff)",
        border: "1px dashed var(--color-border, #e5e7eb)",
        borderRadius: 12,
        color: "var(--color-text-muted, #6b7280)",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}
