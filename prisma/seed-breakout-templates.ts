/**
 * Seed script — Breakout Room system templates (BR-2).
 *
 * Idempotent: 8 templates are upserted by `key`.
 * Free 3 + Pro 5 (월드카페 v2 파킹).
 *
 * structure schema:
 *   {
 *     sectionsPerGroup: [{ title, role, defaultCards?: [{title, content}] }, ...],
 *     sharedSections?:  [{ title, role: "teacher-pool" }]
 *   }
 *
 * Run: `npm run seed:breakout`
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type SectionSpec = {
  title: string;
  role: "group-copy" | "role-expert" | "role-home";
  defaultCards?: Array<{ title: string; content: string }>;
};

type SharedSectionSpec = {
  title: string;
  role: "teacher-pool";
};

type TemplateSeed = {
  key: string;
  name: string;
  description: string;
  tier: "free" | "pro";
  requiresPro: boolean;
  recommendedVisibility: "own-only" | "peek-others";
  defaultGroupCount: number;
  defaultGroupCapacity: number;
  structure: {
    sectionsPerGroup: SectionSpec[];
    sharedSections?: SharedSectionSpec[];
  };
};

const TEMPLATES: TemplateSeed[] = [
  // ── Free 3 ─────────────────────────────────────────────────────────────
  {
    key: "kwl_chart",
    name: "KWL 차트",
    description: "아는 것 / 알고 싶은 것 / 배운 것을 모둠별로 정리",
    tier: "free",
    requiresPro: false,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "K (아는 것)",
          role: "group-copy",
          defaultCards: [
            { title: "예시 아이디어", content: "우리 모둠이 이미 알고 있는 내용을 적어봅시다." },
          ],
        },
        {
          title: "W (알고 싶은 것)",
          role: "group-copy",
          defaultCards: [
            { title: "궁금한 점", content: "이 주제에 대해 더 알고 싶은 것을 질문 형태로 적어봅시다." },
          ],
        },
        {
          title: "L (배운 것)",
          role: "group-copy",
          defaultCards: [],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "brainstorm",
    name: "브레인스토밍",
    description: "자유롭게 아이디어를 발산하고 도트 투표로 수렴",
    tier: "free",
    requiresPro: false,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "아이디어 발산",
          role: "group-copy",
          defaultCards: [
            { title: "자유롭게!", content: "비판하지 말고 일단 많이 적어봅시다." },
          ],
        },
        {
          title: "도트 투표 결과",
          role: "group-copy",
          defaultCards: [],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "icebreaker",
    name: "아이스브레이커",
    description: "자기소개 · 재미있는 사실 · 모둠 공통점 찾기",
    tier: "free",
    requiresPro: false,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "자기소개",
          role: "group-copy",
          defaultCards: [
            { title: "이름/취미", content: "이름과 좋아하는 것을 간단히 적어주세요." },
          ],
        },
        {
          title: "재미있는 사실",
          role: "group-copy",
          defaultCards: [],
        },
        {
          title: "우리 모둠 공통점",
          role: "group-copy",
          defaultCards: [],
        },
      ],
    },
  },

  // ── Pro 5 ──────────────────────────────────────────────────────────────
  {
    key: "pros_cons",
    name: "찬반 토론",
    description: "찬성/반대 논거를 독립적으로 정리 후 결론 도출",
    tier: "pro",
    requiresPro: true,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "찬성 (Pros)",
          role: "group-copy",
          defaultCards: [
            { title: "찬성 논거 1", content: "근거와 함께 작성" },
          ],
        },
        {
          title: "반대 (Cons)",
          role: "group-copy",
          defaultCards: [
            { title: "반대 논거 1", content: "근거와 함께 작성" },
          ],
        },
        {
          title: "우리의 결론",
          role: "group-copy",
          defaultCards: [],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "jigsaw",
    name: "Jigsaw 협동학습",
    description: "전문가 그룹 → 홈 그룹으로 지식을 전달",
    tier: "pro",
    requiresPro: true,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "전문가 단계",
          role: "role-expert",
          defaultCards: [
            { title: "전문가 토픽", content: "담당 토픽을 깊이 있게 정리" },
          ],
        },
        {
          title: "홈 단계",
          role: "role-home",
          defaultCards: [
            { title: "홈 그룹 공유 노트", content: "전문가가 돌아와 가르친 내용" },
          ],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "presentation_prep",
    name: "모둠 발표 준비",
    description: "발표 개요 · 슬라이드 · 대본 · 리허설 (모둠 간 peek 허용)",
    tier: "pro",
    requiresPro: true,
    recommendedVisibility: "peek-others",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "발표 개요",
          role: "group-copy",
          defaultCards: [
            { title: "핵심 메시지", content: "무엇을 전달할 것인가?" },
          ],
        },
        {
          title: "슬라이드",
          role: "group-copy",
          defaultCards: [],
        },
        {
          title: "대본 / 역할 분담",
          role: "group-copy",
          defaultCards: [],
        },
        {
          title: "리허설 노트",
          role: "group-copy",
          defaultCards: [],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "gallery_walk",
    name: "갤러리 워크",
    description: "각 모둠 결과물 전시 + 상호 관람 (peek 기본)",
    tier: "pro",
    requiresPro: true,
    recommendedVisibility: "peek-others",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        {
          title: "우리 모둠의 작품",
          role: "group-copy",
          defaultCards: [
            { title: "작품 설명", content: "결과물 제목·설명·사진을 업로드하세요." },
          ],
        },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
  {
    key: "six_hats",
    name: "6색 모자 사고법",
    description: "6가지 역할(사실/감정/비판/긍정/창의/조정)로 다각도 사고",
    tier: "pro",
    requiresPro: true,
    recommendedVisibility: "own-only",
    defaultGroupCount: 4,
    defaultGroupCapacity: 6,
    structure: {
      sectionsPerGroup: [
        { title: "🤍 하양 · 사실", role: "group-copy", defaultCards: [] },
        { title: "❤️ 빨강 · 감정", role: "group-copy", defaultCards: [] },
        { title: "🖤 검정 · 비판", role: "group-copy", defaultCards: [] },
        { title: "💛 노랑 · 긍정", role: "group-copy", defaultCards: [] },
        { title: "💚 초록 · 창의", role: "group-copy", defaultCards: [] },
        { title: "💙 파랑 · 조정", role: "group-copy", defaultCards: [] },
      ],
      sharedSections: [{ title: "팀 공용 자료", role: "teacher-pool" }],
    },
  },
];

async function main() {
  console.log("👥 Breakout templates seed start");
  let inserted = 0;
  let updated = 0;

  for (const t of TEMPLATES) {
    const before = await prisma.breakoutTemplate.findUnique({
      where: { key: t.key },
      select: { id: true },
    });

    await prisma.breakoutTemplate.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        name: t.name,
        description: t.description,
        tier: t.tier,
        requiresPro: t.requiresPro,
        scope: "system",
        ownerId: null,
        structure: t.structure as unknown as Prisma.InputJsonValue,
        recommendedVisibility: t.recommendedVisibility,
        defaultGroupCount: t.defaultGroupCount,
        defaultGroupCapacity: t.defaultGroupCapacity,
      },
      update: {
        name: t.name,
        description: t.description,
        tier: t.tier,
        requiresPro: t.requiresPro,
        structure: t.structure as unknown as Prisma.InputJsonValue,
        recommendedVisibility: t.recommendedVisibility,
        defaultGroupCount: t.defaultGroupCount,
        defaultGroupCapacity: t.defaultGroupCapacity,
      },
    });

    if (before) updated++;
    else inserted++;
    console.log(`  ✓ ${t.key} (${t.tier}${t.requiresPro ? ", Pro" : ""})`);
  }

  const total = await prisma.breakoutTemplate.count({
    where: { scope: "system" },
  });
  console.log(
    `👥 Done. inserted=${inserted} updated=${updated} system_total=${total}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
