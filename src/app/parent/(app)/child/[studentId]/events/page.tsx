import { db } from "@/lib/db";
import { requireParentScopeForStudent } from "@/lib/parent-scope";

// Parent events tab. Same filter as the API (see events/route.ts).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_KR: Record<string, string> = {
  submitted: "제출됨",
  pending_approval: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
  reviewed: "검토 완료",
  returned: "반려",
};

export default async function ChildEventsPage({
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
    return <Empty message="자녀 정보를 불러올 수 없습니다." />;
  }

  const mySubs = await db.submission.findMany({
    where: {
      applicantName: student.name,
      ...(student.number != null ? { applicantNumber: student.number } : {}),
      board: {
        classroomId: student.classroomId,
        accessMode: { in: ["public-link", "classroom"] },
        eventStart: { not: null },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      status: true,
      teamName: true,
      createdAt: true,
      board: {
        select: {
          id: true,
          title: true,
          eventStart: true,
          eventEnd: true,
          venue: true,
        },
      },
    },
  });

  // Group by board id — one card per event.
  const grouped = new Map<string, {
    board: (typeof mySubs)[number]["board"];
    subs: Omit<(typeof mySubs)[number], "board">[];
  }>();
  for (const s of mySubs) {
    const { board, ...rest } = s;
    const entry = grouped.get(board.id) ?? { board, subs: [] };
    entry.subs.push(rest);
    grouped.set(board.id, entry);
  }

  if (grouped.size === 0) {
    return <Empty message="아직 자녀가 신청한 행사가 없습니다." />;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gap: 12,
      }}
    >
      {Array.from(grouped.values()).map(({ board, subs }) => (
        <li
          key={board.id}
          style={{
            padding: 14,
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>{board.title}</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted, #6b7280)",
              marginTop: 4,
            }}
          >
            {board.eventStart
              ? new Date(board.eventStart).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })
              : "날짜 미정"}
            {board.venue ? ` · ${board.venue}` : ""}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
            {subs.map((s) => (
              <li
                key={s.id}
                style={{
                  padding: 8,
                  background: "var(--color-surface-muted, #f9fafb)",
                  borderRadius: 6,
                  marginTop: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {s.teamName ? `팀: ${s.teamName}` : "개인 신청"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-primary, #4f46e5)",
                    }}
                  >
                    {STATUS_KR[s.status] ?? s.status}
                  </span>
                </div>
                {s.content ? (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: "var(--color-text-muted, #6b7280)",
                    }}
                  >
                    {s.content.length > 120
                      ? `${s.content.slice(0, 120)}…`
                      : s.content}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Empty({ message }: { message: string }) {
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
