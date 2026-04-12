# Phase 11 — Doc Sync

## 업데이트된 문서
- `docs/design-system.md`
  - `--color-danger` / `--color-danger-active` 토큰 표 추가
  - `SidePanel` 컴포넌트 패턴 섹션 추가
- `docs/current-features.md`
  - "Section Actions Panel (2026-04-13)" 항목 신규 추가
- `docs/architecture.md`
  - `/share` 라우트를 fallback 으로 표기
  - `SidePanel` / `SectionActionsPanel` / 리팩터된 `StageDetailSheet` 컴포넌트 등재
  - 토큰·유틸 클래스 추가 문단 기록

## 미업데이트 (의도적)
- `README.md` — 사용자 facing 문구 큰 변화 없음(섹션 관리 진입점 변경만). 후속 릴리즈 노트에서 다룰 예정.
- `CLAUDE.md` — 경로/환경 변경 없음.
- `EditSectionModal.tsx` dead file 삭제 — PR 크기 최소화 목적 의도적 보류.

## v2 브랜치 조율 메모
- `feat/plant-journal-v2` 가 `StageDetailSheet` 를 학생 경로에서 제거/수정 할 예정
- 충돌 발생 시 **v2 버전을 우선 취하고** 본 task 의 `<SidePanel>` 래퍼를 재적용
- `src/components/plant/StageDetailSheet.tsx` 상단 JSDoc 에 이 가이드 주석 남김

## Push 게이트 점검 결과
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `phase8/REVIEW_OK.marker`: 존재
- `phase9/QA_OK.marker`: 존재
- `phase11/PUSH_READY.marker`: 본 task 커밋 시 touch
- 원격 push 는 사용자가 수행 (프롬프트 제약)
