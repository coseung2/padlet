# Design Doc — board-settings-panel

## 1. 데이터 모델 변경

없음. `Section.accessToken` 및 `POST /api/sections/:id/share` 엔드포인트는 기존 그대로.

## 2. API 변경

신규/수정 없음. 기존 엔드포인트 재사용:
- `POST /api/sections/:id/share` — 토큰 발급/회전
- `PATCH /api/sections/:id` — 이름 변경
- `DELETE /api/sections/:id` — 삭제

실시간 이벤트 없음.

## 3. 컴포넌트 변경

### 신규

```
src/components/
  BoardSettingsLauncher.tsx   (client, "use client")
    └─ BoardSettingsPanel.tsx (client, lazy-inlined)
         └─ uses SidePanel primitive
         └─ tabs:
             • BreakoutTab
                 └─ SectionShareRow × N
                      └─ reuses token fetch semantics of SectionShareClient
             • AccessTab      (placeholder)
             • CanvaTab       (placeholder)
             • ThemeTab       (placeholder)
```

### 수정

```
src/app/board/[id]/page.tsx
  └─ BoardHeader (server component 내부)
       • boardId, canEdit 이미 전달 중
       • EditableTitle 우측에 <BoardSettingsLauncher/> 삽입 (canEdit 일 때만)
       • sections (columns 레이아웃일 때만 존재)을 이미 prop로 내려줌 → BoardHeader에는 sectionsForSettings prop 추가(owner/editor + 필요 시)
         * 간단히: page.tsx가 이미 sections를 가지고 있으므로 BoardHeader에 sections prop 추가

src/components/ColumnsBoard.tsx
  • 섹션 헤더 별도 ⋯ 트리거(section-actions-trigger) 제거
  • 기존 ContextMenu items 배열에 rename/delete 추가:
      - {label:"이름 변경", onClick:() => setPanelState({...,"rename"})}
      - {label:"Canva에서 가져오기", ...}
      - (있을 때) PDF 내보내기 / Canva 폴더 정리
      - {label:"섹션 삭제", danger:true, onClick:() => setPanelState({...,"delete"})}
  • setPanelState 초기 tab 은 defaultTab = "rename" (뷰 진입점이 rename 또는 delete 2가지 뿐)
  • ⋯ 트리거는 ContextMenu 하나만 남음

src/components/SectionActionsPanel.tsx
  • Tab type 에서 "share" 제거 → "rename" | "delete"
  • defaultTab 기본값 "rename"
  • share 탭 렌더 블록 삭제
  • SectionShareClient import 제거

src/app/board/[id]/s/[sectionId]/share/page.tsx
  • notice 배너 문구를 "보드 헤더의 ⚙ 설정 → 브레이크아웃" 으로 교체
  • 링크 힌트: 보드 페이지로 돌아가도록 텍스트

src/components/SectionShareClient.tsx
  • 고정 id ("share-url-input", "share-help", "share-regen-warning") 를 useId 기반으로 네임스페이스화 (BoardSettingsPanel에서 N회 렌더 지원)
```

### 상태 위치

- `BoardSettingsPanel` 오픈 상태: `BoardSettingsLauncher` local `useState<boolean>`
- 섹션 리스트 초기값: 서버에서 prop로 전달 (board page에서 이미 조회함)
- 토큰 회전/발급: 낙관적 업데이트(`setSections` 로컬) + 실패 시 롤백. `router.refresh()` 로 서버 컴포넌트 재조회까지 트리거하여 column 재진입 시 최신 token 반영
- placeholder 탭: 자체 상태 없음

## 4. 데이터 흐름

```
사용자 → ⚙ 클릭
  → BoardSettingsLauncher open=true
  → BoardSettingsPanel render (SidePanel open)
    → Breakout tab default → 섹션 리스트 (props 로 전달)
    → "생성" 클릭 → fetch POST /api/sections/:id/share
      → 200 → 로컬 sections 상태 업데이트 + router.refresh()
      → 실패 → status message + 상태 불변
    → "복사" 클릭 → navigator.clipboard.writeText (no API)
  → ESC / backdrop → SidePanel close → opener(⚙) focus 복귀
```

섹션 ⋯ 경로:
```
사용자 → 섹션 ⋯ → ContextMenu dropdown
  → "이름 변경" → setPanelState({tab:"rename"}) → SectionActionsPanel open
  → "삭제"     → setPanelState({tab:"delete"})  → SectionActionsPanel open
  → Canva 항목 → 각자 기존 handler (모달 열림)
```

## 5. 엣지 케이스

1. **columns가 아닌 레이아웃**: sections 배열이 비어 있음 → BoardSettings 브레이크아웃 탭에 "이 레이아웃에는 섹션이 없어요" 빈 상태
2. **columns 레이아웃이지만 섹션 0개**: "섹션을 먼저 추가해 주세요 (보드의 '+ 섹션 추가' 버튼)" 빈 상태
3. **네트워크 오류**: `handleGenerateOrRotate` fetch 실패 → 행 단위 status message, 다른 섹션 동작에 영향 없음
4. **viewer가 URL로 ⚙ 진입 시도**: ⚙ 자체가 렌더되지 않음. 직접 콘솔에서 API 호출해도 `/api/sections/:id/share` 는 이미 서버단에서 owner 체크 → 기존 인증이 막음
5. **여러 섹션 동시 회전**: 각 행이 독립 `busy` 상태. 한 행이 회전 중이라도 다른 행 조작 허용
6. **토큰 복사 실패(clipboard 권한 없음)**: status message "수동으로 복사해 주세요"
7. **SidePanel 닫힌 후 재오픈**: 최신 서버 상태를 보기 위해 `router.refresh()` 가 실행된 상태이므로 서버 re-render 후 최신 props 반영
8. **⋯ 메뉴 열린 상태에서 rename 선택 → SidePanel 오픈**: ContextMenu 자체는 `setOpen(false)` 후 onClick → panelState set → SidePanel 오픈. ContextMenu 드롭다운과 SidePanel이 겹치지 않음
9. **Galaxy Tab S6 Lite landscape(2000×1500)**: 필요 시 stylesheet의 existing `.side-panel` media query (bottom sheet < 768px) 를 그대로 활용. 1500px 태블릿은 desktop variant 로 정상 렌더

## 6. DX 영향

- 타입: `SectionActionsPanel.Props.defaultTab` 타입에서 `"share"` 제거 → caller(`ColumnsBoard`) 가 `"share"` 를 전달하지 않도록 업데이트 필요. 이미 수정 대상.
- 린트: 새 파일은 기존 규칙 준수.
- 테스트: 단위 테스트 없음(이 저장소는 e2e/수동 QA 위주). 추가 없음.
- 빌드: 새 client 컴포넌트 + JS 번들 미세 증가(<5KB 예상).

## 7. 롤백 계획

- 브랜치 단위 revert: `git revert <merge-sha>` (feat/board-settings-panel merge commit)
- 부분 롤백: BoardSettingsLauncher 렌더를 주석 처리하고 `SectionActionsPanel` 의 Tab union에 `"share"` 복원, `ColumnsBoard` 의 이전 이중 ⋯ 구조 복원. Prisma 마이그레이션 없음 → DB 롤백 불필요.
- 사용자 영향: 기존 `/s/[sectionId]/share` URL 과 `POST /api/sections/:id/share` API 가 유지되므로 저장된 공유 링크는 계속 유효.
