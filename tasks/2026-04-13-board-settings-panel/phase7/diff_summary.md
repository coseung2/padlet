# Phase 7 Diff Summary

## New

- `BoardSettingsPanel.tsx` — SidePanel 기반 보드 설정 패널. 탭 4개(브레이크아웃 + 준비중 3). 브레이크아웃 탭은 layout 가드 + empty/ready 분기, 각 섹션 row는 `BreakoutSectionRow` 내부 컴포넌트에서 token 발급/회전/복사를 `POST /api/sections/:id/share` 로 처리. 성공 시 로컬 상태 업데이트 + `router.refresh()` 로 서버 prop 동기화.
- `BoardSettingsLauncher.tsx` — ⚙ 버튼 + lazy-mounted panel. Owner/editor 게이트는 caller(서버 컴포넌트) 책임.

## Modified

- `SectionActionsPanel.tsx` — Tab union `"rename" | "delete"` 로 축소, defaultTab 기본 "rename", `boardId`/`accessToken` prop 제거, `SectionShareClient` import 삭제.
- `ColumnsBoard.tsx` — 섹션 헤더의 별도 `section-actions-trigger` 버튼 제거. `ContextMenu.items` 에 `이름 변경`·`섹션 삭제`(danger)·Canva 액션들을 통합. viewer는 `menuItems` 가 `[]` 이므로 ContextMenu 자체가 렌더되지 않음. `SectionActionsPanel` 호출부에서 `boardId` prop 제거.
- `SectionShareClient.tsx` — 고정 id(`share-url-input` 등)를 `useId()` 네임스페이스로 교체. BoardSettingsPanel에서 섹션 N개가 병렬 렌더돼도 중복 id 발생 안 함.
- `app/board/[id]/page.tsx` — `BoardHeader` 에 `settingsSections` prop 추가. `canEdit` 때만 `<BoardSettingsLauncher/>` 를 `EditableTitle` 우측에 렌더. `settingsSections` 는 이미 페이지가 조회한 sectionProps에서 파생.
- `app/board/[id]/s/[sectionId]/share/page.tsx` — 안내 배너를 "⚙ 보드 설정 → 브레이크아웃" 경로로 갱신(하위 호환 URL).
- `side-panel.css` — `.board-settings-trigger`, `.board-settings-tab-meta`, `.board-settings-list`, `.board-settings-row`, `.board-settings-row-title`, `.board-settings-row-name`, `.board-settings-row-badge` (.on/.off), `.board-settings-empty`, `.board-settings-placeholder` 추가.

## 스코프 외 수정

없음.

## 테스트

단위 테스트 코드 없음(저장소 방침). 수동/브라우저 QA는 phase9.

## Build + Typecheck

- `npx tsc --noEmit` EXIT=0
- `npm run build` EXIT=0
