import { db } from "@/lib/db";
import { requireParentScopeForStudent } from "@/lib/parent-scope";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

// Parent breakout tab. Mirrors the API — see breakout/route.ts for rationale.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLE_KR: Record<string, string> = {
  expert: "전문가 조",
  home: "모둠 조",
};

export default async function ChildBreakoutPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireParentScopeForStudent(
    new Request("https://internal.local/page"),
    studentId
  );

  const memberships = await db.breakoutMembership.findMany({
    where: { studentId },
    orderBy: { joinedAt: "desc" },
    include: {
      assignment: {
        include: {
          board: { select: { id: true, title: true, slug: true } },
          template: { select: { name: true, key: true } },
        },
      },
      section: {
        select: {
          id: true,
          title: true,
          cards: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              content: true,
              imageUrl: true,
              linkUrl: true,
              linkTitle: true,
            },
          },
        },
      },
    },
  });

  if (memberships.length === 0) {
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
        아직 자녀가 참여한 모둠 활동이 없습니다.
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "grid",
        gap: 14,
      }}
    >
      {memberships.map((m) => (
        <li
          key={m.id}
          style={{
            padding: 14,
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {m.assignment.board.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted, #6b7280)",
              marginTop: 3,
            }}
          >
            {m.assignment.template.name} · {m.section.title}
            {m.role ? ` · ${ROLE_KR[m.role] ?? m.role}` : ""}
          </div>

          {m.section.cards.length > 0 ? (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "10px 0 0",
                display: "grid",
                gap: 8,
              }}
            >
              {m.section.cards.map((c) => (
                <li
                  key={c.id}
                  style={{
                    padding: 10,
                    background: "var(--color-surface-muted, #f9fafb)",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  {c.title ? (
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {c.title}
                    </div>
                  ) : null}
                  {c.imageUrl ? (
                    <OptimizedImage
                      src={c.imageUrl}
                      alt={c.title || "카드 이미지"}
                      width={200}
                      height={120}
                      style={{
                        width: "100%",
                        maxHeight: 160,
                        objectFit: "cover",
                        borderRadius: 6,
                        marginBottom: 6,
                      }}
                    />
                  ) : null}
                  {c.content ? (
                    <div style={{ lineHeight: 1.4 }}>
                      {c.content.length > 160
                        ? `${c.content.slice(0, 160)}…`
                        : c.content}
                    </div>
                  ) : null}
                  {c.linkUrl ? (
                    <div style={{ marginTop: 4, fontSize: 11 }}>
                      <a
                        href={c.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--color-primary, #4f46e5)" }}
                      >
                        {c.linkTitle || c.linkUrl}
                      </a>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: "var(--color-text-muted, #6b7280)",
              }}
            >
              아직 모둠에 카드가 없습니다.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
