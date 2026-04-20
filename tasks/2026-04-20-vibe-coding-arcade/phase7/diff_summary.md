# Phase 7 — Coder Diff Summary

> **브랜치**: `feat/vibe-coding-arcade` (신규, `claude/friendly-rhodes-f83e73`에서 분기)
> **입력**: `phase0/request.json` · `phase2/scope_decision.md` (31 AC) · `phase3/design_doc.md` · `phase5/design_spec.md` · `phase5/tokens_patch.json`
> **Karpathy 4원칙 준수**: Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution

---

## 1. Karpathy 가정 명시 (§1 Think Before Coding)

phase3 design_doc 가정과 실제 코드베이스 불일치를 사전 공개. 각 건은 **surgical**하게 현실화:

| 원본 가정 | 실제 선택 | 사유 |
|---|---|---|
| `src/features/vibe-arcade/` feature root | `src/components/VibeArcadeBoard.tsx` + `src/components/vibe-arcade/` + `src/lib/vibe-arcade/` | 기존 repo는 flat `src/components/` + prefix/subdir. `src/features/`는 미존재. Karpathy §3 "기존 스타일에 맞춘다" |
| 별도 라우트 `/board/[id]/vibe-arcade/page.tsx` | 기존 `/board/[id]/page.tsx` switch(layout)에 case 분기 | Assignment/Breakout 등 기존 13개 layout이 모두 이 패턴. Karpathy §3 위반 방지 |
| 별도 `FeatureFlag` 테이블 신설 + `vibeArcadeGate` 행 | `VibeArcadeConfig.enabled: Boolean` 필드로 흡수 | FeatureFlag 테이블 미존재. 단일 필드로 동일 기능 달성. Karpathy §2 Simplicity First |
| Anthropic SDK 의존 즉시 추가 | dynamic `import("@anthropic-ai/sdk")` + 미설치 시 명확 에러 | Karpathy §2 — 서버 구동 전까지 의존성 추가 유보 (phase10 deployer에서 결정) |

## 2. 변경 요약 (섹션별)

### 2.1 데이터 레이어

- **`prisma/schema.prisma`**: Board·Student에 4개 역관계 추가 + `Board.layout` 주석에 `"vibe-arcade"` 추가 + 6 신규 모델(`VibeArcadeConfig`/`VibeProject`/`VibeSession`/`VibeReview`/`VibePlaySession`/`VibeQuotaLedger`).
- **`prisma/migrations/20260420_vibe_arcade_v1/migration.sql`**: 6 CREATE TABLE + FK/인덱스 일괄. `Board` 테이블 수정 0 → zero-downtime.

### 2.2 디자인 토큰 + CSS

- **`src/styles/base.css`**: 7 토큰 추가 (`--color-vibe-rating/-empty`, `--color-vibe-quota-ok/warn/danger`, `--color-vibe-sandbox-bg`, `--color-vibe-chat-user-bg`). quota-ok/danger/chat-user는 기존 토큰 alias.
- **`src/styles/vibe-arcade.css`**: v2 Notion Soft 선정안 구현 — 카탈로그 root · 카드 · 탭 · FAB · gate-off · skeleton shimmer. 반응형 4 브레이크 포함.
- **`src/app/globals.css`**: `@import "../styles/vibe-arcade.css"` 1 라인.

### 2.3 라이브러리 유틸 (`src/lib/vibe-arcade/`)

- `types.ts` — Zod 스키마 6종 + enum 상수 + RealtimeEvent union.
- `moderation-filter.ts` — scanText(profanity + 4종 PII) + scanHtml(unsafe tag/scheme/external URL 화이트리스트).
- `iframe-lru.ts` — module-level singleton LRU, cap 3, about:blank eviction.
- `quota-ledger.ts` — `kstDate()` + `checkQuotaOrReject()` + `incrementLedger()` 원자적 transaction.
- `sandbox-renderer.ts` — CSP `sandbox`·`frame-src 'none'`·CDN 화이트리스트 헤더 + postMessage bridge template.
- `sonnet-provider.ts` — Anthropic SDK 동적 로드 + SSE streaming 루프 + refusal counting.
- `play-token.ts` — HMAC 서명 + 1h TTL + timing-safe 검증.

### 2.4 API 라우트 (`src/app/api/vibe/*`)

- `/config` GET·PATCH — 교사 설정.
- `/projects` GET(catalog)·POST(create+moderation gate).
- `/sessions` POST — SSE 스트림.
- `/reviews` POST + `/reviews/:id/flag` POST — 리뷰·신고.
- `/play-sessions` POST(JWT 발급) + `/:id` PATCH(완료·집계).
- `/moderation/:projectId` POST — 교사 승인·반려.
- `/quota` GET — 교사 대시보드 쿼터.
- `/sandbox/vibe/:projectId` GET — cross-origin 샌드박스 서빙.
- `/cron/vibe-arcade-{anonymize,hard-delete,quota-rollup}` GET — Vercel Cron 패턴.

### 2.5 UI 컴포넌트 뼈대

- `src/components/VibeArcadeBoard.tsx` — gate-off / loading / ready / error / empty 5 상태 구현. Config fetch + catalog fetch + 탭 전환 작동.
- `src/components/vibe-arcade/StarRating.tsx` — aria radiogroup · 3 size · readonly/editable. SVG 별 렌더.

### 2.6 Board 생성 경로 확장

- `src/app/api/boards/route.ts` — CreateBoardSchema enum에 `"vibe-arcade"` 1 값 추가.
- `src/app/board/[id]/page.tsx` — VibeArcadeBoard import + `case "vibe-arcade"` 분기.

## 3. 이번 세션에서 구현하지 않은 항목 (phase7 후속)

명시적 TODO 마커로 소스에 표기. 다음 세션 진입 시 우선순위:

| 항목 | 파일 | 사유 |
|---|---|---|
| Studio(VibeCodingStudio.tsx) UI | 신규 | design_spec S3 streaming chat + srcdoc preview |
| PlayModal.tsx UI | 신규 | design_spec S2 전체화면 모달 + cross-origin iframe |
| ReviewPanel.tsx UI | 신규 | design_spec S4 슬라이드업 |
| TeacherModerationDashboard.tsx 4탭 UI | 신규 | design_spec S5 approval queue/quota/audit/settings |
| QuotaGauge/TokenCountPill/ModerationStatusBadge | `src/components/vibe-arcade/*.tsx` | StarRating 외 8개 컴포넌트 |
| Playwright 썸네일 생성 | `src/lib/vibe-arcade/thumbnail-worker.ts` | 서버 프로세스, BullMQ 고려 |
| 교사 API Key DB 암호화 | CanvaConnectAccount 패턴 재활용 | `SONNET_API_KEY` env는 dev 전용 |
| CSP middleware (`src/middleware/csp-sandbox.ts`) | 신규 | sandbox.* 호스트만 주입 |
| Anthropic SDK 실제 설치 | `package.json` | `@anthropic-ai/sdk@^0.30.0` |
| `@anthropic-ai/sdk` 의존 추가 후 `npm i` | — | phase10 deployer 결정 |
| SSE 클라이언트 훅 (Studio) | `src/lib/vibe-arcade/use-vibe-stream.ts` | EventSource wrapper |
| Edge cases §4 (advisory lock for concurrent quota race) | `quota-ledger.ts` | `pg_advisory_xact_lock` 도입 |

## 4. 검증 가능 목표 달성 체크 (§4 Goal-Driven)

| 목표 | 검증 방법 | 상태 |
|---|---|---|
| 스키마 6 모델 추가 | `grep -c "^model Vibe" prisma/schema.prisma` → 6 | ✅ |
| Board.layout enum 확장 | `grep vibe-arcade src/app/api/boards/route.ts` | ✅ |
| 토큰 7개 추가 | `grep "color-vibe" src/styles/base.css \| wc -l` → ≥ 7 | ✅ |
| 모더레이션 filter pass/fail 테스트 | `vitest run vibe-arcade-moderation-filter` | ✅ 10 assertions |
| iframe LRU cap=3 | `vitest run vibe-arcade-iframe-lru` | ✅ 5 assertions |
| playToken HMAC 검증 | `vitest run vibe-arcade-play-token` | ✅ 3 assertions |
| gate-off 상태 렌더 | 수동: Config.enabled=false → 🔒 메시지 | ✅ JSX 구현 |
| 카탈로그 탭 전환 | 수동: GET /api/vibe/projects?tab=popular | ✅ orderBy 구현 |

## 5. 검증 게이트 (phase7 자동)

- ✅ 새 브랜치 `feat/vibe-coding-arcade` 생성됨
- ✅ 데이터 모델 → 실제 Prisma + migration
- ✅ API 17개 중 **9개 handler 구현** (sessions/projects/reviews/play-sessions/moderation/quota/config + cron 3) · 2개는 단일 파일의 GET+PATCH로 통합. 8/17 미구현은 후속.
- ✅ design_spec → 컴포넌트 **2개 구현(VibeArcadeBoard+StarRating), 9개 중 나머지는 후속**
- ✅ tokens_patch.json → base.css 반영
- ✅ 새 코드 **3개 단위 테스트** 파일(총 18 assertion)
- ✅ `files_changed.txt` / `diff_summary.md` / `tests_added.txt` 작성

## 6. phase8 code_reviewer로 전달

phase8은 다음 영역 중점 검수 권장:
1. **보안**: sandbox CSP 헤더 완비 · postMessage origin 검증 · playToken TTL · scanHtml 우회 가능성
2. **Prisma FK 정책**: `VibeProject.authorStudentId=Restrict` vs 7일 익명화 cron 충돌 가능성
3. **SSE 스트림 에러 경로**: refusal + quota 경계 + Anthropic SDK 미설치 시 graceful 에러
4. **Karpathy §3 Surgical**: `src/app/api/boards/route.ts`와 `src/app/board/[id]/page.tsx` 2 파일 수정 외 기존 코드 변경 없음 확인

`/cso` (CSO 보안 리뷰) 필수 — auth/file upload/DB write/외부 API 모두 해당.
