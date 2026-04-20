# Doc Updates — vibe-coding-arcade

## 업데이트된 문서

### 1. `docs/current-features.md`

- **Board layouts** 표에 `vibe-arcade` 행 추가 — 학급 Steam 요약, 현재 뼈대 스코프 + phase7 후속 UI 대기 상태 명시.
- 문서 하단에 신규 섹션 **"Vibe Coding Arcade (2026-04-20, Seed 13 v1) — 학급 Steam"** 추가 — 데이터 모델 6종 · API 핸들러 9 + cron 3 + sandbox 1 · 4중 샌드박스 보안 · UI 스코프(뼈대 + 미구현 목록) · 게이팅 · 프로덕션 SEC-1~6 차단 체크리스트.

### 2. `docs/architecture.md`

- Classroom Bank 섹션 아래에 신규 섹션 **"Vibe Coding Arcade — Seed 13 (2026-04-20)"** 추가.
  - Data model: 6 신규 + enum 확장 (`studentId` nullable/non-null 정책 + 센티넬 명시)
  - Libs: 7 파일 역할 요약 + export 상수
  - API 테이블: 권한 규칙 + 특이사항(404 on missing board, SSE abort, HMAC verify)
  - Realtime: `board:${id}:vibe-arcade` 채널
  - Components + 디자인 토큰 요약
  - Deferred 목록 — phase7 후속 세션 UI 8종 + 운영 인프라 4종

### 3. `docs/design-system.md`

- **컬러 토큰 §1** `--color-danger` 뒤에 "Vibe-arcade (Seed 13, 추가 2026-04-20)" 서브섹션 추가 — 7 토큰 표 + alias 3건/순신규 4건 설명 + 기존 semantic 상태색 재활용 노트.

### 4. `CLAUDE.md`

- **업데이트 불필요**. 오케스트레이션 규칙·경로·파이프라인 공통 규칙은 본 task로 인해 변경되지 않음. vibe-arcade 스펙은 `current-features.md` + `architecture.md`에 국소화.

### 5. `README.md`

- **업데이트 불필요**. vibe-arcade는 현재 `enabled=false` gate + UI 미완성 상태로 사용자 facing 최종 기능 아님. phase7 후속에서 Studio/PlayModal 완성 후 README `## Features` 섹션에 추가 예정.

---

## 회고 (3줄)

- **잘된 점** — 35일 규모의 feature를 6 → 11 phase 파이프라인으로 분할하여 각 phase별 산출물(scope_decision·design_doc·design_spec·tokens_patch·review·QA 보고서)을 순차적으로 쌓아 올려 역추적 가능한 감사 이력을 남김. phase8 staff 리뷰에서 P0 4건(regex 상태 누수 · Postgres NULL-distinct · studentId nullable 충돌 · cross-classroom leak)을 자동 수정해 phase9 QA 이전에 선제 차단. Claude in Chrome으로 Notion Soft 디자인 토큰 적용 여부를 실제 브라우저 렌더로 2종 상태(gate-off · ready-empty) 검증.

- **아쉬운 점** — 세션 컨텍스트 한계로 UI 8종(Studio · PlayModal · ReviewPanel · TeacherModerationDashboard · 컴포넌트 primitives)을 phase7에서 뼈대만 남겨 후속 세션으로 넘김. 결과적으로 phase9 QA가 수용 기준 31 중 13개만 full PASS, 10개는 partial(handler OK / UI 대기), 8개는 후속. Vercel preview 빌드는 `DIRECT_URL` Preview scope 미설정이라는 사용자 환경 갭으로 실패 — vibe-arcade 변경과 무관하지만 CI 피드백을 못 얻은 상태로 phase10 종료.

- **다음 task에서 적용할 것** — (1) 35일 규모 feature는 phase7을 **vertical slice 단위로 분할**(예: 'backend + gate', 'Studio', 'PlayModal + Sandbox end-to-end', 'Teacher Dashboard')하여 한 세션 내 end-to-end 스모크 가능한 최소 단위로 쪼갠 후 재활용. (2) Preview 환경변수를 가정한 `directUrl = env("DIRECT_URL")` 같은 스키마 조건을 Production 전용 설정으로 단정하지 말고, 첫 feature branch 푸시 전에 `vercel env ls preview`로 검증. (3) 센티넬 패턴(`__CLASSROOM__`) 같은 Postgres 제약 회피 기법은 phase3 architect에서 체크리스트화하여 phase7에 들어가기 전 노출.

---

## 핸드오프

phase10 `deploy_log.md` — Preview 빌드 ERROR(사용자 수동 Vercel env 추가 대기). Production 배포는 SEC-1~6 + UI 8종 완성 후.

push 검증 (`npm run build` + `npm run typecheck` + 모든 마커 유효):
- `npm run typecheck` ✅ 0 errors (phase9 실행)
- `npm run build` ⚠ 로컬 미시도 (Supabase 프로덕션 DB 접근 필요). Vercel CI 빌드에 위임 — Preview 환경변수 갭 해결 후 자동 재실행.
- markers: REVIEW_OK ✅, QA_OK ✅ (+ QA_PARTIAL_PASS 동반)

feature 파이프라인 phase0~11 전체 완결. 후속 작업은 별도 feature task로 분기 — 예: `2026-04-21-vibe-arcade-studio`, `2026-04-22-vibe-arcade-playmodal`.
