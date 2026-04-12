# Doc Updates — plant-journal-board

## 업데이트된 문서
- `docs/design-system.md` §컬러 — 4 new plant tokens (`--color-plant-active/visited/upcoming/stalled`)
- `docs/current-features.md` — **new file**; plant-roadmap layout + 10-species catalog + teacher summary/matrix features added
- No change to `docs/architecture.md` (still absent — defer the full data-model architecture doc to a later task)
- No change to `CLAUDE.md` (no orchestration rule change)
- No change to `README.md` (user-facing intro unchanged)

## 회고 (3줄)
- **잘된 점**: phase3 design_doc의 6-model ERD + 12-route API spec을 phase7에서 거의 그대로 구현. 계약 명확화 + zod로 런타임 검증까지 엣지케이스 캡처.
- **아쉬운 점**: 런타임에서 `auth()` vs `getCurrentUser()` 혼용으로 로컬 mock 쿠키가 일부 신규 라우트에서 동작 안 했고 phase9 QA에서야 발견. phase3에서 "팀의 패턴은 `getCurrentUser()`다"를 명시했으면 피할 수 있었음.
- **다음 task에서 적용할 것**: 신규 라우트 신설 시 기존 라우트에서 쓰인 auth 헬퍼 이름을 먼저 grep해 동일한 헬퍼를 쓴다. phase3 design_doc §2에 "auth 헬퍼: getCurrentUser (NextAuth + mock)"처럼 명시.

## 재사용 가능한 패턴
- `resolvePlantActor()` — student 세션 + teacher 세션을 한 shape로 통합해 "actor" 개념 도입. 다른 role-혼합 라우트(예: submission)에서도 적용 가능.
- 매트릭스 뷰의 `X-Client-Width` + owner 이중 게이트 패턴은 "UX 게이트 ≠ 보안 게이트" 분리 원칙으로 유효.

## 메모리 후보
- "신규 라우트의 auth 헬퍼는 기존 라우트 패턴을 grep 후 동일한 것 사용" — `feedback_auth_helper_consistency.md`
