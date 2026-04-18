# Phase 7 — Diff Summary

## Added

### `src/components/ui/SidePanel.tsx`
범용 우측 슬라이드 시트 프리미티브. `role=dialog` + `aria-modal` + ESC 닫기 + body scroll lock + Tab/Shift+Tab 포커스 트랩 + opener 포커스 복귀 + 모션 감소 지원. props: `{ open, onClose, title, labelledBy?, children, width?, initialFocusRef?, footer?, className? }`.

### `src/components/SectionActionsPanel.tsx`
SidePanel 기반 섹션 관리 UI. 3개 탭(공유/이름 변경/삭제). 공유 탭은 기존 `SectionShareClient` 재사용. 이름 변경은 `PATCH /api/sections/:id` 호출 후 optimistic 콜백. 삭제는 체크박스 + 빨간 버튼 2단 확인 후 `DELETE /api/sections/:id`. editor 는 공유 탭에서 안내문구만 표시(실제 API 는 owner-only, UI 도 disabled 처리 없이 안내 중심).

### `src/styles/side-panel.css`
SidePanel 기본 스타일 + tablist/tab + `.section-actions-trigger` + rename 폼 + delete 컨펌 + panel notice. prefers-reduced-motion 처리.

## Modified

### `src/components/ColumnsBoard.tsx`
- `EditSectionModal` import/사용 제거, `SectionActionsPanel` 추가.
- 섹션 상태에 optional `accessToken` 추가.
- 새 상태 `panelState: { sectionId, tab } | null` 도입. 기존 `editingSection` + `handleEditSectionSave` + `handleDeleteSection` 제거.
- 섹션 헤더에 owner/editor 만 보이는 ⋯ 트리거 버튼 추가(`aria-haspopup=dialog`).
- 기존 ContextMenu 항목에서 "수정"/"삭제" 제거, Canva 관련만 잔존. Canva 항목이 하나도 없으면 ContextMenu 자체 미노출.
- rename/delete 시 optimistic UI 는 ColumnsBoard 가 담당, 실제 API 호출은 SectionActionsPanel 내부에서 수행.

### `src/components/plant/StageDetailSheet.tsx`
내부 `aside+backdrop` 을 `<SidePanel>` 로 교체. 외부 props 시그니처 완전 보존. 기존 `.plant-obs-*`, `.plant-sheet-points`, `.plant-sheet-actions` 클래스는 그대로 사용. 주석에 v2 브랜치 머지 충돌 대응 가이드 남김("v2 를 우선 취하고 이 래퍼를 재적용").

### `src/app/board/[id]/page.tsx`
`sectionProps` map 에 `accessToken: s.accessToken` 추가. 나머지 Prisma select 는 기존대로 `findMany({ where, orderBy })` — 전체 레코드 반환이라 DB 쿼리 변경 없음.

### `src/app/board/[id]/s/[sectionId]/share/page.tsx`
상단에 "columns 보드 섹션 ⋯ 메뉴에서도 열 수 있어요" 안내 배너 추가. 라우트 자체는 그대로 유지 (북마크/직접 링크 호환).

### `src/styles/base.css`
`--color-danger: #c62828`, `--color-danger-active: #a01b1b` 토큰 추가. `--color-plant-stalled` 와 동일 hex 이나 의미 분리.

### `src/app/globals.css`
`@import "../styles/side-panel.css"` 추가 (plant 와 responsive 사이).

## Behavior changes
1. columns 보드에서 섹션 수정은 이제 우측 패널로 열린다. 기존 "수정" 메뉴 아이템 제거.
2. 섹션 삭제는 `window.confirm` 대신 패널 삭제 탭 + 체크박스 2단 확인.
3. `/board/[id]/s/[sectionId]/share` 는 fallback 으로 유지, 상단 배너로 안내.
4. plant 의 StageDetailSheet 는 이제 ESC/scroll lock/focus trap 혜택을 받는다 (기존보다 a11y 개선).

## 미추가 테스트
- 단위 테스트 스위트가 프로젝트에 존재하지 않아 smoke 는 phase9 에서 dev server 기반 수동 QA.
