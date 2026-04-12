# Scope Decision — board-settings-panel

## 1. 선택한 UX 패턴

`board_settings_side_panel` + `consolidated_section_ellipsis` 병행 채택.

근거(research_pack §3–§4):
- 공유 링크 관리는 보드 소유자의 모둠 모드 결정 → 보드 헤더에 ⚙ 배치가 제품 정체성과 일치
- 섹션 ⋯ 1개로 rename/delete + Canva 옵션 통합 시 z-index 충돌 없이 중복 제거 가능
- Padlet/Miro/ClassKick 공통으로 board-scope 설정은 slide-over/modal, element-scope 메뉴는 요소 조작만 담음

## 2. MVP 범위

### 포함 (IN)
- `src/components/BoardSettingsPanel.tsx` 신규 — 기존 `SidePanel` primitive 재사용, 탭 구조 4개(브레이크아웃 + 준비중 3개)
- 보드 헤더 `EditableTitle` 우측 ⚙ 버튼 (owner/editor 전용) — `BoardHeader`를 클라이언트 wrapper로 바꾸거나 `BoardSettingsLauncher` 클라이언트 컴포넌트 삽입
- `BoardSettingsPanel` 브레이크아웃 탭: 섹션 전체 리스트 + 각 섹션의 토큰 generate/rotate/copy (기존 `SectionShareClient` 로직 재활용, id 네임스페이스화)
- `SectionActionsPanel`에서 "공유" 탭 제거 → rename/delete 2탭
- `ColumnsBoard` 섹션 헤더의 ⋯ 중복 해소 → `ContextMenu`에 rename/delete 아이템을 병합하고 기존 별도 `section-actions-trigger` 버튼 제거. `SectionActionsPanel`은 rename/delete 진입 시에만 열림
- `/s/[sectionId]/share` fallback 안내 문구 업데이트 ("보드 헤더 ⚙ → 브레이크아웃")
- columns 아닌 레이아웃에서 `BoardSettingsPanel` 브레이크아웃 탭 진입 시 "이 레이아웃에서는 섹션이 없어요" 빈 상태
- sections가 비어 있는 columns 보드에서 "섹션을 먼저 추가해 주세요" 빈 상태

### 제외 (OUT)
- 접근 권한/멤버 관리 탭 — 라벨만 "준비 중", 내용은 다음 task
- Canva 연동 설정 탭 — 라벨만 "준비 중"
- 배경/테마 탭 — 라벨만 "준비 중"
- 브레이크아웃 모드 전역 토글 실제 동작(단순 placeholder 토글 비노출 — 오해 소지 제거)
- fallback 라우트 제거(유지하되 배너만 갱신)
- DraggableCard/freeform 계열 수정(본 task 범위 밖, image-pipeline/iframe-virt 에이전트 영역)

## 3. 수용 기준 (Acceptance Criteria)

- [ ] owner/editor 가 보드 헤더에 진입하면 `EditableTitle` 우측에 ⚙ 버튼이 렌더된다
- [ ] viewer 또는 비로그인 사용자에게는 ⚙ 버튼이 렌더되지 않는다 (DOM에 없음)
- [ ] ⚙ 클릭 시 `SidePanel` 기반 `BoardSettingsPanel`이 우측에서 슬라이드되고 제목은 "보드 설정"이다
- [ ] 탭은 [브레이크아웃, 접근 권한(준비 중), Canva 연동(준비 중), 테마(준비 중)] 4개이며 첫 진입 시 "브레이크아웃"이 active이다
- [ ] 브레이크아웃 탭은 현재 보드의 sections를 order asc로 나열하고 각 행에 토큰 상태(없음/있음) + 생성 또는 회전 버튼 + 복사 버튼이 있다
- [ ] 토큰 생성/회전/복사 3동작은 `POST /api/sections/:id/share`를 그대로 호출하고 UI에 즉시 반영된다(낙관적 업데이트 + 실패 롤백)
- [ ] columns 레이아웃의 각 섹션 헤더에는 ⋯ 버튼이 정확히 **1개** 렌더된다 (owner/editor) — ⋯ 메뉴에 `이름 변경`, `삭제`, `Canva에서 가져오기`(+ Canva 링크 존재 시 `PDF 내보내기`, `Canva 폴더로 정리`)가 순서대로 노출
- [ ] viewer는 섹션 헤더에 ⋯ 버튼을 보지 않는다
- [ ] `SectionActionsPanel` 의 탭은 [이름 변경, 삭제] 2개이며 "공유" 탭은 DOM에 존재하지 않는다
- [ ] `/board/[id]/s/[sectionId]/share` 페이지 진입 시 안내 배너가 "보드 헤더의 ⚙ 설정 → 브레이크아웃" 문구를 포함한다
- [ ] `npx tsc --noEmit` 성공 + `npm run build` 성공
- [ ] Galaxy Tab S6 Lite UA(Chrome Android, 1500×2000) 에서 패널 열림·닫힘·복사 동작이 레이아웃 깨짐 없이 수행된다

## 4. 스코프 결정 모드

**Selective Expansion** — UI 진입점 재배치 + 섹션 헤더 정리만 포함. 모둠 모드 토글·멤버·테마는 후속 task로 분리.

## 5. 위험 요소

- **상태 동기화**: BoardSettingsPanel에서 토큰 회전 후 `/board/[id]/s/[sectionId]/share` 서버 컴포넌트에서 읽은 `section.accessToken` 은 stale. 회전은 현재 패널 내 상태만 업데이트하면 충분(fallback 페이지는 진입 시 DB 조회). 다만 같은 보드에서 columns 재렌더 시 props로 내려가는 `initialSections`가 갱신되지 않으므로 `router.refresh()` 호출해 section accessToken을 최신화한다.
- **id 중복**: `SectionShareClient` 의 `share-url-input`·`share-help` 고정 id가 BoardSettingsPanel에서 N회 렌더될 때 중복 위반. 컴포넌트 안에 `useId()` 로 네임스페이스 부여.
- **z-index**: `SidePanel` + Canva 모달(`CanvaFolderModal`) 중첩 시. Canva 액션은 섹션 ⋯ 경로에서만 열리므로 BoardSettingsPanel과 동시 오픈 경로가 없음 — 리스크 낮음.
- **코드 동시 편집**: `image-pipeline`·`iframe-virtualization` 에이전트가 `DraggableCard.tsx` / `next.config.ts` 를 건드릴 수 있다. 본 task는 두 파일을 건드리지 **않으며** 컬럼 레이아웃의 `article.column-card` 만 수정하므로 논리적 충돌 없음. 혹시 겹치면 `phase7/coordination_notes.md` 에 기록.
- **접근성 포커스**: 같은 ⋯ 메뉴 안에서 rename 선택 → SidePanel 열림 → SidePanel 닫을 때 opener(ContextMenu 트리거)로 포커스 복귀 필요. 기존 `SidePanel` 이미 `openerRef` 구현.
- **Galaxy Tab S6 Lite**: 1500px 가로에서 SidePanel 420px + 컬럼 보드 잔여 1080px → 2열 컬럼 유지 가능. 그러나 세로 2000px(landscape 사용 시) 스크롤 동선은 수동 확인 필수.
