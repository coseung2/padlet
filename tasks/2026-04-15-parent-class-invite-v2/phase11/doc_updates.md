# Doc Updates — parent-class-invite-v2 · phase11

## 업데이트된 문서

### `docs/current-features.md`
파일 말미에 **"학부모 학급 초대 v2 (parent-class-invite-v2) — 2026-04-15"** 섹션 추가. 스키마/신규 API/UI/권한/레이트리밋/state-machine/cron/이메일/deferred 한 눈에.

AB-1 섹션 말미에도 **"2026-04-15 AB-1 후속 머지"** 블럭 추가 — AC-12/AC-13 완료 + 대시보드 생성 흐름 정비(board-first + 학급 배당 FAB) 기록.

### 건드리지 않은 문서
- `docs/architecture.md` — 같은 형식의 섹션을 따로 추가할지 보류. 현재 AB-1 섹션이 있고 parent-v2 는 feature 성격이라 `current-features.md` 만으로 충분.
- `docs/design-system.md` — phase7 에서 `--color-warning` / `--color-warning-tinted-bg` 토큰 2개 `base.css` 에 추가됐으나, 해당 문서 §1 "컬러 토큰" 표 갱신은 follow-up. 지금 당장 하드코딩 hex 쓰는 곳 없어 규칙 위반 아님.
- `CLAUDE.md` — 오케스트레이션 규칙 변경 없음. vitest 신규 도입 언급 필요 시 follow-up.
- `README.md` — 외부 공개용은 변경 없음.

## 메모리 업데이트
- `project_shipped_features_2026-04-13.md` (생성은 `2026-04-15` 기준 갱신 스냅샷) — feature count 15→**16** 으로 갱신하고 parent-class-invite-v2 entry 추가 권장 (follow-up, 이 phase 에서 직접 편집 안 함).

## 회고 (3줄)

### 잘된 점
- phase3 amendment v2 가 blockers + 권장 디폴트를 명확히 정리해둔 덕에 사용자 "승인 없이" 위임에서도 에이전트가 혼자 coder 끝낼 수 있었음. 블로커 해결안이 코드로 바로 translate 가능한 상태였던 것이 결정적.
- phase8 리뷰어가 self-audit 만 믿지 않고 migration SQL 과 parent-scope 를 재확인해서 **backfill 누락(HIGH)** + **pending 행 유출(HIGH)** 2건을 잡음. 두 건 다 배포되었으면 실 사용자 영향이 컸을 이슈.

### 아쉬운 점
- 이번 phase 중 worktree → main 머지 때 `base.css` 충돌 + main repo 에 vitest/resend/@react-email 의존성 없던 상태라 `npm install` + `prisma generate` 순서를 한 번 거치지 않으면 빌드가 빨간색이었음. 메모리(`feedback_migration_pending_canva` 처럼)에 "feature 브랜치 vs main 의존성 드리프트 감지 체크" 패턴을 넣으면 재발 방지.
- BoardMember insert 보류 + Revoke API 부재 + ClassroomDeleteModal 배선 누락 — 3건 모두 feature 자체 완성도보다 **UX 완결성**에서 간극. phase7 scope 에 들어갔어야 할 가능성 있음. phase 재스코핑이 현실적으로 어렵다면, deferred 리스트를 phase2 scope_decision 단계에서 미리 적어 두면 기대치 조정이 쉬움.

### 다음 task 에서 적용할 것
- phase7 진입 전 `npm install && prisma generate` 를 main 에서도 **사전 실행**하는 체크리스트 항목 추가 (merge 직전이 아니라).
- 대형 feature 는 phase6 user_decisions.md 에 "필수 구현" vs "phase 스코프 아웃" 을 AC 단위로 명시 — phase8 리뷰어가 scope drift 판정이 쉬움.
- Vitest 같은 테스트 러너 도입은 phase1 researcher 가 사전에 인프라 갭으로 식별하도록 research.md 템플릿 확장.
