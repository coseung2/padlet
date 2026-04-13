# Phase 2 — Hotfix

## HIGH-A: lib/auth.ts production guard

**변경**: `src/lib/auth.ts` getCurrentUser() 의 mock fallback 분기에 `process.env.NODE_ENV === "production"` 가드 추가. production 에서 NextAuth 세션도 없고 `as` 쿠키도 없으면 `throw new Error("Unauthenticated")`.

**임팩트 분석** (62 호출자):
- 19 호출자는 이미 `.catch(() => null)` 으로 흡수 — board 페이지, plant-matrix, species API 등. 변경 없이 student/parent 폴백 경로로 자연스럽게 진입.
- 나머지 ~43 호출자는 throw 시 500 → 정확한 401 의미 (이전엔 silent u_owner 권한으로 인가 통과 = 보안 허점). `src/app/page.tsx` 처럼 try/catch + redirect("/login") 처리하는 케이스도 있음.
- dev 동작 무변경: `as` 쿠키 미설정 시 owner 폴백 유지 → UserSwitcher 워크플로우 정상.

**Karpathy 4 원칙**:
- §1 Think — production vs dev 분기 명시, throw 메시지에 의도 주석화
- §2 Simplicity — 5 줄 가드, 새 함수/시그니처 변경 없음
- §3 Surgical — auth.ts 한 함수 내부만, 호출자 0건 변경
- §4 Goal-Driven — typecheck + build 통과로 검증, throw 흡수 패턴 grep 으로 사전 확인

## HIGH-B: DrawingStudio.tsx flatten guard

**변경**: `src/components/drawing/DrawingStudio.tsx` handleSave() 안에 `layers.some((l) => l.visible)` 체크 추가. 비가시 시 user-facing 한국어 메시지로 throw → 기존 setSaveError 경로로 surface.

**Karpathy 4 원칙**:
- §1 Think — 사용자가 모든 레이어 끄는 케이스 명시
- §2 Simplicity — 3 줄, 새 함수 없음, 기존 setSaveError 인프라 재사용
- §3 Surgical — handleSave() try 블록 첫 줄에만 추가
- §4 Goal-Driven — 메시지가 사용자 행동을 명시 ("레이어를 켜고 다시 저장")

## 검증

- `npm run typecheck` ✅
- `npm run build` ✅ (모든 라우트 빌드 성공)
- 회귀 0건
