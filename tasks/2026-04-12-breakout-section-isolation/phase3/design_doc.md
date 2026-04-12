# Design Doc — breakout-section-isolation

## 0. 스택 확인

기존 스택(`docs/architecture.md` 부재 — 첫 feature는 아님. `package.json` 기준):
- Next.js 16 App Router, React 19, TypeScript, Prisma 6 + PostgreSQL, NextAuth 5 beta.
- 새 의존성 추가 없음.

## 1. 데이터 모델 변경

### 1.1 스키마 변경

```prisma
model Section {
  id          String  @id @default(cuid())
  boardId     String
  title       String
  order       Int     @default(0)
  accessToken String? @unique  // ← 신규

  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards Card[] @relation("SectionCards")

  @@index([boardId])
}
```

### 1.2 마이그레이션 전략

- 명칭: `20260412_add_section_access_token`
- 방식: ADD COLUMN (nullable) + unique partial index (NULL 허용). Postgres는 기본 unique에 NULL 다중 허용.
- 데이터 백필: 없음. 기존 섹션의 토큰은 null이며, 교사가 share UI에서 명시적으로 생성.
- 롤백: `ALTER TABLE "Section" DROP COLUMN "accessToken"`. 데이터 손실 허용 (생성 후 다시 부여 가능).
- 로컬: `npx prisma migrate dev --name add_section_access_token` (force-reset 금지).
- prod: `npx prisma migrate deploy` — phase10 deploy_plan에 기록.

## 2. API 변경

### 2.1 신규: `GET /api/sections/[id]/cards`

```
Request:
  GET /api/sections/:id/cards?token=<accessToken>
Response 200:
  { "cards": Card[] }       // sectionId === :id 인 것만
Response 403:
  { "error": "forbidden" }
Response 404:
  { "error": "not_found" }
```

인가 로직 (`viewSection`):
1. section을 DB에서 로드. 없으면 404.
2. 토큰 제공됐고 section.accessToken === token이면 통과.
3. NextAuth user가 board 멤버면 통과.
4. Student session이 board.classroomId와 일치하면 통과 (token 제공 여부와 무관하게 classroom 경계 안쪽).
5. 그 외 403.

### 2.2 신규: `POST /api/sections/[id]/share`

```
Request: POST /api/sections/:id/share  (no body required)
Response 200:
  {
    "section": { "id", "title", "accessToken" },
    "shareUrl": "/board/<boardId>/s/<sectionId>?token=..."
  }
Response 403: owner 아님.
```

동작: `crypto.randomBytes(32).toString("base64url")` → 새 토큰으로 overwrite. 이전 토큰 무효화.

### 2.3 실시간 이벤트 (helper only)

이번 task에선 helper 정의만:
- `sectionChannelKey(boardId, sectionId)` → `board:${boardId}:section:${sectionId}`
- `boardChannelKey(boardId)` → `board:${boardId}`
- publish/subscribe 구현은 별도 research task로 연기. 문자열 키를 상수처럼 공유해 향후 엔진 전환 시 호출부 수정 최소화.

### 2.4 기존 API 영향

- `POST /api/sections`, `PATCH /api/sections/:id`, `DELETE /api/sections/:id` 시그니처 불변. `accessToken`은 이 엔드포인트로 변경되지 않음 (오직 `/share`).
- `GET /api/cards` 기존 경로 없음(board 카드는 SSR로만 주입), 영향 없음.

## 3. 컴포넌트 변경

```
src/app/
├── board/
│   └── [id]/
│       ├── page.tsx                   # 기존, 변경 없음
│       └── s/
│           └── [sectionId]/
│               ├── page.tsx          # 신규 — Breakout server component
│               └── share/
│                   └── page.tsx      # 신규 — owner share UI (server + client island)
├── api/
│   └── sections/
│       └── [id]/
│           ├── route.ts              # 기존
│           ├── cards/route.ts        # 신규
│           └── share/route.ts        # 신규
src/lib/
├── rbac.ts                           # viewSection(...) 추가
├── realtime.ts                       # 신규
src/components/
└── SectionShareClient.tsx            # 신규 — 토큰 복사/재생성 client island
└── SectionBreakoutView.tsx           # 신규 — 섹션 전용 카드 리스트 뷰 (서버에서 쿼리 후 전달)
```

상태 위치:
- 카드 목록: server component가 쿼리 → HTML에 직접 렌더 (hydration 없음).
- 섹션 share UI: 토큰 복사 상태는 client (SectionShareClient), 토큰 값은 서버에서 주입.

## 4. 데이터 흐름 다이어그램

```
[브라우저] ── GET /board/:id/s/:sid?token=xxx ──▶ [Next Server]
                                                    │
                                                    │ 1. auth 3종(NextAuth + student + mockRole)
                                                    │ 2. viewSection(userId, sid, token) — ForbiddenError if deny
                                                    │ 3. db.card.findMany({ sectionId: sid })  ← board-wide 쿼리 금지
                                                    │ 4. HTML render (only section cards)
                                                    ▼
                                                 [Client]
                                                 ─ 카드 리스트 읽기 전용
                                                 ─ (future) subscribe(sectionChannelKey())

[owner] ── POST /api/sections/:sid/share ──▶ [Server]
                                             ├─ requirePermission(owner)
                                             ├─ randomBytes(32).toString("base64url")
                                             ├─ db.section.update({ accessToken })
                                             └─ { shareUrl }
```

## 5. 엣지케이스

1. **토큰 회전 중 기존 링크 사용**: 새 POST /share 호출 직후 기존 링크는 403이 되어야 한다. 단순 `accessToken` 교체 → DB compare 시 자동으로 실패.
2. **sectionId가 boardId에 속하지 않음**: URL `/board/:bid/s/:sid`에서 section.boardId !== bid이면 notFound.
3. **비로그인 + 잘못된 토큰**: 403. 사용자 친화 메시지(브레이크아웃 접근 불가). server component에서 render.
4. **학생 세션 있음 + 토큰 없음**: student.classroomId === board.classroomId면 통과(학생이 정상 교실 소속). 아니면 403.
5. **network 단절(클라이언트 side)**: 현재 MVP엔 realtime 연결이 없으므로 HTTP 단발 요청만 → 일반 네트워크 에러. share 페이지는 토큰 복사만 제공하므로 영향 미미.
6. **섹션 삭제 동시성**: share POST와 section DELETE 경합 → FK `SetNull`이 아닌 `Cascade`로 cards 전파. share API는 `findUnique` 후 update이므로 race 시 `P2025` → 500 대신 404로 변환.
7. **토큰 길이/생성 실패**: `crypto.randomBytes`는 Node 내장. 실패 시 500.
8. **유저가 URL에 토큰 포함한 상태로 히스토리 누출**: MVP 한계로 문서화. 후속에 fragment 옮기거나 Cookie 교환 고려.

## 6. DX 영향

- Prisma client 재생성 필요: `npx prisma generate`. CI에는 `postinstall`이 이미 수행.
- TypeScript: Section 타입에 `accessToken: string | null` 추가 — 기존 호출부에서 접근 안 하므로 회귀 없음.
- 테스트: `src/lib/__tests__/`에 realtime helper + rbac viewSection 단위 테스트 추가.
- 빌드 영향: 라우트 파일 3개 추가, 컴포넌트 2개. 번들 사이즈 영향 미미(server components).

## 7. 롤백 계획

1. 새 라우트 파일 삭제: `src/app/board/[id]/s`, `src/app/api/sections/[id]/cards`, `src/app/api/sections/[id]/share`.
2. lib/realtime.ts 삭제, lib/rbac.ts에서 viewSection 제거.
3. Prisma 다운 마이그레이션 수동: `ALTER TABLE "Section" DROP COLUMN "accessToken";`
4. `prisma migrate resolve --rolled-back 20260412_add_section_access_token` — 이미 실행됐다면.
5. `/board/[id]/s/...` 과거 링크는 404. 영구 리다이렉트 미설정(MVP).
