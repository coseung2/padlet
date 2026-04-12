# Design Brief — board-settings-panel

## 1. 화면/상태 목록

### ⚙ 버튼 (board header)
- ready: 톱니 아이콘(⚙ 글리프 또는 SVG) 24×24, 버튼 높이 32px, `board-title-editable` 와 같은 baseline
- hover: 배경 `--surface-hover` 살짝 강조
- focus: 링크 스타일과 동일한 포커스 링

### BoardSettingsPanel (SidePanel)
- header: 제목 "보드 설정" + × 닫기
- tablist: 4탭 (브레이크아웃 active, 나머지 3개는 dimmed + "(준비 중)" 접미어)
- body: 탭별 콘텐츠

### Breakout tab
- empty (layout != columns): "이 레이아웃에는 섹션이 없어요. columns 레이아웃에서만 브레이크아웃 링크를 만들 수 있어요."
- empty (columns, sections=0): "섹션을 먼저 추가해 주세요. 보드의 '+ 섹션 추가' 버튼으로 만들 수 있어요."
- ready (섹션 ≥ 1):
  - 각 row:
    ```
    [섹션 타이틀]                          상태badge(있음/없음)
    [공유 URL input (token 있을 때)]       [복사] [재발급]
    [또는 '공유 링크 생성' 버튼 (없을 때)]
    ```
- busy: 해당 행 버튼 disabled + "생성 중..."/"회전 중..."
- error: row 하단 status message `share-status` 스타일, 다른 row 독립

### Future tabs (Access / Canva / Theme)
- placeholder body: 중앙 정렬 텍스트 "준비 중이에요. 곧 이곳에서 {description}을 관리할 수 있어요." + 비활성 회색 아이콘

### Section header ⋯ (ColumnsBoard)
- ready (owner/editor): `ContextMenu` 단일 ⋯ 트리거. 드롭다운에 [이름 변경, 섹션 삭제, Canva에서 가져오기, PDF 내보내기(조건부), Canva 폴더로 정리(조건부)] — 삭제만 danger 스타일
- hidden (viewer): 렌더하지 않음

### Section actions panel (rename/delete)
- tablist: [이름 변경, 삭제] 2개 (공유 탭 삭제됨)
- ready / busy / error 상태는 기존과 동일

## 2. 정보 계층

1. **1차**: 섹션 타이틀 (어떤 섹션인지 즉시 식별)
2. **2차**: 토큰 상태(있음/없음) 및 주요 액션(생성/복사)
3. **3차**: 회전 버튼, 도움말 텍스트

시선 흐름: 좌→우(타이틀 → 상태 → 액션). 탭 네비게이션은 수평 상단.

## 3. 인터랙션 명세

- ⚙ 클릭 → 300ms 이내 SidePanel slide-in, 포커스는 close 버튼
- 탭 클릭 → active 탭 전환, tabpanel 컨텐츠 즉시 교체(애니메이션 없음, 빠른 응답)
- 준비 중 탭 클릭 → 비활성이 아니라 활성화되되 placeholder 컨텐츠 노출(ui 탐색 허용)
- "공유 링크 생성" 클릭 → fetch → 성공 시 상태 expand(URL input + 복사/재발급 노출) + status "새 링크가 생성되었습니다"
- "재발급" 클릭 → confirm → fetch → 성공 시 input 값 교체 + status
- "복사" 클릭 → clipboard → "복사됨 ✓" 1.5s fade
- ESC/backdrop → close, opener 포커스 복귀
- 섹션 ⋯ → 드롭다운 토글, 바깥 클릭 시 닫힘(기존 ContextMenu 동작 유지)
- ⋯ → "이름 변경" 클릭 → 드롭다운 닫힘 + SectionActionsPanel(rename 탭) 오픈

## 4. 접근성 요구

1. **키보드 only**: Tab으로 ⚙ 도달 가능 → Enter/Space로 패널 오픈. 탭 리스트는 방향키 없이도 Tab 순회로 접근 가능(공격적 키보드 사용자는 ARIA roving 없이도 사용). ESC로 닫기. `tabindex` 트랩(SidePanel 구현 재사용)
2. **스크린리더**: ⚙ 버튼 `aria-label="보드 설정 열기"`, 패널 `role="dialog" aria-modal="true" aria-labelledby={title}`, tablist `role="tablist" aria-label="보드 설정 탭"`, 각 탭 `aria-selected`. 준비 중 탭은 `aria-disabled="false"`(탐색은 가능하지만 상태 설명 포함)
3. **명도 대비**: 준비 중 탭 라벨은 `--text-secondary` 로 렌더하되 4.5:1 대비 유지. danger 항목(섹션 삭제)은 기존 `ctx-menu-item-danger` 토큰 유지

## 5. 디자인 시스템 확장 여부

기존 토큰/컴포넌트로 충분:
- `SidePanel` primitive 재사용
- `.side-panel-tabs`, `.side-panel-tab`, `.section-panel-notice`, `.share-panel`, `.share-actions`, `.share-url-input`, `.column-add-btn`, `.column-inline-add`, `.ctx-menu-*` 재사용

**신규 요청**:
- `.board-settings-trigger` — ⚙ 버튼(text-button 스타일, padding 4px)
- `.board-settings-row` — 브레이크아웃 탭의 한 섹션 행(flex column, gap-sm, 경계선)
- `.board-settings-row-title` — 섹션 이름 + 상태 뱃지 라인
- `.board-settings-empty` — 중앙 정렬 빈 상태
- `.board-settings-placeholder` — 준비 중 탭 placeholder

이 클래스들은 `src/styles/side-panel.css` 에 append.
