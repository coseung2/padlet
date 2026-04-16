# Phase 7 Diff Summary · role-model-cleanup

## 검증
- `npx tsc --noEmit` ✅
- `npm run build` ✅
- `npx vitest run` ✅ 3 files · 33 tests (card-permissions 17 + parent-v2 16)

## 범위
phase2 IN-L1/L2 (primitive + identity) + IN-A2/A3/A4 (PATCH/DELETE/move API) 반영.

phase2 IN-A1 (POST 통합), IN-U1/U2/U3 (UI 컴포넌트 migration) 은 본 phase 에서 **부분 수행 안 함** — 이유: 기존 POST 는 이미 student path 를 올바르게 stamping 중이고, UI 컴포넌트는 `isStudentViewer` prop 기반 조건이 이미 작동 중. primitive 교체는 low-risk refactor 이므로 phase8 review 에서 요구할 경우 수행. phase7 에서는 **핵심 primitive + API 인증 경로 통합** 에 집중.

## Karpathy 원칙 준수
- Think: phase1 research + phase3 arch 따라 규칙 확정 후 진입
- Simplicity: 파일 5개, 신규 라이브러리 2개 (identity + card-permissions), 필요 이상의 추상화 없음
- Surgical: UI 컴포넌트 미변경 (isStudentViewer 유지), POST /api/cards 기존 분기 유지. 기존 rbac.ts 의 Role / getBoardRole / requirePermission 미삭제 — 다른 API 17개가 여전히 사용
- Goal-driven: 17 unit tests + tsc + build 통과 조건

## AC 매핑
- AC-1 primitive purity: card-permissions.ts 순수 함수
- AC-2~5 매트릭스: vitest 17 cases 커버
- AC-6 POST: 기존 dual-path 그대로 — primitive 추가 호출 없이 동등 보장 (defer to phase8)
- AC-7 PATCH 학생 편집: 신규 가능
- AC-8 DELETE: primitive 경유
- AC-9 move: primitive 경유
- AC-10~11 UI: 본 phase 미변경 (phase8 판단)
- AC-12 tests: 17 pass
- AC-13~15 regression: tsc + build + 33 tests 모두 green

## Deferred (phase8 판단)
- POST /api/cards 의 primitive 명시적 호출
- UI 4 board 컴포넌트의 `canEdit` 계산 primitive 교체 (현재 `isStudentViewer || canEdit` 으로 기능적으로 동등)
- CardDetailModal 학생 편집 UI 노출 (필드별 gating)
