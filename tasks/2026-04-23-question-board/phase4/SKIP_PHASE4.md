# Phase 4 (Design Planner) — SKIP

## 사유

솔로 프로젝트 + 신규 레이아웃 1개. 기존 보드 레이아웃 계열(QuizBoard, DJBoard, AssignmentBoard 등)의 디자인 기획 패턴이 이미 `docs/design-system.md` + `docs/architecture.md` 에 성문화되어 있어 별도 planning 비용 대비 효과가 낮음.

## 적용 지침 (Phase 7 coder 가 따를 것)

- **구조**: 기존 `BoardShell` 래퍼 + layout-switch 진입 패턴 그대로
- **타이포/색**: `docs/design-system.md` 의 tokens 재사용
- **섹션 경계**: 메모리 `No nested box-in-box UI` 준수 — 카드 안 카드 금지, divider/gap 으로 분리
- **작성자 표기**: 메모리 `Author chip style preferred` — pill chip + 시간 분리

phase4 산출물에 준하는 의사결정은 위 세 지침으로 축약.
