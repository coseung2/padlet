# Diff Summary — initial-padlet-app

빈 저장소에서 시작해서 Padlet 클론 MVP를 완성.

## 신규 / 주요 변경

### 설정 / 인프라
- **package.json** — Next.js 16, React 19, Prisma 6, @dnd-kit/core, zod, tsx, server-only
- **tsconfig.json** — Next.js App Router 표준 + `@/*` alias
- **next.config.ts** — 기본 설정, strict mode on
- **.env / .env.example** — `DATABASE_URL="file:./dev.db"`

### 데이터 레이어 (Prisma + SQLite)
- **prisma/schema.prisma** — User / Board / BoardMember(RBAC) / Card 4개 모델
  - Postgres 호환 스키마 (SQLite-only 어노테이션 사용 없음)
  - `BoardMember.role: String` + zod 검증 (SQLite enum 미지원 우회)
  - `Card` 에 x/y/width/height float + 인덱스
- **prisma/seed.ts** — 멱등 시드: 3 users, 1 board, 12 cards

### 앱 코어
- **src/app/layout.tsx** — 최소 HTML skeleton
- **src/app/page.tsx** — `/board/demo` 리디렉트
- **src/app/board/[id]/page.tsx** — server component, slug/id OR 조회, RBAC gate, BoardCanvas + UserSwitcher 렌더
- **src/app/globals.css** — Notion 디자인 토큰 시스템 (:root CSS 변수, 3개 반응형 브레이크포인트)

### API 라우트
- **src/app/api/boards/[id]/route.ts** — GET (보드 + 카드 + 멤버 + 현재 권한)
- **src/app/api/cards/route.ts** — POST (editor+) with zod 검증
- **src/app/api/cards/[id]/route.ts** — PATCH (editor+), DELETE (owner or author-self)

### 클라이언트 컴포넌트
- **src/components/BoardCanvas.tsx** — dnd-kit 래퍼, 낙관적 업데이트 + 실패 시 revert
- **src/components/DraggableCard.tsx** — useDraggable + 절대 위치 + delete 버튼
- **src/components/AddCardButton.tsx** — inline 폼 (editor+만 노출)
- **src/components/UserSwitcher.tsx** — `?as=` 링크 버튼 3개

### 라이브러리
- **src/lib/db.ts** — Prisma singleton (dev hot-reload 대응)
- **src/lib/auth.ts** — `server-only` + cookies 기반 mock currentUser
- **src/lib/rbac.ts** — requirePermission / getBoardRole + 권한 매트릭스
- **src/lib/roles.ts** — isomorphic 상수 (client/server 공용)

### 미들웨어
- **src/proxy.ts** — Next.js 16 proxy, `?as=` 쿼리 → 쿠키 세팅 (dev only)

## phase6 델타

- globals.css 에서 `[data-theme="figma"]` / `[data-theme="miro"]` 블록 제거 (~125줄)
- ThemeSwitcher.tsx, theme.ts 삭제
- layout.tsx / proxy.ts / board page 에서 theme 관련 코드 제거
- globals.css 에 반응형 breakpoint 3개 + 토큰 보강

## 테스트 추가

- **명시적 테스트 파일 없음** — MVP 스킵 (phase9 QA에서 e2e curl 기반 smoke 검증)
