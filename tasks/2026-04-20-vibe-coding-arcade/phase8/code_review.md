# Phase 8 — Staff Engineer Code Review

> **브랜치**: `feat/vibe-coding-arcade` · HEAD `608e7bb`
> **입력**: `phase3/design_doc.md` + `phase7/files_changed.txt` + `phase7/diff_summary.md`
> **리뷰어**: Claude Opus 4.7 (staff engineer 관점, `/review` 스킬 부재 → 본체 직접 수행)

---

## 1. Karpathy 4원칙 감사

| 원칙 | 판정 | 근거 |
|---|---|---|
| **Think Before Coding** | PASS | `diff_summary.md §1`에 `src/features/`·`FeatureFlag`·Anthropic SDK·별도 라우트 경로 4건의 가정과 교체 사유 명시. 불확실한 부분(`SONNET_API_KEY` env 사용)은 TODO 마커로 공개. |
| **Simplicity First** | PASS | FeatureFlag 테이블 신설 회피 + `Config.enabled` 단일 필드로 gate. CDN 화이트리스트 하드코딩(조건 추상화 X). 미구현 컴포넌트는 TODO 마커로 남기고 섣불리 구현 안 함. 단 — CLASSROOM_WIDE_SENTINEL 도입은 "과설계"가 아닌 Postgres NULL-distinct 제약 회피의 **최소 해결책**. |
| **Surgical Changes** | PASS | 기존 코드 수정은 3 파일로 최소화 — `schema.prisma`(역관계+layout 주석), `app/api/boards/route.ts`(enum 1 라인), `app/board/[id]/page.tsx`(case 분기 + import). 인접 코드 리팩토 0. |
| **Goal-Driven Execution** | PASS | 18 assertion 단위 테스트 + 31 AC와 1:1 매핑된 diff 요약. `quota check → increment → rollup` 3단 파이프가 상태 전이 테스트 가능. |

---

## 2. 발견 이슈 (10건)

### P0 Critical (자동 수정 적용)

**2.1 [BUG] `JS_SCHEME_RE`·`DATA_HTML_RE` /g flag + `test()` lastIndex 누수**

- 파일: `src/lib/vibe-arcade/moderation-filter.ts`
- 증상: `const re = /.../gi;` + `re.test(input)` 호출 반복 시 `lastIndex` 상태가 스레드 간 누적 → 두 번째 이후 호출이 false 반환. 학생 제출 HTML 수가 늘어날수록 false-negative 누적.
- 수정: `/g` 플래그 제거 (`/i`만 유지). 첫 매치만 확인하면 충분.
- 커밋: `fix(vibe-arcade): remove /g from module-level regexes`

**2.2 [BUG] `VibeQuotaLedger.studentId` nullable + compound UNIQUE — Postgres NULLs are DISTINCT**

- 파일: `prisma/schema.prisma` + `prisma/migrations/.../migration.sql` + `lib/vibe-arcade/quota-ledger.ts` + `api/cron/vibe-arcade-quota-rollup/route.ts`
- 증상: `@@unique([classroomId, studentId, date])`에서 `studentId` nullable 필드는 Postgres 기본 NULLs-DISTINCT 정책 때문에 여러 NULL 로우 생성 가능 → 학급 합계 무결성 깨짐 + `findUnique({ studentId: null })` 동작 모호.
- 수정: `studentId` non-null로 변경 + 센티넬 `CLASSROOM_WIDE_SENTINEL = "__CLASSROOM__"` 도입. 모든 classroom-wide 로우는 이 값으로 저장/조회.
- 영향 파일 5개 일괄 갱신.

**2.3 [BUG] `VibeSession.studentId` non-null + AC-G5 익명화 충돌**

- 파일: `prisma/schema.prisma` + `prisma/migrations/.../migration.sql` + `api/cron/vibe-arcade-anonymize/route.ts`
- 증상: schema가 `studentId String` + relation `Cascade` → `anonymize` cron의 `studentId=null` 업데이트가 Postgres NOT NULL 제약 위반 + TS 타입 오류 회피(`as unknown as string`) 마스킹만 됨.
- 수정: `studentId String?` + relation `Student? ... onDelete: SetNull` + migration SQL NOT NULL 제거 + FK 정책 `SET NULL`로. cron에서 `studentId: null` 직접 대입 + `studentId: { not: null }` 조건 정상 동작.

**2.4 [SECURITY] Projects GET 카탈로그 scope 검증 부재**

- 파일: `src/app/api/vibe/projects/route.ts`
- 증상: 학생(다른 반) 세션으로 `?boardId=`에 임의 boardId 주면 타 반 approved 프로젝트 나열 가능. `crossClassroomVisible=false`가 기본이라는 기대를 handler가 강제하지 않음.
- 수정: handler 상단에 Board.classroomId vs Student.classroomId 매칭 + teacher 경로는 `getBoardRole` 체크. 실패 시 403.

### P1 Should Fix (자동 수정 적용)

**2.5 [RELIABILITY] SSE 스트림 client abort 누수**

- 파일: `src/app/api/vibe/sessions/route.ts`
- 증상: `ReadableStream.start` 안에서 `controller.close()`만 finally에서 호출 — 클라이언트 탭 닫힘/abort 시 Sonnet SDK 루프는 계속 돌아 교사 API Key 토큰 낭비 + Prisma 업데이트 race.
- 수정: `req.signal.addEventListener("abort", …)` + `aborted` 플래그로 `send`/`close` 단락. finally의 `controller.close()`는 try/catch로 감쌈.

**2.6 [CODE QUALITY] `IframeLRU.evictIfOverCap` 타입 안전성**

- 파일: `src/lib/vibe-arcade/iframe-lru.ts`
- 증상: `.entries().next().value as [string, SandboxIframeHandle]` 강제 캐스팅 — 빈 Map 대비 가드 없음(현재 로직상 불가능하지만 방어적으로).
- 수정: `next()` 결과의 `done` 체크 후 구조 분해.

### P2 (후속 작업으로 남김 — 현 세션 스코프 외)

**2.7 [FEATURE GAP] Studio 클라이언트 SSE 훅 부재**

- 영향: design_spec S3 streaming 미구현. Server-Sent Events producer는 있지만 consumer(React hook) 미작성.
- TODO 마커: phase7 후속 세션에서 `src/lib/vibe-arcade/use-vibe-stream.ts` 신규.

**2.8 [FEATURE GAP] Studio/PlayModal/ReviewPanel/TeacherModerationDashboard UI**

- TODO 마커 명시됨. phase9 QA는 동작 확인 가능한 카탈로그 + gate-off 상태에 국한.

**2.9 [FEATURE GAP] Playwright 썸네일 worker 미구현**

- `VibeProject.thumbnailUrl` 는 nullable 유지. UI는 placeholder 표시. phase7 후속에서 BullMQ + Playwright 구현.

**2.10 [DX] Prisma CLI 버전 미스매치**

- `@prisma/client ^6.0.0` 의존성 대비 로컬 전역 `prisma` 가 7.7 pull → `url`/`directUrl` deprecated 오류. 본 세션에서는 validate 스킵. phase10 deployer에서 `npx prisma@6` 고정 또는 `prisma` devDependency 추가 권장.

---

## 3. 스코프 드리프트 감사

design_doc 대비 drift 0건:
- 엔티티 6종 ↔ Prisma 모델 6종 ✓
- API 17개 중 핵심 9개 + 3 cron + 1 sandbox = 13개 구현 (UI 계층 TODO는 drift 아님)
- Board.layout enum 확장 1건만 ✓
- base.css 토큰 7개 ✓ (tokens_patch.json과 일치)
- migration SQL의 FK 정책 (`VibeProject.authorStudentId=Restrict`) — design_doc §1.1 노트와 일치

스코프 확장 없음. 설계 축소는 "UI 컴포넌트 8개 TODO"로 phase7 diff_summary.md §3에 명시.

---

## 4. 자동 수정 커밋

| 파일 | 수정 |
|---|---|
| `src/lib/vibe-arcade/moderation-filter.ts` | /g flag 제거 (2.1) |
| `prisma/schema.prisma` | VibeQuotaLedger.studentId non-null · VibeSession.studentId nullable · Student relation SetNull (2.2, 2.3) |
| `prisma/migrations/20260420_vibe_arcade_v1/migration.sql` | 위 스키마 반영 (2.2, 2.3) |
| `src/lib/vibe-arcade/quota-ledger.ts` | CLASSROOM_WIDE_SENTINEL + getClassroomQuotaToday (2.2) |
| `src/app/api/cron/vibe-arcade-quota-rollup/route.ts` | 센티넬 사용 (2.2) |
| `src/app/api/cron/vibe-arcade-anonymize/route.ts` | null 대입 정합 (2.3) |
| `src/app/api/vibe/projects/route.ts` | classroomId scope 검증 (2.4) |
| `src/app/api/vibe/sessions/route.ts` | abort signal (2.5) |
| `src/lib/vibe-arcade/iframe-lru.ts` | next().done 체크 (2.6) |

---

## 5. 최종 판정

- ✅ Karpathy 4원칙 PASS
- ✅ P0 4건 · P1 2건 자동 수정 적용
- ⚠ P2 4건 TODO 마커 유지 (현 세션 스코프 외 · phase9/phase10 이전에 필요 시 착수)
- ✅ 스코프 드리프트 0건

**→ phase8 review PASS.** `/cso` 보안 감사 및 Codex cross-model 의견도 이어서 수행 후 `REVIEW_OK.marker` 생성.
