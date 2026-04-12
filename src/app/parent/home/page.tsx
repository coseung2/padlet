import { redirect } from "next/navigation";
import { getCurrentParent } from "@/lib/parent-session";
import { db } from "@/lib/db";

// Stub parent home page — PV-6 replaces this with the PWA shell + child cards.
// At this layer we only verify session integrity and list the linked children
// so the end-to-end auth flow can be smoke-tested.
//
// Rendered via the Node runtime (cookies + prisma). No caching.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ParentHomePage() {
  const current = await getCurrentParent();
  if (!current) {
    redirect("/parent/join?error=session_required");
  }

  const children = await db.parentChildLink.findMany({
    where: { parentId: current.parent.id, deletedAt: null },
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

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "24px auto",
        padding: 16,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "var(--color-text, #111827)",
      }}
    >
      <h1 style={{ fontSize: 20, marginTop: 0 }}>안녕하세요, {current.parent.name} 님</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-muted, #6b7280)" }}>
        연결된 자녀 {children.length}명
      </p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {children.map((link) => (
          <li
            key={link.id}
            style={{
              padding: 12,
              marginBottom: 8,
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: 8,
              background: "var(--color-surface, #fff)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{link.student.name}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted, #6b7280)" }}>
              {link.student.classroom.name}
              {link.student.number != null ? ` · ${link.student.number}번` : ""}
            </div>
          </li>
        ))}
      </ul>

      {children.length === 0 ? (
        <p style={{ color: "var(--color-text-muted, #6b7280)" }}>
          아직 연결된 자녀가 없습니다. 교사에게 새 초대 코드를 요청하세요.
        </p>
      ) : null}

      <p style={{ marginTop: 32, fontSize: 12, color: "var(--color-text-muted, #6b7280)" }}>
        상세 뷰(그림·식물관찰·행사·숙제)는 PV-6 단계에서 추가됩니다.
      </p>
    </main>
  );
}
