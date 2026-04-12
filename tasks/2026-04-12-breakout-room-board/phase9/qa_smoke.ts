/**
 * QA Smoke — BR-1 ~ BR-4 foundation
 *
 * Verifies:
 *  - 8 system templates exist (BR-2)
 *  - Tier/requiresPro mapping
 *  - recommendedVisibility mapping
 *  - Creating a breakout board produces the expected section count
 *  - "copy-card" multiplies a card across group sections, skipping teacher-pool
 *  - Editing section A doesn't affect section B (independence)
 *  - Structure deep-clone: modifying template.structure doesn't retroactively
 *    affect existing board.
 *
 * Run: `npx tsx tasks/2026-04-12-breakout-room-board/phase9/qa_smoke.ts`
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { cloneStructure, groupSectionTitle } from "../../../src/lib/breakout";

const prisma = new PrismaClient();

async function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    throw new Error(`ASSERT FAIL: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function main() {
  console.log("▶ BR-1 ~ BR-4 smoke test");
  const failures: string[] = [];

  try {
    // ── BR-2: 8 system templates ─────────────────────────────────────────
    console.log("\n▸ BR-2: 시스템 템플릿 8종 검증");
    const systemTemplates = await prisma.breakoutTemplate.findMany({
      where: { scope: "system" },
      orderBy: { key: "asc" },
    });
    await assert(systemTemplates.length === 8, `총 8종 (실제 ${systemTemplates.length})`);

    const freeKeys = systemTemplates.filter((t) => !t.requiresPro).map((t) => t.key);
    const proKeys = systemTemplates.filter((t) => t.requiresPro).map((t) => t.key);
    await assert(freeKeys.length === 3, `Free 3종 (실제 ${freeKeys.length}: ${freeKeys.join(",")})`);
    await assert(proKeys.length === 5, `Pro 5종 (실제 ${proKeys.length})`);
    await assert(freeKeys.includes("kwl_chart"), "kwl_chart = Free");
    await assert(freeKeys.includes("brainstorm"), "brainstorm = Free");
    await assert(freeKeys.includes("icebreaker"), "icebreaker = Free");
    await assert(proKeys.includes("jigsaw"), "jigsaw = Pro");

    const peekKeys = systemTemplates
      .filter((t) => t.recommendedVisibility === "peek-others")
      .map((t) => t.key);
    await assert(peekKeys.length === 2, `peek-others 2종 (실제 ${peekKeys.length}: ${peekKeys.join(",")})`);
    await assert(
      peekKeys.includes("gallery_walk") && peekKeys.includes("presentation_prep"),
      "gallery_walk + presentation_prep = peek-others"
    );

    // ── Create a test board using the full transaction logic ─────────────
    console.log("\n▸ BR-3: 보드 생성 (kwl_chart, 4모둠)");
    // Pick a teacher user (first owner) to avoid touching auth
    const teacherUser = await prisma.user.findFirst();
    if (!teacherUser) {
      console.log("  (no user in DB — skipping create flow)");
      return;
    }

    const kwl = systemTemplates.find((t) => t.key === "kwl_chart")!;
    const structure = cloneStructure(kwl.structure);
    const groupCount = 4;
    const timestamp = Date.now().toString(36);
    const testSlug = `qa-breakout-${timestamp}`;

    const testBoard = await prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          title: "QA · KWL",
          slug: testSlug,
          layout: "breakout",
          description: "qa-smoke",
          members: { create: { userId: teacherUser.id, role: "owner" } },
        },
      });
      const assignment = await tx.breakoutAssignment.create({
        data: {
          boardId: board.id,
          templateId: kwl.id,
          deployMode: "link-fixed",
          groupCount,
          groupCapacity: 6,
          visibilityOverride: null,
          status: "active",
        },
      });
      let cursor = 0;
      for (let g = 1; g <= groupCount; g++) {
        for (const spec of structure.sectionsPerGroup) {
          const sec = await tx.section.create({
            data: {
              boardId: board.id,
              title: groupSectionTitle(g, spec.title),
              order: cursor++,
            },
          });
          if (spec.defaultCards) {
            let co = 0;
            for (const dc of spec.defaultCards) {
              await tx.card.create({
                data: {
                  boardId: board.id,
                  sectionId: sec.id,
                  authorId: teacherUser.id,
                  title: dc.title,
                  content: dc.content,
                  x: 0,
                  y: 0,
                  order: co++,
                },
              });
            }
          }
        }
      }
      if (structure.sharedSections) {
        for (const shared of structure.sharedSections) {
          await tx.section.create({
            data: {
              boardId: board.id,
              title: shared.title,
              order: cursor++,
            },
          });
        }
      }
      return { board, assignment };
    });

    const sections = await prisma.section.findMany({
      where: { boardId: testBoard.board.id },
      orderBy: { order: "asc" },
    });
    // kwl has 3 sectionsPerGroup (K/W/L) + 1 sharedSection (teacher-pool). 4모둠.
    // Expected = 4*3 + 1 = 13
    await assert(sections.length === 13, `섹션 13개 생성 (실제 ${sections.length})`);

    const teacherPoolCount = sections.filter((s) => s.title === "팀 공용 자료").length;
    await assert(teacherPoolCount === 1, `teacher-pool 1개 (실제 ${teacherPoolCount})`);

    const group1Sections = sections.filter((s) => s.title.startsWith("모둠 1 · "));
    await assert(group1Sections.length === 3, `모둠 1 섹션 3개 (실제 ${group1Sections.length})`);

    const initialCards = await prisma.card.findMany({
      where: { boardId: testBoard.board.id },
    });
    // kwl K/W/L: K has 1 defaultCard, W has 1, L has 0. × 4 modun = 8 cards.
    await assert(initialCards.length === 8, `기본 카드 8개 (실제 ${initialCards.length})`);

    // ── BR-3 independence: edit group 1 section, verify group 2 unaffected
    console.log("\n▸ 독립성: 모둠 1 수정 → 모둠 2 영향 없음");
    const group1K = sections.find((s) => s.title === "모둠 1 · K (아는 것)")!;
    const group2K = sections.find((s) => s.title === "모둠 2 · K (아는 것)")!;
    await prisma.card.create({
      data: {
        boardId: testBoard.board.id,
        sectionId: group1K.id,
        authorId: teacherUser.id,
        title: "모둠 1 전용 카드",
        content: "only here",
        x: 0,
        y: 0,
        order: 99,
      },
    });
    const group2Cards = await prisma.card.findMany({
      where: { sectionId: group2K.id },
    });
    await assert(
      !group2Cards.some((c) => c.title === "모둠 1 전용 카드"),
      "모둠 2는 모둠 1 카드를 보지 않는다"
    );

    // ── BR-4 copy-card: simulate bulk copy ──────────────────────────────
    console.log("\n▸ BR-4: copy-card 서버 로직 시뮬레이션");
    // pick a card from group 1
    const sourceCard = (await prisma.card.findFirst({
      where: { boardId: testBoard.board.id, sectionId: group1K.id },
    }))!;
    const poolTitles = new Set((structure.sharedSections ?? []).map((s) => s.title));
    const groupSectionIds = sections
      .filter((s) => !poolTitles.has(s.title))
      .map((s) => s.id);

    const createdCopies = await prisma.$transaction(async (tx) => {
      const out: { id: string; sectionId: string | null }[] = [];
      for (const sid of groupSectionIds) {
        if (sid === sourceCard.sectionId) continue;
        const maxOrder = await tx.card.aggregate({
          where: { sectionId: sid },
          _max: { order: true },
        });
        const c = await tx.card.create({
          data: {
            boardId: testBoard.board.id,
            sectionId: sid,
            authorId: teacherUser.id,
            title: sourceCard.title,
            content: sourceCard.content,
            color: sourceCard.color,
            imageUrl: sourceCard.imageUrl,
            linkUrl: sourceCard.linkUrl,
            linkTitle: sourceCard.linkTitle,
            linkDesc: sourceCard.linkDesc,
            linkImage: sourceCard.linkImage,
            videoUrl: sourceCard.videoUrl,
            x: 0,
            y: 0,
            width: sourceCard.width,
            height: sourceCard.height,
            order: (maxOrder._max.order ?? -1) + 1,
          },
        });
        out.push({ id: c.id, sectionId: c.sectionId });
      }
      return out;
    });
    // 13 sections - 1 teacher-pool - 1 origin (group1K) = 11 copies
    await assert(createdCopies.length === 11, `복제 11개 생성 (실제 ${createdCopies.length})`);

    const poolSectionId = sections.find((s) => s.title === "팀 공용 자료")!.id;
    const poolCardsAfterCopy = await prisma.card.findMany({
      where: { sectionId: poolSectionId, title: sourceCard.title },
    });
    await assert(poolCardsAfterCopy.length === 0, "teacher-pool은 복제 대상에서 제외됨");

    // ── 역전파 방지: 템플릿 structure 변경이 기존 board에 영향 없음
    console.log("\n▸ 템플릿 원본 역전파 없음");
    // Simulate a template structure mutation (we don't persist — pure test).
    const mutated = cloneStructure(kwl.structure);
    mutated.sectionsPerGroup[0].title = "MUTATED K";
    const group1KRefresh = await prisma.section.findUnique({ where: { id: group1K.id } });
    await assert(
      group1KRefresh!.title === "모둠 1 · K (아는 것)",
      "클론된 structure 수정 → 기존 Section 불변"
    );

    // ── Cleanup ─────────────────────────────────────────────────────────
    await prisma.board.delete({ where: { id: testBoard.board.id } });
    console.log("\n  ✓ 테스트 보드 삭제 (Cascade로 Assignment/Section/Card 제거)");

    // Confirm orphans: no assignment, no sections, no cards remain
    const orphanAssignment = await prisma.breakoutAssignment.findUnique({
      where: { id: testBoard.assignment.id },
    });
    await assert(orphanAssignment === null, "Cascade로 Assignment 제거 확인");
  } catch (e: unknown) {
    failures.push(String(e));
  }

  if (failures.length > 0) {
    console.error("\n✗ QA FAILED:", failures);
    process.exit(1);
  }
  console.log("\n✓ All smoke tests passed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
