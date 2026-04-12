# Phase 11 — Doc Sync (BR-5 ~ BR-9)

## 변경된 문서
- `docs/current-features.md` — "모둠 학습 보드 — Runtime (BR-5~9)" 섹션 추가, "out of scope" 줄 삭제
- `docs/architecture.md` — "Breakout Room Runtime" 섹션 추가 (APIs, RBAC, Pages, 배포/가시성 동작 표), Foundation 섹션의 Deferred 목록을 완료 상태로 표기

## 변경 없음
- `docs/design-system.md` — 기존 토큰만 재사용, 새 패턴 없음
- `CLAUDE.md` — 경로/환경 무변경
- `README.md` — 사용법 변경 없음
- `_handoff.md` — Foundation 핸드오프 보존

## v2 파킹 (다음 task 필요)
- 월드카페 템플릿
- 학생 셀프 모둠 이동 (WS 재구독 비용)
- `User.tier` 실제 엔티티 + 결제 연동
- CSV export (교사용 아카이브 다운로드)
- 실제 WS 엔진 도입 (Supabase Realtime 등) — `publish()` no-op → 실체화

## PUSH_READY 조건
- build ✓
- typecheck ✓
- REVIEW_OK ✓ (phase8)
- QA_OK ✓ (phase9)

PUSH_READY.marker 작성 — 단, 실제 push는 사용자 승인 후.
