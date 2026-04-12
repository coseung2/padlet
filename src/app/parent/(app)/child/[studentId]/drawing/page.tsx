import { db } from "@/lib/db";
import { requireParentScopeForStudent } from "@/lib/parent-scope";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

// Parent read-only view of the child's drawing library. Grid of thumbnails.
// Scope re-verified at page level even though the child layout also guards —
// this file will eventually ship to preview deployments and the layer of
// defence is cheap.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChildDrawingPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireParentScopeForStudent(
    new Request("https://internal.local/page"),
    studentId
  );

  const assets = await db.studentAsset.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      format: true,
      createdAt: true,
    },
  });

  if (assets.length === 0) {
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
        아직 그림 라이브러리에 작품이 없습니다.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {assets.map((a) => (
        <figure
          key={a.id}
          style={{
            margin: 0,
            background: "var(--color-surface, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 140,
              background: "var(--color-surface-muted, #f9fafb)",
            }}
          >
            <OptimizedImage
              src={a.thumbnailUrl ?? a.fileUrl}
              alt={a.title || "학생 작품"}
              fit="cover"
            />
          </div>
          <figcaption
            style={{
              padding: "6px 8px 8px",
              fontSize: 12,
              color: "var(--color-text, #111827)",
              lineHeight: 1.3,
            }}
          >
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.title || "제목 없음"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--color-text-muted, #6b7280)",
                marginTop: 2,
              }}
            >
              {new Date(a.createdAt).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
