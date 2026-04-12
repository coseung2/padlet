import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireParentScopeForStudent, ParentScopeError } from "@/lib/parent-scope";
import { ChildTabs } from "@/components/parent/ChildTabs";

// PV-7 child shell. Every page under /parent/child/[studentId]/** re-verifies
// studentId ∈ parent.children *server-side* before rendering, using the same
// helper the API routes use. This is the "API filter + DOM mask" second layer
// from the handoff — even if someone loads this URL directly, the server
// throws 403 and we redirect to /parent/home.
//
// NOTE: the (app) layout already gate-keeps session existence, but it does
// *not* know which studentId is safe. That's why we re-check here.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChildLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  // Minimal Request — the helper only uses it for signalling, not for
  // inspecting headers. We pass a synthetic one to satisfy the signature.
  const reqStub = new Request("https://internal.local/parent-scope");
  try {
    await requireParentScopeForStudent(reqStub, studentId);
  } catch (e) {
    if (e instanceof ParentScopeError) {
      if (e.status === 401) redirect("/parent/logged-out");
      // 403: not this parent's child → shunt them home.
      redirect("/parent/home?error=forbidden_student");
    }
    throw e;
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      number: true,
      classroom: { select: { name: true } },
    },
  });
  if (!student) notFound();

  const initial = (student.name ?? "?").slice(0, 1);

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
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <Link
          href="/parent/home"
          prefetch={false}
          aria-label="홈으로 돌아가기"
          style={{
            color: "var(--color-text-muted, #6b7280)",
            textDecoration: "none",
            fontSize: 18,
            padding: 4,
          }}
        >
          {"\u2190"}
        </Link>
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--color-primary-soft, #eef2ff)",
            color: "var(--color-primary, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {student.name}
            {student.number != null ? (
              <span
                style={{
                  marginLeft: 6,
                  fontWeight: 400,
                  fontSize: 12,
                  color: "var(--color-text-muted, #6b7280)",
                }}
              >
                {student.number}번
              </span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted, #6b7280)",
              marginTop: 1,
            }}
          >
            {student.classroom.name}
          </div>
        </div>
      </header>
      <ChildTabs studentId={studentId} />
      {children}
    </main>
  );
}
