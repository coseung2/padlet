# Research Pack — board-settings-panel

## 1. 배경

`tasks/2026-04-12-breakout-section-isolation` 에서 섹션 격리 공유(브레이크아웃)를 도입했고, `tasks/2026-04-13-section-actions-panel` 에서 그 진입점을 섹션 ⋯ → SidePanel `공유/이름 변경/삭제` 탭으로 통합했다. v2 배포 피드백(tasks/2026-04-13-section-actions-panel/FEEDBACK_pending.md) 에서 다음 두 가지가 드러났다.

1. 공유 링크는 **보드 소유자의 모둠 모드 설정** — 섹션 로컬 속성이 아니라 보드 전반의 설정이다.
2. columns 보드 섹션 헤더에 ⋯가 2개 렌더된다 — `ColumnsBoard.tsx` 안에서 `SectionActionsPanel` 트리거(`⋯` button)와 기존 `ContextMenu`(Canva 정리/가져오기 메뉴)의 ⋯ 트리거가 겹친다.

## 2. 벤치마크

| 제품 | 비슷한 패턴 | 출처 |
|---|---|---|
| Padlet (Sandbox 2025) | 우상단 ⚙ 톱니가 board settings modal을 연다 (Appearance / Activity / Permissions 탭) | padlet.com helpdocs `board-settings` |
| Miro (2025) | Board menu 우측 상단, Share 모달 안에 Breakout/공동 편집자 초대가 같이 있음 | miro.com/app/board docs |
| FigJam | Share 버튼 옆 "File ⋯" 메뉴에서 Breakout 등 협업 기능 통합 | help.figma.com |
| ClassKick | 선생님 보드 헤더 좌측 ⚙ 아이콘이 "Class Settings" slide-over 열림. 좌측 탭: 학생/공유/아카이브 | classkick.com help |

**공통 패턴**: 보드/캔버스 수준의 설정(공유 링크, 멤버, 모드)은 보드 헤더 혹은 우상단 ⚙에서 slide-over/모달로 연다. 섹션/요소 단위 메뉴에는 **요소 자체의 조작(rename/delete/복제)** 만 둔다.

## 3. 채택할 UX 패턴

- `board_settings_side_panel` — 보드 헤더 타이틀 **우측**에 ⚙ 아이콘 버튼. 클릭 시 우측 슬라이드 `SidePanel`(기존 primitive 재사용) 오픈. 탭 구조:
  - 브레이크아웃 — 섹션 리스트 + 행별 토큰 발급/회전/복사
  - 접근 권한 / Canva 연동 / 테마 — 플레이스홀더 탭("준비 중")

- 섹션 헤더는 ⋯ **1개**로 통일:
  - rename / delete (기존 `SectionActionsPanel`의 잔여 2탭)
  - Canva에서 가져오기 / PDF 내보내기 / Canva 폴더로 정리 (기존 `ContextMenu` 항목)

## 4. 구현 관점 장단점

| 안 | 장점 | 단점 |
|---|---|---|
| A. SectionActionsPanel에 "Canva" 탭 추가 | 탭 UI 일관 | Canva 모달(폴더/Export)이 패널 위로 띄워져 z-index 충돌, Canva 로직이 섹션 컴포넌트에 응집되지 않음 |
| **B. SectionActionsPanel ⋯는 rename/delete만, ContextMenu에 rename/delete를 병합** | ContextMenu는 이미 Canva 모달을 여는 `onClick` 콜백이라 단순, ⋯ 1개 유지, 다이얼로그 분리 필요 없음 | rename/delete는 모달(SidePanel)을 여는 메뉴라 메뉴→패널의 2단계가 유지됨(수용 가능) |
| C. 완전 신규 통합 메뉴 | 일관성 최고 | 변경폭 큼, phase 계약상 out-of-scope |

→ **B 채택**: 변경 폭 최소 + ⋯ 중복 해소 + Canva 모달 z-index 안전.

## 5. 위험/주의

- ⚙ 버튼 가시성: viewer는 숨기고 owner/editor만 노출.
- Breakout tab 생성 시 섹션 목록이 비어 있는 board(layout != columns, 또는 0개 섹션)에서는 "섹션이 아직 없어요" 빈 상태 필요.
- `SectionShareClient` 는 현재 `share-panel`/`share-url-input` 고정 id를 사용 → 한 패널 안에서 N개 섹션을 리스트할 때 중복 id 방지 필요(id를 sectionId 기반으로 변경).
- Galaxy Tab S6 Lite(1500×2000, Chrome Android) 에서 SidePanel 420px + board 본문 여유 유지 확인.
