import { db } from "@/lib/db";
import { requireParentScopeForStudent } from "@/lib/parent-scope";

// Parent read-only plant journal page. Layout has already verified scope, so
// here we directly query by studentId. We defensively re-check via
// requireParentScopeForStudent too — the layout and the page both run on the
// server so the cost is minimal, and the redundancy protects against any
// future refactor that changes layout semantics.
//
// Rendering strategy: vertical timeline grouped by stage, oldest at top so
// the "growth story" reads naturally. Re-uses OptimizedImage for
// thumbnails (< 200KB budget enforced by component).

import { OptimizedImage } from "@/components/ui/OptimizedImage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChildPlantPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireParentScopeForStudent(
    new Request("https://internal.local/page"),
    studentId
  );

  const plants = await db.studentPlant.findMany({
    where: { studentId },
    include: {
      species: { include: { stages: { orderBy: { order: "asc" } } } },
      currentStage: true,
      observations: {
        orderBy: { observedAt: "asc" }, // oldest-first timeline
        include: { images: { orderBy: { order: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (plants.length === 0) {
    return (
      <EmptyState message="자녀가 아직 식물관찰일지를 시작하지 않았습니다." />
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {plants.map((p) => {
        const stageMap = new Map(p.species.stages.map((s) => [s.id, s] as const));
        return (
          <section
            key={p.id}
            style={{
              background: "var(--color-surface, #fff)",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <header style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{p.species.emoji}</span>
                <h2 style={{ fontSize: 16, margin: 0 }}>
                  {p.nickname || p.species.nameKo}
                </h2>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-muted, #6b7280)",
                  marginTop: 4,
                }}
              >
                현재 단계: {p.currentStage.nameKo} · 관찰 {p.observations.length}회
              </div>
            </header>

            {p.observations.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-muted, #6b7280)",
                  margin: 0,
                }}
              >
                아직 관찰 기록이 없습니다.
              </p>
            ) : (
              <ol
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: 14,
                }}
              >
                {p.observations.map((o) => {
                  const stage = stageMap.get(o.stageId);
                  return (
                    <li
                      key={o.id}
                      style={{
                        paddingLeft: 14,
                        borderLeft: "3px solid var(--color-primary-soft, #eef2ff)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--color-text-muted, #6b7280)",
                        }}
                      >
                        {new Date(o.observedAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {stage ? ` · ${stage.nameKo}` : ""}
                      </div>
                      {o.memo ? (
                        <p style={{ margin: "4px 0 6px", fontSize: 14, lineHeight: 1.45 }}>
                          {o.memo}
                        </p>
                      ) : null}
                      {o.noPhotoReason ? (
                        <p
                          style={{
                            margin: "4px 0 6px",
                            fontSize: 12,
                            color: "var(--color-text-muted, #6b7280)",
                            fontStyle: "italic",
                          }}
                        >
                          사진 없음: {o.noPhotoReason}
                        </p>
                      ) : null}
                      {o.images.length > 0 ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          {o.images.map((img) => (
                            <OptimizedImage
                              key={img.id}
                              src={img.thumbnailUrl ?? img.url}
                              alt={`관찰 사진 ${img.order + 1}`}
                              width={200}
                              height={200}
                              style={{
                                width: "100%",
                                height: 120,
                                objectFit: "cover",
                                borderRadius: 6,
                              }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
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
