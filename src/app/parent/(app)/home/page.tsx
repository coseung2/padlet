import Link from "next/link";
import { getCurrentParent } from "@/lib/parent-session";
import { db } from "@/lib/db";

// PV-6 parent home (PWA shell variant). Layout guarantees session exists, so
// we can assume `getCurrentParent` is non-null. We list linked children with:
//  - avatar initial (single-letter circle — no image fetch, fits perf budget)
//  - classroom + student number
//  - last-activity badge computed from 3 sources:
//      1) last PlantObservation by student
//      2) last StudentAsset by student
//      3) last BreakoutMembership joinedAt
//    We pick the most recent timestamp across sources. If all null → "활동 없음".

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatRelative(from: Date | null): string {
  if (!from) return "활동 없음";
  const diffMs = Date.now() - from.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return from.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default async function ParentHomePage() {
  // Layout already ensures this is non-null; narrowed again for TS.
  const current = (await getCurrentParent())!;
  const parent = current.parent;

  const children = await db.parentChildLink.findMany({
    where: { parentId: parent.id, deletedAt: null },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          number: true,
          classroom: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute last-activity per student in parallel (3 queries / child).
  // Each query is indexed on studentId — O(children * 3) round trips but
  // small N (<=5 per parent cap).
  const activity = await Promise.all(
    children.map(async (link) => {
      const studentId = link.studentId;
      const [lastObs, lastAsset, lastMembership] = await Promise.all([
        db.plantObservation.findFirst({
          where: { studentPlant: { studentId } },
          orderBy: { observedAt: "desc" },
          select: { observedAt: true },
        }),
        db.studentAsset.findFirst({
          where: { studentId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        db.breakoutMembership.findFirst({
          where: { studentId },
          orderBy: { joinedAt: "desc" },
          select: { joinedAt: true },
        }),
      ]);
      const ts =
        [lastObs?.observedAt, lastAsset?.createdAt, lastMembership?.joinedAt]
          .filter((t): t is Date => !!t)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      return { linkId: link.id, ts };
    })
  );
  const activityMap = new Map(activity.map((a) => [a.linkId, a.ts] as const));

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 16,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "var(--color-text, #111827)",
      }}
    >
      <header style={{ marginTop: 8, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0, lineHeight: 1.2 }}>
          안녕하세요, {parent.name} 님
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted, #6b7280)",
            margin: "6px 0 0",
          }}
        >
          연결된 자녀 {children.length}명
          {parent.tier === "pro" ? " · Pro" : ""}
        </p>
      </header>

      {children.length === 0 ? (
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
          아직 연결된 자녀가 없습니다. 교사에게 새 초대 코드를 요청하세요.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {children.map((link) => {
            const s = link.student;
            const initial = (s.name ?? "?").slice(0, 1);
            const lastTs = activityMap.get(link.id) ?? null;
            return (
              <li key={link.id}>
                <Link
                  href={`/parent/child/${s.id}/plant`}
                  prefetch={false}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 14,
                    background: "var(--color-surface, #fff)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "var(--color-primary-soft, #eef2ff)",
                      color: "var(--color-primary, #4f46e5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {s.name}
                      {s.number != null ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontWeight: 400,
                            fontSize: 12,
                            color: "var(--color-text-muted, #6b7280)",
                          }}
                        >
                          {s.number}번
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-muted, #6b7280)",
                        marginTop: 2,
                      }}
                    >
                      {s.classroom.name}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-muted, #6b7280)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatRelative(lastTs)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
