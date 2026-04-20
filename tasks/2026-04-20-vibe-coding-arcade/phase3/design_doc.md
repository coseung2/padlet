# Design Doc — vibe-coding-arcade

> **입력**: `phase0/request.json` + `phase2/scope_decision.md` + `docs/architecture.md` + `INBOX/2026-04-20-vibe-coding-arcade/seed.yaml` (ontology_schema SSOT)
> **원칙**: 기존 `docs/architecture.md` 스택(Next.js 16 / Prisma 6 / NextAuth 5 / Supabase) 승계. 실제 코드 작성 금지 — 의사코드/스키마만.

---

## 1. 데이터 모델 변경

### 1.1 신규 엔티티 6종

> Prisma 원문은 `INBOX/.../seed.yaml` `ontology_schema.new_entities` 참조(복붙 가능). 여기에는 설계 의도·인덱스·on-delete 정책만 명시.

| Model | PK/Unique | 핵심 FK (on-delete) | 주요 인덱스 |
|---|---|---|---|
| `VibeArcadeConfig` | `boardId` (1:1 `Board`) | `Board` (Cascade) | — |
| `VibeProject` | `id` cuid | `Board` (Cascade) · `Student` (Restrict, 저자 보존) | `(boardId, moderationStatus)`, `(classroomId, moderationStatus, createdAt)`, `(authorStudentId)` |
| `VibeSession` | `id` cuid | `VibeProject` (SetNull) · `Student` (Cascade) | `(projectId)`, `(studentId, startedAt)`, `(classroomId, startedAt)` |
| `VibeReview` | `id` cuid + `@@unique([projectId, reviewerStudentId])` | `VibeProject` (Cascade) · `Student` (Cascade) | `(projectId)`, `(reviewerStudentId)` |
| `VibePlaySession` | `id` cuid | `VibeProject` (Cascade) · `Student` (Cascade) | `(projectId, startedAt)`, `(studentId, startedAt)` |
| `VibeQuotaLedger` | `@@unique([classroomId, studentId, date])` | classroomId 비정규화 (FK 없음) | `(classroomId, date)`, `(studentId, date)` |

**설계 노트**

- `VibeArcadeConfig`는 `Board` 1:1 분리 — Board 테이블 bloat 회피(Seed 11은 Board에 3필드 얹었지만 본 시드는 분리. 6필드 이상이라 분리 효율 우세)
- `VibeProject.authorStudentId` on-delete **Restrict** — 학생 삭제 시 작품 보존(교사 감사 요구). 대신 `7일 미활성 익명화 cron`이 `VibeSession`·`VibeReview`의 `studentId`를 null로 전환하나, Restrict된 `VibeProject`는 별도 anonymize 처리(authorStudentId 유지하되 Student 삭제 전에 project `archived` 상태로 전환하는 pre-check 필요)
- `VibeProject.classroomId` 비정규화 — 학급 스코프 카탈로그 쿼리가 hot path. `Board → Classroom` JOIN 대신 인덱스된 비정규화 필드 직접 hit
- `VibeReview.flagCount ≥ 3` → `moderationStatus="hidden_by_teacher"` 자동 전환은 DB 트리거 아닌 application 레벨(API handler)에서 처리 (테스트 용이성)
- `VibeQuotaLedger`는 classroomId 비정규화 FK 없음 — 학급 삭제 시 rollup 원장 보존(감사). 수동 cleanup은 운영 의사결정

### 1.2 수정 엔티티

- **`Board.layout`**: 주석 enum 문자열에 `"vibe-arcade"` 추가. 기존 11개 값(freeform/grid/stream/columns/assignment/quiz/plant-roadmap/event-signup/drawing/breakout/assessment) 유지. 관계 역참조 `vibeArcadeConfig VibeArcadeConfig?` + `vibeProjects VibeProject[]` 추가
- **`Student`**: 역관계 4개 추가 — `vibeProjectsAuthored`(VibeProjectAuthor) / `vibeSessions`(VibeSessionAuthor) / `vibeReviews`(VibeReviewer) / `vibePlaySessions`(VibePlayer). 신규 필드 0
- **`FeatureFlag`**: 신규 행 `vibeArcadeGate` (기존 FeatureFlag 테이블 존재 전제. 없으면 phase3b에서 Seed 11 런칭 플래그 선행 확인)

### 1.3 마이그레이션 전략

**단일 migration**: `prisma/migrations/20260420_vibe_arcade_v1/migration.sql`

- CREATE TABLE 6종 + 인덱스 + FK 일괄
- `Board.layout` enum 문자열 관리 → 애플리케이션 레벨 validation(이미 문자열 타입). 별도 SQL 변경 없음
- `FeatureFlag` 행 INSERT (`vibeArcadeGate = false` 기본)

**안전성**

- 기존 테이블 column 수정 0 (신규 테이블만) → **zero-downtime**
- 롤백 가능(DROP TABLE 6종 + FeatureFlag 행 DELETE)
- Supabase region `ap-northeast-2` — 다른 migration과 섞이지 않도록 단일 task 단일 migration 원칙

**순서**

1. `npx prisma migrate dev --name vibe_arcade_v1` (dev DB)
2. 프로덕션: `npx prisma migrate deploy` (CI에서)
3. `FeatureFlag.vibeArcadeGate=false` 상태에서 배포 → 시연 보드만 flag on → 점진 확대

---

## 2. API 변경

### 2.1 신규 엔드포인트

| Method | Path | Req (요약) | Res (요약) | 권한 |
|---|---|---|---|---|
| POST | `/api/vibe/sessions` | `{boardId, initialPrompt?}` | SSE stream (`data: {delta, tokensIn, tokensOut}`) | Student (classroom scope) + vibeArcadeGate + 쿼터 OK |
| POST | `/api/vibe/sessions/:id/messages` | `{role:"user", content}` | SSE stream | 세션 소유 Student |
| PATCH | `/api/vibe/sessions/:id` | `{status:"completed"\|"abandoned"}` | `{id, status}` | 세션 소유 Student |
| POST | `/api/vibe/projects` | `{boardId, sessionId, title, description?, htmlContent, tags:[tag]}` | `{id, moderationStatus}` | 세션 소유 Student. 서버 HTML 파서 + 개인정보 스캔 통과 필수 |
| GET | `/api/vibe/projects?boardId&sort&tab&tag` | query | `{items:[...], nextCursor}` | Board member + classroom 매칭 |
| PATCH | `/api/vibe/projects/:id` | `{title?, description?, tags?}` | `{id}` | 저자 Student (version+=1) |
| DELETE | `/api/vibe/projects/:id` | — | `{ok}` | 저자 Student or Teacher |
| POST | `/api/vibe/projects/:id/reviews` | `{rating:1..5, comment?}` | `{id}` | Student not author + classroom 매칭 |
| GET | `/api/vibe/projects/:id/reviews` | — | `{items:[...]}` | viewSection 동일 로직 |
| POST | `/api/vibe/reviews/:id/flag` | — | `{flagCount}` | Student (not self-review) |
| POST | `/api/vibe/play-sessions` | `{projectId}` | `{id, playToken}` (JWT 1h) | Student + classroom 매칭 |
| PATCH | `/api/vibe/play-sessions/:id` | `{completed, reportedScore?}` | `{id}` | 세션 소유 Student (서버가 postMessage 검증) |
| POST | `/api/vibe/moderation/:projectId` | `{action:"approve"\|"reject", note?}` | `{moderationStatus}` | Teacher |
| GET | `/api/vibe/quota?classroomId&range=7d` | — | `{pool, used, byStudent:[...]}` | Teacher |
| GET | `/api/vibe/config?boardId` | — | VibeArcadeConfig | Board member |
| PATCH | `/api/vibe/config?boardId` | VibeArcadeConfig subset | updated | Teacher (Board owner/editor) |

**cross-origin 샌드박스 라우트**

- `GET https://sandbox.aura-board.app/vibe/:projectId?pt=<playToken>` — 별도 서브도메인. Next.js route handler `src/app/sandbox/vibe/[projectId]/route.ts`지만 Vercel에서 도메인 별개 매핑. 응답 헤더에 CSP `sandbox`, `frame-src 'none'`, `default-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`

### 2.2 실시간 이벤트

- 채널: `board:${boardId}:vibe-arcade`
- 이벤트 union (`VibeArcadeRealtimeEvent`):
  - `project.created` → 카탈로그 "신작" 배지
  - `project.approved` / `project.rejected` → 승인 배지 전파 < 500ms
  - `project.flagged` → 숨김 상태 전파
  - `review.created` → 카탈로그 ratingAvg 갱신
  - `quota.updated` → 교사 대시보드 게이지 push
- `publish(event)`는 기존 `src/lib/realtime.ts` placeholder 사용 — 엔진 swap 시 본 feature 코드 무영향

### 2.3 LLM Provider 인터페이스

```ts
// src/lib/llm/providers/anthropic-sonnet.ts (의사코드 — 실구현은 phase7)
interface SonnetProvider {
  stream(opts: {
    apiKey: string;            // 교사 계정, DB 암호화 해제 후 주입
    systemPrompt: string;
    messages: ClaudeMessage[];
    studentId: string;
    classroomId: string;
    perStudentDailyTokenCap: number;
    classroomDailyTokenPool: number;
    onDelta: (t: string) => void;
    onTokensUpdate: (inCount: number, outCount: number) => void;
    onRefusal: () => void;
  }): Promise<{stopReason, finalContent}>;

  parseHtml(content: string): {html: string, blacklistHits: string[]};
}
```

- 사용 라이브러리: `@anthropic-ai/sdk` v6+ (messages.stream)
- 서버 프록시 전용 — 클라에서 직접 호출 금지(AC-G4)
- 쿼터 사전 체크는 provider 진입 전 middleware에서 수행(provider 내부는 count만)

---

## 3. 컴포넌트 변경

### 3.1 신규 컴포넌트 트리

```
src/features/vibe-arcade/
├── api/                         (server handlers — route.ts에서 호출)
│   ├── sessions.ts
│   ├── projects.ts
│   ├── reviews.ts
│   ├── play-sessions.ts
│   ├── quota.ts
│   └── moderation.ts
├── components/
│   ├── VibeArcadeBoard.tsx      (server) — 레이아웃 entry. layout="vibe-arcade"일 때 마운트
│   ├── Catalog.tsx              (client) — 카드 그리드, 탭 5종, 태그 필터
│   │   └── CatalogCard.tsx      (client) — 썸네일 img lazy, IntersectionObserver
│   ├── PlayModal.tsx            (client) — 전체화면 모달 + cross-origin iframe (LRU 3)
│   ├── VibeCodingStudio.tsx     (client) — 좌 Sonnet 채팅 / 우 srcdoc 미리보기
│   │   ├── ChatPanel.tsx        (client) — SSE 증분 append (React state 누적 금지 원칙)
│   │   └── PreviewPane.tsx      (client) — iframe srcdoc + postMessage 핸들러
│   ├── ReviewPanel.tsx          (client) — 별점 5 + 댓글 + 신고
│   └── TeacherModerationDashboard.tsx (client) — 4탭 모음
│       ├── ApprovalQueueTab.tsx
│       ├── QuotaStatusTab.tsx
│       ├── PromptAuditTab.tsx
│       └── ConfigTab.tsx
├── lib/
│   ├── sandbox-renderer.ts      — HTML → sandbox.aura-board.app 서빙 템플릿
│   ├── thumbnail-worker.ts      — Playwright headless 160×120 WebP (BullMQ queue)
│   ├── quota-ledger.ts          — 3단 체크 + 증분 + rollup
│   ├── moderation-filter.ts     — 금칙어 regex + privacy.py 재활용 + 블랙리스트 태그 스캔
│   └── iframe-lru.ts            — LRU cap 3 + about:blank 언마운트
└── types.ts

src/lib/llm/providers/anthropic-sonnet.ts   (신규)
src/lib/board/layout-registry.ts             (수정 — "vibe-arcade" 추가)
src/app/board/[id]/vibe-arcade/page.tsx      (신규 — layout 라우트)
src/app/sandbox/vibe/[projectId]/route.ts    (신규 — cross-origin 서빙)
src/middleware/csp-sandbox.ts                (신규 — sandbox.* CSP 주입)
src/features/auth/feature-flags.ts           (수정 — vibeArcadeGate)
cron/vibe-arcade-quota-rollup.ts             (신규)
cron/vibe-arcade-anonymize.ts                (신규)
cron/vibe-arcade-hard-delete.ts              (신규)
```

### 3.2 상태 위치

| 상태 | 위치 | 이유 |
|---|---|---|
| 카탈로그 목록 | **server** (RSC + revalidate) | SEO 불필요, 캐시 가능, 실시간은 이벤트 기반 invalidation |
| Sonnet 대화 스트림 | **client** (SSE consumer) | 증분 append, DOM 직접 조작 권장(React state 누적 금지) |
| iframe LRU | **client** (module-level Map) | 탭 이동 사이 유지 필요 없음 — 페이지 언마운트 시 GC |
| 쿼터 게이지 | **realtime** (`quota.updated` 채널) | 교사 실시간 모니터링 요구 |
| 모더레이션 큐 | **realtime** (`project.created`) + server fetch | 승인 배지 < 500ms 전파 요구 |

---

## 4. 데이터 흐름 다이어그램

### 4.1 학생 제작

```
[Student Browser]
  ↓ (1) POST /api/vibe/sessions  {boardId}
[Next.js Route Handler]
  → check vibeArcadeGate + quota (VibeQuotaLedger today)
  → create VibeSession (status=active)
  → sonnet.stream(apiKey=decrypt(Teacher.sonnetApiKey), ...)
      ↓ SSE: delta → onDelta → response stream chunk
      ↓ onTokensUpdate → VibeQuotaLedger upsert (student + classroom rollup)
[Student Browser] ← SSE deltas → ChatPanel direct DOM append
  ↓ (2) VibeCodingStudio Save → POST /api/vibe/projects {htmlContent, ...}
[Route Handler]
  → moderation-filter.ts: regex 금칙어 + privacy scan + 블랙리스트 태그 스캔
  → (fail) 400 with reasons
  → (pass) INSERT VibeProject (moderationStatus="pending_review") + session.projectId set
  → enqueue thumbnail-worker (Playwright 160×120 WebP) → update VibeProject.thumbnailUrl
  → publish("project.created")
[Catalog realtime consumers] ← project.created → 신작 배지
[Teacher Dashboard] ← project.created → 승인 큐 +1
```

### 4.2 학생 소비·플레이

```
[Student Browser] Catalog → CatalogCard tap
  ↓ (1) POST /api/vibe/play-sessions {projectId}
[Route Handler]
  → check viewSection + classroomId 매칭 + VibeArcadeConfig.crossClassroomVisible
  → INSERT VibePlaySession (startedAt)
  → sign JWT playToken (exp=1h, projectId, playSessionId)
  ← {id, playToken}
  ↓ (2) PlayModal mount iframe
       src=`https://sandbox.aura-board.app/vibe/{projectId}?pt={playToken}`
       sandbox="allow-scripts" (NO allow-same-origin)
[sandbox.aura-board.app route handler]
  → verify JWT(playToken)
  → SELECT VibeProject.htmlContent WHERE id=...
  → response headers: CSP sandbox, frame-src 'none', default-src 'self' https://cdn.jsdelivr.net ...
  → return wrapped HTML
[iframe] → game runs → postMessage({type:"completed", score?})
[parent page] → origin check (sandbox.aura-board.app only) → PATCH /api/vibe/play-sessions/{id}
[Route Handler]
  → UPDATE VibePlaySession (completed=true, endedAt, reportedScore)
  → UPDATE VibeProject.playCount++ (if not dup student: uniquePlayCount++)
  ← {ok}
[PlayModal close] → iframe src="about:blank" → LRU evict
```

### 4.3 리뷰·신고

```
[Student] ReviewPanel submit {rating, comment?}
  ↓ POST /api/vibe/projects/:id/reviews
[Handler]
  → check: not author + classroom 매칭 + no existing review (@@unique)
  → INSERT VibeReview (moderationStatus="visible")
  → regex 욕설 스캔 → match 시 moderationStatus="flagged"
  → UPDATE VibeProject aggregates (reviewCount, ratingAvg)
  → publish("review.created")
[Catalog] ← re-fetch ratingAvg or realtime patch

[Student] report button
  ↓ POST /api/vibe/reviews/:id/flag
[Handler]
  → INCREMENT VibeReview.flagCount
  → if flagCount >= 3 AND moderationStatus="visible" → UPDATE moderationStatus="hidden_by_teacher"
  ← {flagCount}
```

### 4.4 쿼터 rollup (cron 00:10 KST)

```
[Cron] vibe-arcade-quota-rollup
  → FOR each (classroomId, studentId, date=yesterday)
      SUM VibeSession.tokensIn/Out where startedAt in yesterday
      UPSERT VibeQuotaLedger
  → FOR each classroomId WHERE crossClassroomVisible=true:
      UPSERT VibeQuotaLedger (studentId=null, classroom 합계)
```

---

## 5. 엣지케이스 (9)

1. **쿼터 경계 중 동시 세션 생성** — 학급 풀 잔량 5K에서 학생 2명 동시 세션 시작 → advisory lock (`pg_advisory_xact_lock(classroomId hash)`) + ledger 원자적 증분. 초과 감지 시 `session.status="failed"` + 원복 + "내일 다시" 모달
2. **Playwright 썸네일 실패** — headless 크래시 · 스크린샷 timeout → thumbnailUrl=null로 게시 허용, 카탈로그는 placeholder SVG. 백그라운드 재시도 cron 3회 후 포기
3. **postMessage spoofing** — 악성 외부 페이지가 부모 origin으로 위장 시도 → event.origin === "https://sandbox.aura-board.app" 정확 매칭 검증 + playToken JWT 서명 검증 이중 방어 (AC-N9 unit test)
4. **교사 API Key 만료** — Sonnet provider 401 수신 → 세션 failed + Slack 경보 + 교사 대시보드 상단 배너 "API Key 갱신 필요". 새 세션 생성 차단 (기존 세션은 graceful fail)
5. **Sonnet refusal 루프** — 학생이 금지 주제 반복 시도 → `refusalCount ≥ 3` 시 세션 status="failed" + "다른 주제로 다시" 모달. 교사 프롬프트 감사 탭 flag
6. **학생 1인 1리뷰 race** — 동시에 2회 submit → `@@unique([projectId, reviewerStudentId])` unique violation → 409 Conflict + "이미 리뷰 작성됨" 안내
7. **Board.layout 전환** — 기존 `freeform` 보드 → `vibe-arcade` 전환 요청 → 기존 `Card`는 유지(아카이브), vibeArcadeConfig 신규 생성, 카탈로그는 비어있음 상태로 진입. v1은 `vibe-arcade` → 다른 layout 전환 **금지**(VibeProject 참조 무결성)
8. **모달 닫히기 직전 postMessage** — iframe unmount race 중 "completed" 수신 → `beforeunload` 대신 PATCH 요청을 `navigator.sendBeacon()` fallback으로 처리
9. **cross-origin 서브도메인 DNS 미설정** — 배포 단계에서 `sandbox.aura-board.app` DNS A/CNAME 누락 → playModal iframe 로드 실패 → 카탈로그에서 플레이 비활성 + 교사 대시보드 상단 배너. deployer phase10에서 DNS 검증 체크리스트 필수

---

## 6. DX 영향

### 6.1 타입·린트

- `prisma generate` 후 `@prisma/client` 6종 타입 노출
- `src/features/vibe-arcade/types.ts` — API req/res Zod 스키마 + union `VibeArcadeRealtimeEvent`
- 기존 `RealtimeEvent` union에 vibe 이벤트 5종 추가 (breaking change 없음, union 확장)
- ESLint — `src/features/vibe-arcade/**` 에서 `dangerouslySetInnerHTML` 허용(VibeCodingStudio srcdoc 미리보기만). 다른 경로는 금지 유지

### 6.2 테스트

- 단위 (vitest):
  - `sandbox-renderer.ts` — CSP 헤더 구성
  - `moderation-filter.ts` — 금칙어·privacy regex 매치
  - `iframe-lru.ts` — 3개 cap + evict
  - `quota-ledger.ts` — 3단 체크 + advisory lock
  - postMessage origin 검증 (AC-N9)
  - `document.cookie` empty string (AC-N8)
- 통합:
  - `/api/vibe/sessions` SSE 스트림 + 쿼터 증분
  - `/api/vibe/projects` 파서 + 썸네일 enqueue + moderation
  - `/sandbox/vibe/:id` CSP 헤더 + 인증
- E2E (Playwright — phase9):
  - 학생 제작 → 교사 승인 → 다른 학생 플레이 + 리뷰 full flow
  - 카탈로그 TTI < 3s (탭 S6 Lite emulation)
  - 쿠키 탈취 불가 + 외부 도메인 로드 차단

### 6.3 빌드·배포

- `sandbox.aura-board.app` 서브도메인 — Vercel project에 도메인 추가 + Next.js `rewrites` 대신 별도 route group (`src/app/sandbox/`)으로 분리. **프로덕션 DNS 선행 필수**
- `.env` 추가:
  - `SONNET_API_KEY_ENC_KEY` (교사 API Key 암호화 마스터 키)
  - `SANDBOX_ORIGIN=https://sandbox.aura-board.app`
  - `PLAYTOKEN_JWT_SECRET`
- Cron 3종 — Vercel Cron Jobs or pg_cron 선택은 phase10 deployer. 본 아키텍처는 Cron interface 독립
- Playwright headless 런타임 — Vercel Functions 메모리·실행시간 제약 확인 필요(썸네일 생성은 300s 타임아웃 내 여유). 부하 시 BullMQ + 별도 worker 프로세스 이관 고려

---

## 7. 롤백 계획

### 7.1 Feature Flag 즉시 롤백

- `FeatureFlag.vibeArcadeGate = false` → 모든 `Board.layout="vibe-arcade"` 보드는 "준비 중" 안내로 전환
- 기존 데이터 보존 (VibeProject 등 조회 불가)
- 소요: < 1분 (DB update 단일 쿼리)

### 7.2 Layout 전환 롤백

- 영향 받는 Board를 기존 layout으로 되돌리기 (`Board.layout="freeform"` 등)
- VibeProject 데이터 보존. FeatureFlag off와 동일 효과

### 7.3 스키마 롤백

- `prisma/migrations/20260420_vibe_arcade_v1/down.sql` (수동 준비):
  - DROP TABLE VibeQuotaLedger, VibePlaySession, VibeReview, VibeSession, VibeProject, VibeArcadeConfig (FK 역순)
  - DELETE FROM FeatureFlag WHERE key='vibeArcadeGate'
- 데이터 손실 경고 — 프로덕션 사용 기간 > 0이면 쿼터 원장·리뷰 원본 모두 소실. **스키마 롤백은 시연 단계(production 사용자 0)에서만 수행**

### 7.4 cross-origin 서브도메인 롤백

- DNS: `sandbox.aura-board.app` CNAME 제거 → 기존 플레이 iframe 전부 로드 실패. FeatureFlag off 선행 필수

### 7.5 롤백 순서

1. FeatureFlag off
2. 24h 관찰 (사용자 영향 확인)
3. 필요 시 layout 변경
4. 2주 관찰 후에만 schema 롤백 (데이터 영구 손실)

---

## 8. 자동 검증 게이트 통과 조건

- ✅ 데이터 모델 (엔티티 6 + 수정 3 + 마이그레이션 전략)
- ✅ API 명세 (신규 17 엔드포인트 + 1 cross-origin + 실시간 이벤트 5종 + Provider 인터페이스)
- ✅ 컴포넌트 트리 + 상태 위치 매트릭스
- ✅ 데이터 흐름 다이어그램 4종 (제작·소비·리뷰·cron)
- ✅ 엣지케이스 9개 (≥ 5 요구)
- ✅ DX 영향 (타입·테스트·빌드·배포)
- ✅ 롤백 계획 4단계 + 순서 명시
- ✅ TODO/TBD 0

→ phase3 검증 PASS. phase4(design_planner) 진입 가능.
