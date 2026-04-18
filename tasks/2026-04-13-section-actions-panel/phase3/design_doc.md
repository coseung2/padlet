# Design Doc — section-actions-panel

## 0. 컨텍스트
peer: `docs/architecture.md` 는 Next.js 16 App Router + React 19 + Prisma + NextAuth 5 스택 확정. 본 task 는 스택 변경 없음 — 기술 스택 결정은 첫 feature task 의 phase3 에서만 내린다는 규칙 준수.

## 1. 컴포넌트 트리 (변경 후)

```
src/components/
├── ui/
│   └── SidePanel.tsx            [NEW] 범용 우측 슬라이드 시트 프리미티브
├── SectionActionsPanel.tsx      [NEW] 섹션 관리 전용 (SidePanel 래핑)
├── SectionShareClient.tsx       [reused as-is]
├── EditSectionModal.tsx         [deprecated — ColumnsBoard 에서 import 제거. 파일 자체는 보존(미참조)]
├── ColumnsBoard.tsx             [MODIFY]
└── plant/
    └── StageDetailSheet.tsx     [MODIFY — inner aside+backdrop → <SidePanel>]
```

## 2. `SidePanel` API

```ts
// src/components/ui/SidePanel.tsx
export type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;                       // aria-label 용
  labelledBy?: string;                 // 외부 heading id 가 있으면 title 대신 사용
  children: React.ReactNode;
  width?: number;                      // desktop width (default 420)
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  footer?: React.ReactNode;            // MVP: 선언만, SectionActionsPanel 은 미사용
  className?: string;                  // content 영역 추가 class
};
```

### 내부 구현 원칙
- `useEffect` 로 open 시:
  1. ESC keydown listener
  2. `document.body.style.overflow = 'hidden'` + cleanup 시 복구
  3. `initialFocusRef?.current?.focus()` 또는 내부 close 버튼 focus
- Tab/Shift+Tab keydown 을 panel root 에서 잡아 first/last focusable 순환
- backdrop 은 `<button type="button" aria-label="닫기" />` (plant 방식 유지, 키보드 진입 허용)
- 반응형: >=768px 우측 고정, <768px 바텀시트. CSS 에서 분기.

## 3. `SectionActionsPanel` API

```ts
type Tab = "share" | "rename" | "delete";

export type SectionActionsPanelProps = {
  open: boolean;
  onClose: () => void;
  section: { id: string; title: string; accessToken: string | null };
  boardId: string;
  currentRole: "owner" | "editor" | "viewer";
  defaultTab?: Tab;
  onRenamed: (newTitle: string) => void;     // ColumnsBoard optimistic update
  onDeleted: () => void;                     // ColumnsBoard optimistic remove
};
```

### 탭 구성
- `share`: `<SectionShareClient boardId sectionId initialToken />` 그대로. role !== owner 일 때 상단에 안내 블록.
- `rename`: 새 서브컴포넌트 `SectionRenameForm` (EditSectionModal 의 form 내용 이식). 저장 성공 시 `onRenamed(newTitle)`.
- `delete`: 체크박스 "이 섹션을 삭제하며 카드는 섹션 없음으로 이동합니다" → 빨간 버튼. 클릭 시 DELETE 호출, 성공 시 `onDeleted()` + `onClose()`.

### 탭 헤더 접근성
- `<div role="tablist" aria-label="섹션 옵션">`
- 각 `<button role="tab" aria-selected aria-controls="section-panel-panel-{tab}">`
- `<div role="tabpanel" id="...">` 하나만 렌더 (lazy)
- 좌우 화살표 이동은 MVP 에서 제외. 탭 클릭만.

## 4. ColumnsBoard 변경

```tsx
// 새 상태
const [actionsSection, setActionsSection] = useState<{ section, tab } | null>(null);

// 섹션 헤더 (canEdit 일 때만)
<button
  type="button"
  className="section-actions-trigger"
  aria-label={`${section.title} 섹션 옵션`}
  onClick={() => setActionsSection({ section, tab: "share" })}
>⋯</button>

// ContextMenu 항목 축소: Canva 관련만 유지. "수정"/"삭제" 제거.

// 렌더:
{actionsSection && (
  <SectionActionsPanel
    open={true}
    onClose={() => setActionsSection(null)}
    section={...}
    boardId={boardId}
    currentRole={currentRole}
    defaultTab={actionsSection.tab}
    onRenamed={(t) => setSections(list => list.map(s => s.id === actionsSection.section.id ? {...s, title: t} : s))}
    onDeleted={() => {
      setSections(list => list.filter(s => s.id !== actionsSection.section.id));
      setCards(list => list.map(c => c.sectionId === actionsSection.section.id ? {...c, sectionId: null} : c));
      setActionsSection(null);
    }}
  />
)}
```

`editingSection` 상태, `EditSectionModal` 렌더, `handleEditSectionSave`, `handleDeleteSection` 은 제거 (SectionActionsPanel 내부로 이동).

## 5. StageDetailSheet 리팩터

```tsx
// 변경 전: <button backdrop /> + <aside role=dialog>
// 변경 후:
return (
  <SidePanel
    open={open}
    onClose={onClose}
    title={`${stage.order}단계 · ${stage.nameKo}`}
    className="plant-sheet-body"   // 기존 plant-obs-* 스타일 유지용
  >
    {/* 기존 콘텐츠(h2 제외, SidePanel 이 렌더) */}
  </SidePanel>
);
```

기존 `.plant-sheet-head`, `.plant-sheet` 클래스의 CSS 는 유지하지만 StageDetailSheet 는 더 이상 그 클래스를 사용하지 않음. plant-obs-* 는 그대로 사용. 따라서 plant.css 의 `.plant-sheet-*` 셀렉터는 _dead code_ 가 되나 v2 브랜치 충돌 회피 위해 보존.

## 6. 데이터 모델
변경 없음. Prisma 스키마 변경 없음.

## 7. API
변경 없음. 기존 사용:
- `POST /api/sections/:id/share` (owner-only)
- `PATCH /api/sections/:id` (owner/editor)
- `DELETE /api/sections/:id` (owner-only, 기존 라우트 확인 필요)

## 8. CSS
신규 `src/styles/side-panel.css`:
- `.side-panel-backdrop`, `.side-panel`, `.side-panel-head`, `.side-panel-title`, `.side-panel-body`
- `.side-panel-tabs`, `.side-panel-tab`
- 기존 plant-sheet 와 동일 토큰 사용해 시각적 일관성 유지
- z-index: backdrop 90, panel 100 (plant 와 동일)

`src/app/layout.tsx` 에서 `globals.css` 를 import 하므로 `globals.css` 에 `@import './styles/side-panel.css'` 추가 (다른 CSS 들의 import 패턴과 일치).

## 9. 배포 영향
- Vercel Functions 런타임/리전 변경 없음 (icn1 유지)
- DB 마이그레이션 없음
- 환경변수 변경 없음

## 10. 테스트 전략
- typecheck PASS
- build PASS
- manual smoke in dev server (phase9):
  1. columns 보드 섹션 헤더 ⋯ → 패널 열림
  2. 공유 토큰 생성/회전/복사
  3. 이름 변경 저장
  4. 삭제 플로우
  5. ESC/backdrop 닫기
  6. viewer 에서 ⋯ 없음 확인 (UserSwitcher 로 role 변경)
  7. plant teacher matrix 에서 StageDetailSheet 열기/닫기

## 11. 오픈 이슈 / 의문
- `DELETE /api/sections/:id` 가 viewer 403, editor 403 인지 확인 필요 (phase7 에서 코드 검토)
- `editor` 에게 이름 변경 권한이 있는지: 기존 `PATCH /api/sections/:id` 가 editor 허용하면 패널도 허용. 아니면 공유 탭과 동일하게 안내.
