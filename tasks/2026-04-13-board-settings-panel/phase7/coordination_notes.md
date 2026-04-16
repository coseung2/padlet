# Coordination Notes — board-settings-panel

## 다른 에이전트 동시 작업

- `feat/image-pipeline-t0-4` — DraggableCard.tsx / next.config.ts 수정 가능성
- `feat/iframe-virtualization-t0-2` — DraggableCard.tsx 수정 가능성

## 본 task 의 수정 파일

- `src/components/BoardSettingsPanel.tsx` (NEW)
- `src/components/BoardSettingsLauncher.tsx` (NEW)
- `src/components/SectionActionsPanel.tsx`
- `src/components/ColumnsBoard.tsx`
- `src/components/SectionShareClient.tsx`
- `src/app/board/[id]/page.tsx`
- `src/app/board/[id]/s/[sectionId]/share/page.tsx`
- `src/styles/side-panel.css`

## 충돌 가능성

- **없음**. 본 task는 `DraggableCard.tsx` 와 `next.config.ts` 를 건드리지 **않는다**.
- `src/app/board/[id]/page.tsx` 는 공유 파일이지만 변경 범위는 `BoardHeader` 함수 + 초기 props 조립(`settingsSections`)에 한정됨. image-pipeline/iframe-virtualization 에이전트가 같은 파일을 건드릴 경우 `BoardHeader` 외 영역에서 충돌 가능성 있으니 merge 시점에 확인.
- `ColumnsBoard.tsx` 는 본 task 전용 수정으로 다른 에이전트가 건드릴 가능성 낮음.

## 머지 주의

1. `ColumnsBoard.tsx`, `SectionActionsPanel.tsx` 는 prop 계약이 바뀌었다: `SectionActionsPanel` 가 더 이상 `boardId`/`accessToken` 을 받지 않는다. 다른 worktree 에서 `SectionActionsPanel` 을 호출하는 새 경로를 추가했다면 prop 제거 필요.
2. `SectionShareClient` 의 id가 `useId()` 기반이라 스냅샷/스크립트 셀렉터가 고정 id를 기대하지 않는지 확인.
