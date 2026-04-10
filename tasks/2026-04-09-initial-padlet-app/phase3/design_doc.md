# Design Doc — initial-padlet-app

**Scope Decision**: `phase2/scope_decision.md` 참조.

## 0. 스택 결정 (first-feature)

| 레이어 | 선택 | 사유 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router | 풀스택 + Vercel 친화 + 서버/클라 컴포넌트 명확 |
| 런타임 | Node.js 24 | Vercel Fluid Compute 기본 |
| DB | SQLite (Prisma) | Docker 비활성 상태, 제로 설정. Postgres 이행 경로 보장 |
| ORM | Prisma 6 | 스키마 + 마이그 + 시드 통합 |
| UI 기본 | Tailwind CSS 4 + CSS 변수 | 테마 스위치가 핵심이므로 Tailwind 토큰을 변수로 매핑 |
| 드래그 | @dnd-kit/core + @dnd-kit/sortable | App Router 호환성 확인됨 |
| 폼/검증 | zod (API 입력 검증) | 가벼움 |
| 테스트 | (MVP 스킵) | phase9에서 smoke 수준만 |

**Postgres 이행 경로**: `schema.prisma`의 `provider = "sqlite"` → `"postgresql"` 변경 + `DATABASE_URL` 교체 + `prisma migrate reset`. 스키마에서 SQLite 전용 기능(`@db.*`) 사용 금지.

## 1. 데이터 모델 변경

### User
- `id String @id @default(cuid())`
- `email String @unique`
- `name String`
- `createdAt DateTime @default(now())`

### Board
- `id String @id @default(cuid())`
- `slug String @unique` — URL용 human-readable
- `title String`
- `createdAt DateTime @default(now())`

### BoardMember (RBAC 핵심)
- `id String @id @default(cuid())`
- `boardId String` (→ Board)
- `userId String` (→ User)
- `role String` — `"owner" | "editor" | "viewer"` (enum은 SQLite 미지원이라 string + zod 검증)
- `@@unique([boardId, userId])`

### Card
- `id String @id @default(cuid())`
- `boardId String` (→ Board)
- `authorId String` (→ User)
- `title String`
- `content String` — text 본문
- `color String?` — 선택적 카드 배경 힌트 (테마가 override 가능)
- `x Float` — wall 좌표
- `y Float`
- `width Float @default(240)`
- `height Float @default(160)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

**마이그레이션**: `prisma db push`(초기 SQLite)로 충분. 이후 마이그레이션 필요 시 `prisma migrate dev`.

## 2. API 변경

| Method | Path | 권한 | 요청 | 응답 |
|---|---|---|---|---|
| GET | `/api/boards/[id]` | viewer+ | - | `{ board, cards, members, currentUserRole }` |
| POST | `/api/cards` | editor+ | `{ boardId, title, content, x, y }` | `{ card }` |
| PATCH | `/api/cards/[id]` | editor+ | `{ x?, y?, title?, content? }` | `{ card }` |
| DELETE | `/api/cards/[id]` | owner 또는 author 본인 | - | `{ ok: true }` |

실시간 이벤트: **없음** (out of scope)

## 3. 컴포넌트 변경

```
src/app/
├── layout.tsx               # HTML skeleton, 폰트 로드
├── page.tsx                 # landing, /board/demo 로 redirect
├── board/[id]/page.tsx      # server component, 데이터 fetch → BoardCanvas 렌더
├── api/boards/[id]/route.ts
├── api/cards/route.ts
└── api/cards/[id]/route.ts

src/components/
├── BoardCanvas.tsx          # client component, dnd-kit 래퍼
├── Card.tsx                 # client, 개별 카드
├── ThemeSwitcher.tsx        # client, ?theme 링크 버튼 3개
├── UserSwitcher.tsx         # client, ?as 링크 버튼 3개
└── AddCardButton.tsx        # client, editor+ 만 노출

src/lib/
├── db.ts                    # Prisma client 싱글톤
├── auth.ts                  # getCurrentUser (쿠키/쿼리 기반 mock)
├── rbac.ts                  # requirePermission helper
└── theme.ts                 # 테마 이름 검증
```

상태 위치:
- 서버: 카드 목록, 사용자 역할, 보드 메타 — board page 서버 컴포넌트에서 fetch
- 클라이언트: 드래그 중 임시 position, 낙관적 업데이트 — `useOptimistic` 또는 local state
- URL: 테마 선택, mock user — search params

## 4. 데이터 흐름 다이어그램

```
사용자 → /board/demo?theme=miro&as=editor
   │
   ▼
layout.tsx (theme CSS 변수 주입: searchParams.theme)
   │
   ▼
board/[id]/page.tsx (server)
   │   ├─ getCurrentUser() ← 쿠키/쿼리의 ?as
   │   ├─ fetchBoard(id) ← Prisma
   │   └─ requirePermission(boardId, userId, "view") ← RBAC
   │
   ▼
<BoardCanvas cards={...} role={...} /> (client)
   │
   ├─ drag → useOptimistic(cards) 즉시 업데이트
   ├─ drop → PATCH /api/cards/:id
   │         └─ route handler → requirePermission("edit") → prisma.card.update
   │
   └─ 새 카드 → POST /api/cards → 같은 흐름
```

## 5. 엣지케이스 (최소 5개)

1. **권한 없는 사용자의 API 호출** — 403 + 명확한 에러 메시지
2. **삭제된 보드 접근** — 404
3. **카드 position이 음수 / 화면 밖** — 서버는 허용 (자유 캔버스), 클라이언트는 drop 시 min/max 클램프
4. **동시 편집 충돌** — 이번 MVP에서는 last-write-wins (실시간 out of scope)
5. **빈 보드** — 안내 메시지 + 카드 추가 버튼 (editor+ 만)
6. **잘못된 `?theme=` 값** — `theme.ts`에서 검증, 기본값은 `notion`
7. **잘못된 `?as=` 값** — `auth.ts`에서 owner로 폴백 (dev only)
8. **dnd-kit SSR 이슈** — BoardCanvas는 `"use client"`, 서버는 초기 데이터만

## 6. DX 영향

- 새 의존성: `next`, `react`, `prisma`, `@prisma/client`, `@dnd-kit/core`, `@dnd-kit/sortable`, `tailwindcss`, `zod`, `tsx` (seed 실행)
- `package.json` 스크립트: `dev`, `build`, `start`, `db:push`, `seed`, `db:reset`
- 타입 체크: `tsc --noEmit`
- 린트: ESLint 기본
- 빌드/배포: 로컬만

## 7. 롤백 계획

- **전체 롤백**: 태스크 디렉토리 아티팩트만 남기고 제품 코드 폴더 `src/`, `prisma/`, `package.json`, 설정 파일 전부 삭제. git에 아직 커밋 안 했으므로 `git clean -fd` 가능
- **부분 롤백**: 디자인 결정만 바꾸는 경우 `src/app/globals.css` 의 테마 블록만 교체
- **스택 롤백**: Prisma → Drizzle, SQLite → Postgres 등은 schema.prisma + lib/db.ts + 시드 스크립트만 교체
