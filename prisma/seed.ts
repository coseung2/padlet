/**
 * Seed script — idempotent.
 * Run: `npm run seed` (or: `tsx prisma/seed.ts`)
 *
 * Creates:
 *  - 3 users (owner / editor / viewer)
 *  - 3 boards: Freeform demo, Grid demo, Stream demo
 *  - 3 memberships per board (same users, same roles)
 *  - Cards per board (12 freeform + 9 grid + 8 stream)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { id: "u_owner", email: "owner@padlet.local", name: "오너 유진" },
  { id: "u_editor", email: "editor@padlet.local", name: "에디터 지훈" },
  { id: "u_viewer", email: "viewer@padlet.local", name: "뷰어 수연" },
];

const BOARDS = [
  { id: "b_demo", slug: "demo", title: "자유 배치 보드", layout: "freeform" },
  { id: "b_grid", slug: "grid-demo", title: "그리드 보드", layout: "grid" },
  { id: "b_stream", slug: "stream-demo", title: "스트림 보드", layout: "stream" },
  { id: "b_columns", slug: "columns-demo", title: "칼럼 보드 (Kanban)", layout: "columns" },
];

const MEMBERSHIPS: Array<{ userId: string; role: "owner" | "editor" | "viewer" }> = [
  { userId: "u_owner", role: "owner" },
  { userId: "u_editor", role: "editor" },
  { userId: "u_viewer", role: "viewer" },
];

// ──── Freeform cards (existing) ────
type SeedCard = {
  title: string;
  content: string;
  color?: string | null;
  x: number;
  y: number;
  order?: number;
  authorId: string;
};

const FREEFORM_CARDS: SeedCard[] = [
  { title: "오늘의 목표", content: "보드 흐름을 파악하고 첫 카드를 추가해보기 🎯", color: "#ffd8f4", x: 40, y: 40, authorId: "u_owner" },
  { title: "좋은 자료", content: "https://padlet.com\n원본 레퍼런스 — UX 관찰용", color: "#c3faf5", x: 320, y: 60, authorId: "u_owner" },
  { title: "드래그 테스트", content: "이 카드를 끌어서 아무데나 놓아보세요.\n새로고침해도 위치가 유지됩니다.", color: "#ffe6cd", x: 600, y: 40, authorId: "u_editor" },
  { title: "이번 주 할 일", content: "- 스택 정리\n- 시드 데이터 확장\n- 카드 편집 UX", color: "#fde0f0", x: 40, y: 240, authorId: "u_owner" },
  { title: "질문들", content: "실시간 동기화는 언제 붙일까?\nLiveblocks vs Yjs 벤치마크 필요", color: "#ffc6c6", x: 320, y: 260, authorId: "u_editor" },
  { title: "아이디어 노트", content: "카드 애니메이션을 살짝 넣으면 느낌이 확 다를 듯", color: "#f2f9ff", x: 600, y: 260, authorId: "u_editor" },
  { title: "읽을거리", content: "Notion DESIGN.md — 웜 뉴트럴 취향 저격", color: "#f6f5f4", x: 40, y: 440, authorId: "u_owner" },
  { title: "디자인 톤 메모", content: "figma: 흑백 + 그라데이션\nmiro: 파스텔 + 블루\nnotion: 웜 + 미니멀", x: 320, y: 460, authorId: "u_owner" },
  { title: "버그 리포트", content: "드래그 중 카드가 살짝 겹칠 때 z-index 보정 필요", color: "#fbd4d4", x: 600, y: 460, authorId: "u_editor" },
  { title: "접근성 메모", content: "키보드 드래그도 꼭 테스트", color: "#e3c5c5", x: 40, y: 660, authorId: "u_owner" },
  { title: "잡담", content: "오늘 커피 너무 많이 마심 ☕️", x: 320, y: 680, authorId: "u_editor" },
  { title: "다음 단계", content: "보드 레이아웃 종류를 확장 중", color: "#ffe6cd", x: 600, y: 660, authorId: "u_owner" },
];

// ──── Grid cards ────
const GRID_CARDS: SeedCard[] = [
  { title: "프로젝트 킥오프", content: "4월 첫째 주 시작. 목표: MVP 3주 내 완성.", color: "#ffd8f4", x: 0, y: 0, order: 0, authorId: "u_owner" },
  { title: "기술 스택 확정", content: "Next.js 16 + SQLite + Prisma + react-draggable", color: "#c3faf5", x: 0, y: 0, order: 1, authorId: "u_owner" },
  { title: "디자인 시스템", content: "Notion 테마 선정. 웜 뉴트럴 + whisper border.", color: "#f6f5f4", x: 0, y: 0, order: 2, authorId: "u_owner" },
  { title: "RBAC 구현 완료", content: "owner / editor / viewer 3단계. 서버 강제.", color: "#ffe6cd", x: 0, y: 0, order: 3, authorId: "u_editor" },
  { title: "드래그 동작 수정", content: "dnd-kit → react-draggable 교체. 훨씬 안정적.", color: "#fde0f0", x: 0, y: 0, order: 4, authorId: "u_editor" },
  { title: "보드 레이아웃 확장", content: "Grid + Stream 레이아웃 추가 중.", color: "#f2f9ff", x: 0, y: 0, order: 5, authorId: "u_owner" },
  { title: "시드 데이터 정교화", content: "보드별 카드 세트 + 멱등 시드 스크립트.", color: "#ffc6c6", x: 0, y: 0, order: 6, authorId: "u_editor" },
  { title: "다음: Columns", content: "Kanban 스타일 칼럼 레이아웃. 3번째 보드 타입.", color: "#fbd4d4", x: 0, y: 0, order: 7, authorId: "u_owner" },
  { title: "배포 목표", content: "로컬 dev 먼저. Vercel은 인증 붙인 후.", x: 0, y: 0, order: 8, authorId: "u_owner" },
];

// ──── Stream cards ────
const STREAM_CARDS: SeedCard[] = [
  { title: "4/9 — 프로젝트 시작", content: "패들렛 클론 프로젝트 시작. 하네스 설계 완료, 첫 feature 파이프라인 가동.", color: "#ffd8f4", x: 0, y: 0, order: 0, authorId: "u_owner" },
  { title: "4/9 — 3개 테마 비교", content: "Figma / Miro / Notion 디자인 시스템을 받아와서 각각 CSS 테마로 구현. 사용자에게 선택 요청.", color: "#c3faf5", x: 0, y: 0, order: 1, authorId: "u_owner" },
  { title: "4/10 — Notion 선정", content: "사용자가 Notion 테마를 선택. 나머지 2개 아카이브. phase6에서 반응형 3-breakpoint 추가 + 미세조정.", color: "#f6f5f4", x: 0, y: 0, order: 2, authorId: "u_owner" },
  { title: "4/10 — 드래그 이슈", content: "dnd-kit의 React 19 호환 문제 + CSS transition 충돌. react-draggable로 교체하여 해결.", color: "#ffc6c6", x: 0, y: 0, order: 3, authorId: "u_editor" },
  { title: "4/10 — RBAC 검증", content: "viewer 403, editor 카드 생성, owner 전권 — 모두 서버 사이드 검증 완료.", color: "#ffe6cd", x: 0, y: 0, order: 4, authorId: "u_editor" },
  { title: "4/10 — 보드 종류 리서치", content: "Padlet 9개 레이아웃 + Miro/FigJam/Trello/Notion 비교. Grid + Stream + Columns 순서로 확장 결정.", color: "#f2f9ff", x: 0, y: 0, order: 5, authorId: "u_owner" },
  { title: "4/10 — Grid + Stream 구현", content: "Board.layout 필드 추가, Section 모델 준비, 레이아웃별 렌더 전략 분기.", color: "#fde0f0", x: 0, y: 0, order: 6, authorId: "u_owner" },
  { title: "다음 — Columns (Kanban)", content: "칼럼 간 드래그 이동 + Section CRUD. Trello 스타일.", x: 0, y: 0, order: 7, authorId: "u_owner" },
];

async function main() {
  console.log("🌱 Seed start");

  // Users
  for (const u of USERS) {
    await prisma.user.upsert({ where: { id: u.id }, create: u, update: { name: u.name, email: u.email } });
  }

  // Boards + memberships
  for (const b of BOARDS) {
    await prisma.board.upsert({ where: { id: b.id }, create: b, update: { slug: b.slug, title: b.title, layout: b.layout } });
    for (const m of MEMBERSHIPS) {
      await prisma.boardMember.upsert({
        where: { boardId_userId: { boardId: b.id, userId: m.userId } },
        create: { boardId: b.id, userId: m.userId, role: m.role },
        update: { role: m.role },
      });
    }
  }

  // Cards per board
  const cardSets: Array<{ boardId: string; cards: SeedCard[] }> = [
    { boardId: "b_demo", cards: FREEFORM_CARDS },
    { boardId: "b_grid", cards: GRID_CARDS },
    { boardId: "b_stream", cards: STREAM_CARDS },
  ];

  for (const { boardId, cards } of cardSets) {
    await prisma.card.deleteMany({ where: { boardId } });
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      await prisma.card.create({
        data: {
          boardId,
          authorId: c.authorId,
          title: c.title,
          content: c.content,
          color: c.color ?? null,
          x: c.x,
          y: c.y,
          order: c.order ?? i,
        },
      });
    }
  }

  // ──── Columns board: Sections + Cards ────
  const SECTIONS = [
    { id: "s_todo", boardId: "b_columns", title: "할 일", order: 0 },
    { id: "s_progress", boardId: "b_columns", title: "진행 중", order: 1 },
    { id: "s_done", boardId: "b_columns", title: "완료", order: 2 },
  ];

  await prisma.section.deleteMany({ where: { boardId: "b_columns" } });
  for (const s of SECTIONS) {
    await prisma.section.upsert({
      where: { id: s.id },
      create: s,
      update: { title: s.title, order: s.order },
    });
  }

  const COLUMN_CARDS: SeedCard[] = [
    { title: "인증 시스템 도입", content: "NextAuth 또는 Clerk 검토 후 구현", color: "#ffd8f4", x: 0, y: 0, order: 0, authorId: "u_owner" },
    { title: "실시간 동기화", content: "Liveblocks vs Yjs 벤치마크", color: "#c3faf5", x: 0, y: 0, order: 1, authorId: "u_owner" },
    { title: "이미지 업로드", content: "카드에 이미지 첨부 기능", x: 0, y: 0, order: 2, authorId: "u_editor" },
    { title: "RBAC 구현", content: "owner/editor/viewer 3단계 서버 강제", color: "#ffe6cd", x: 0, y: 0, order: 0, authorId: "u_editor" },
    { title: "Grid 레이아웃", content: "CSS Grid auto-fill 기반 카드 배치", color: "#fde0f0", x: 0, y: 0, order: 1, authorId: "u_owner" },
    { title: "Stream 레이아웃", content: "위→아래 피드형 보드", color: "#f2f9ff", x: 0, y: 0, order: 2, authorId: "u_owner" },
    { title: "프로젝트 초기 설정", content: "Next.js 16 + SQLite + Prisma", color: "#f6f5f4", x: 0, y: 0, order: 0, authorId: "u_owner" },
    { title: "Notion 테마 확정", content: "웜 뉴트럴 + whisper border 적용", color: "#ffc6c6", x: 0, y: 0, order: 1, authorId: "u_owner" },
    { title: "드래그 수정", content: "dnd-kit → react-draggable 교체", color: "#fbd4d4", x: 0, y: 0, order: 2, authorId: "u_editor" },
  ];

  // Assign sections: first 3 = todo, next 3 = progress, last 3 = done
  await prisma.card.deleteMany({ where: { boardId: "b_columns" } });
  for (let i = 0; i < COLUMN_CARDS.length; i++) {
    const c = COLUMN_CARDS[i];
    const sectionId = i < 3 ? "s_todo" : i < 6 ? "s_progress" : "s_done";
    await prisma.card.create({
      data: {
        boardId: "b_columns",
        sectionId,
        authorId: c.authorId,
        title: c.title,
        content: c.content,
        color: c.color ?? null,
        x: c.x,
        y: c.y,
        order: c.order ?? i,
      },
    });
  }

  const total = FREEFORM_CARDS.length + GRID_CARDS.length + STREAM_CARDS.length + COLUMN_CARDS.length;
  console.log(`✅ Seed complete — users=${USERS.length}, boards=${BOARDS.length}, sections=${SECTIONS.length}, cards=${total}`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
