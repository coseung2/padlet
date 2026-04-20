# Deploy Log — vibe-coding-arcade

> **브랜치**: `feat/vibe-coding-arcade` · HEAD `476dab8` (9 커밋, 2026-04-20)
> **원격**: `git@github.com:coseung2/padlet.git` — 푸시 완료 (`* [new branch]`)

---

## 1. PR 정보

- **푸시**: 2026-04-20 완료. `feat/vibe-coding-arcade → origin/feat/vibe-coding-arcade`
- **PR 생성 URL**: <https://github.com/coseung2/padlet/pull/new/feat/vibe-coding-arcade>
- **PR 제목 제안**: `feat(vibe-arcade): 학급 Steam — Seed 13 v1 (backend + 카탈로그 뼈대)`
- **PR 본문 제안**:

  ```markdown
  ## Summary
  - `Board.layout="vibe-arcade"` 신규 레이아웃. Seed 13 v1.
  - Prisma 6 엔티티 추가 + 마이그레이션, Sonnet SSE · 모더레이션 · 쿼터 · cross-origin sandbox · Cron 3개.
  - Notion Soft UI — gate-off / catalog empty 상태 2종 렌더 확인.
  - **UI 8종 미구현** (Studio · PlayModal · Review · Teacher Dashboard 등) → phase7 후속 세션에서 이어감.
  - 프로덕션 배포 전 차단 5건 (SEC-1~6) — phase10 §5 체크리스트 참조.

  ## Test plan
  - [x] `npm run typecheck` 0 errors
  - [x] `npm test vibe-arcade` 18/18 PASS
  - [x] 로컬 dev smoke (Notion Soft 렌더 + 9 API 응답 확인)
  - [ ] Vercel preview 배포 자동 트리거 확인
  - [ ] SEC-1~6 프로덕션 차단 항목 체크리스트 완료
  - [ ] 후속 세션에서 phase7 UI 8종 착수

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

**수동 작업 필요**: `gh` CLI 미설치로 PR 자동 생성 불가. 사용자가 위 URL 방문하여 수동 생성.

---

## 2. CI 결과 (로컬 사전 검증)

| 검증 | 결과 | 근거 |
|---|---|---|
| `npm run typecheck` | ✅ 0 errors | phase9 실행 로그 |
| `npm test` (vibe-arcade 필터) | ✅ 18/18 passed (1.57s) | phase9 `qa_report.md §3.1` |
| `npm run build` | ⚠ 로컬 미시도 | `prisma migrate deploy && next build` — Supabase 프로덕션 DB 접근 필요. Vercel 빌드 위임. |
| ESLint | ⚠ 로컬 미시도 | phase11 doc_syncer 진입 전 실행 권장 |

**CI 파이프라인**: Vercel 자동 — 푸시 직후 preview deployment trigger 예정.

---

## 3. 배포 대상

### 3.1 Preview 배포 (자동 — ❌ ERROR, 재배포 대기)

- **트리거**: GitHub 푸시 → Vercel `dpl_EK8HSEqRbRJiSvMDoBnQg7DRk9e8`
- **URL**: `aura-board-q84ya15hi-mallagaenge-1872s-projects.vercel.app` (접근 불가)
- **상태**: **ERROR** — `prisma migrate deploy` 실행 시 P1012 schema validation 실패
- **실제 에러**:

  ```
  Error: Prisma schema validation - (get-config wasm)
  Error code: P1012
  error: Environment variable not found: DIRECT_URL.
     -->  prisma/schema.prisma:15
  14 |   url       = env("DATABASE_URL")
  15 |   directUrl = env("DIRECT_URL")
  Error: Command "npm run build" exited with 1
  ```

- **원인 분석**: Vercel **Preview 환경에 `DIRECT_URL` 환경변수가 미설정**.
  - Production 환경은 설정되어 있음 → `main` 브랜치 최근 빌드(`dpl_AnqPeuHNgU6GvMfxwhVYAEX8EcMt`, state `READY`)는 정상
  - `feat/vibe-coding-arcade` preview가 첫 non-production 빌드라 이 갭이 드러남
  - **vibe-arcade 변경과 무관** — 기존 Prisma datasource 블록이 그대로이기 때문
- **해결 방법 (사용자 수동 1건)**:

  **Vercel Dashboard** → Project `aura-board` → Settings → Environment Variables:
  - `DIRECT_URL` 값을 추가 · Scope 체크 `[x] Preview` (+ Development 선택적)
  - 값은 Production의 `DIRECT_URL`과 동일(Supabase ap-northeast-2 pooled connection의 direct 접속 URL) 또는 `DATABASE_URL`과 같은 값 허용 (Prisma는 migration에서 direct connection 선호하나 pooled도 동작)
  - 저장 후 Vercel이 자동 재배포 트리거하지 않을 수 있음 → Deployments 탭에서 **Redeploy** 클릭 또는 `feat/vibe-coding-arcade`에 dummy 커밋 push

- **phase10 내부에서 해결 불가 사유**: Vercel MCP(`mcp__...`) 도구 집합에 `env add` 명령 없음. Vercel CLI 또한 미설치.

- **환경변수 SEC-6 체크** (DIRECT_URL 수정과 함께 Preview에 추가 권장):
  - `PLAYTOKEN_JWT_SECRET` (32자 이상 랜덤) — 없으면 `/sandbox/vibe/...` play-token 발급 불가
  - `SONNET_API_KEY` (교사 실키 또는 dev dummy) — 없으면 `/api/vibe/sessions` 500
  - `NEXT_PUBLIC_APP_ORIGIN` — sandbox-renderer의 postMessage bridge 부모 origin
  - `CRON_SECRET` — cron route authorize (Preview에선 없어도 NODE_ENV=production 이니 `x-vercel-cron` 헤더로 자동 통과)

- **DNS**: `sandbox.aura-board.app` Preview 별칭은 설정 생략 가능. FeatureFlag off 유지 시 영향 없음.

### 3.2 Production 배포 (조건부 보류)

SEC-1~6 체크리스트 모두 완료되기 전 `VibeArcadeConfig.enabled=false` 고정 + `main` 머지 보류 권장.

**대안**: `feat/vibe-coding-arcade` → `main` 머지는 허용하되, 프로덕션 `.env`·DNS 준비 완료 후에만 각 보드별 `enabled=true` 수동 토글.

---

## 4. 프로덕션 검증 (미수행 — 배포 후 수동 진행)

`phase9/perf_baseline.json` 대비 회귀 확인 항목:

- [ ] `/` (홈 · 로그인 리다이렉트) 307 유지
- [ ] `/board/<기존 보드 id>` — 기존 layout(freeform·assignment 등) 회귀 없음
- [ ] `/api/boards` POST — 기존 10 layout + 신규 "vibe-arcade" 모두 정상
- [ ] `/api/vibe/config?boardId=<production board>` → 200 or 404 (기존 동작)
- [ ] `/sandbox/vibe/<projectId>` — DNS 설정 후 별칭 진입 시 CSP 헤더 확인
- [ ] Sentry / Vercel Logs — 500 에러 급증 없음 (phase8 `security_audit.md §SEC-3 Slack 경보` 연동 후)

**측정 비교**:

| 지표 | phase9 baseline | 프로덕션 목표 |
|---|---|---|
| Cold start | 484ms (dev) | < 1s (Vercel Functions Fluid Compute) |
| `/board/[id]` 첫 렌더 | < 1s (dev) | < 3s (AC-N1) |
| API 평균 응답 | 150ms (dev) | < 250ms |

---

## 5. Production 배포 전 차단 체크리스트 (SEC-1~6)

phase8 `security_audit.md`에서 식별한 프로덕션 전제 조건. **전부 해결 전까지 FeatureFlag off 유지**.

| # | 항목 | 완료? | 담당 |
|---|---|---|---|
| SEC-1 | 교사 `SONNET_API_KEY` DB 암호화 저장 (CanvaConnectAccount 패턴) | ⬜ | 후속 phase7 세션 |
| SEC-2 | 학생별 rate limit (`@upstash/ratelimit` 연결) | ⬜ | 후속 phase7 세션 |
| SEC-3 | 일일 비정상 소비 Slack 경보 webhook | ⬜ | 후속 phase7 세션 |
| SEC-4 | iframe postMessage origin 검증 (PlayModal 컴포넌트) | ⬜ | 후속 phase7 세션 |
| SEC-5 | `sandbox.aura-board.app` DNS + Vercel 도메인 매핑 | ⬜ | 배포 작업자 |
| SEC-6 | Vercel 환경변수: `SONNET_API_KEY` · `PLAYTOKEN_JWT_SECRET`(32+) · `NEXT_PUBLIC_APP_ORIGIN` · `CRON_SECRET` | ⬜ | 배포 작업자 |

**`vercel env` 명령 예시 (Vercel CLI 설치 후)**:

```bash
npm i -g vercel
vercel link
vercel env add SONNET_API_KEY production
vercel env add PLAYTOKEN_JWT_SECRET production  # 32+ chars
vercel env add NEXT_PUBLIC_APP_ORIGIN production  # e.g. https://aura-board.app
vercel env add CRON_SECRET production
```

---

## 6. 롤백 절차

phase3 design_doc `§7 Rollback`에 4단계 전략 기록. 여기는 명령 요약:

### 6.1 Feature Flag off (< 1분)

모든 vibe-arcade 보드 비활성:

```sql
UPDATE "VibeArcadeConfig" SET "enabled" = false;
```

또는 단일 보드:

```bash
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"enabled":false}' \
  "https://aura-board.app/api/vibe/config?boardId=<id>"
```

### 6.2 Layout 원복

```sql
UPDATE "Board" SET "layout" = 'freeform' WHERE "layout" = 'vibe-arcade';
-- VibeProject 데이터 보존. 단 catalog 접근 경로 제거됨.
```

### 6.3 Git Revert

```bash
git revert 476dab8 4ff09cb 3ca53c5 f8eb977 608e7bb cae0036 bca91ea 52f2645 7f4c02b a11d3bd
# 또는 브랜치 머지 커밋 단일 revert
```

### 6.4 Schema Drop (최후 수단, 프로덕션 사용 > 0이면 데이터 영구 손실)

`prisma/migrations/20260420_vibe_arcade_v1/down.sql` 수동 작성:

```sql
DROP TABLE IF EXISTS "VibeQuotaLedger";
DROP TABLE IF EXISTS "VibePlaySession";
DROP TABLE IF EXISTS "VibeReview";
DROP TABLE IF EXISTS "VibeSession";
DROP TABLE IF EXISTS "VibeProject";
DROP TABLE IF EXISTS "VibeArcadeConfig";
```

**데이터 손실 경고** — 프로덕션 시연 > 0 사용자에게 생성된 프로젝트·리뷰·세션·쿼터 원장 모두 소실.

---

## 7. 판정 & 핸드오프

- ✅ 푸시 완료 + PR URL 발급
- ✅ REVIEW_OK (phase8) + QA_OK (phase9, 조건부 PARTIAL_PASS 동반)
- ⚠ Vercel CLI 미설치로 자동 deploy trigger 수동. GitHub push 자체는 Vercel Git 연동이 있다면 preview 자동 진행.
- ⚠ Production 배포는 SEC-1~6 체크리스트 완료 + UI 8종 구현 후.

→ **phase10 deployer 스코프 완료** (코드 준비 + 푸시 + 배포 체크리스트 문서화). phase11 doc_syncer 진행 가능.
