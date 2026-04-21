import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ParentAccessClient } from "./ParentAccessClient";

// parent-class-invite-v2 — teacher parent-access page.
// Inbox-First 2-column layout per phase6/user_decisions §3 (PC-first v1 variant).

type Props = { params: Promise<{ id: string }> };

export default async function ParentAccessPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const classroom = await db.classroom.findUnique({ where: { id } });
  if (!classroom || classroom.teacherId !== user.id) {
    notFound();
  }
  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <a href={`/classroom/${id}`} style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
        ← 학급 상세
      </a>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 24px" }}>
        {classroom.name} · 학부모 액세스
      </h1>
      <ParentAccessClient classroomId={id} />
    </main>
  );
}
