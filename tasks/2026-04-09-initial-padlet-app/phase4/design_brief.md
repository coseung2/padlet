# Design Brief — initial-padlet-app

## 1. 화면/상태 목록

### 화면: `/board/[id]`

| 상태 | 조건 | 렌더 |
|---|---|---|
| empty | board 존재 + 카드 0개 + editor+ | "아직 카드가 없어요. + 버튼을 눌러 첫 카드를 추가하세요" |
| empty-readonly | board 존재 + 카드 0개 + viewer | "아직 카드가 없습니다" |
| ready | 카드 ≥ 1 | 카드들이 wall/grid에 렌더 |
| dragging | 사용자가 카드 드래그 중 | 드래그 중 카드 shadow 증가, cursor grabbing |
| error | API 호출 실패 | 작은 toast 또는 상단 배너 |

### 글로벌 UI (모든 화면 공통)

- 상단 바: 보드 제목 + ThemeSwitcher (3개 버튼) + UserSwitcher (owner/editor/viewer)
- 카드 추가 버튼 (editor+만) — 우하단 플로팅 or 상단 바
- 역할 표시 배지 (현재 사용자 + 역할)

## 2. 정보 계층

1. 보드 제목 (최상위)
2. 카드 콘텐츠 (주요 작업 공간)
3. 테마/사용자 스위처 (비기능적 컨트롤)
4. 역할 배지 (상태 정보)

시선 흐름: 상단 바 제목 → 카드 캔버스 → 필요 시 우하단 추가 버튼.

## 3. 인터랙션 명세

| 행동 | 시스템 반응 |
|---|---|
| 카드 클릭 | 편집 모드 진입 (inline 편집, editor+만) |
| 카드 드래그 시작 | shadow 증가, cursor grabbing |
| 카드 드롭 | 낙관적 업데이트 → PATCH 요청 → 실패 시 revert + toast |
| 카드 추가 버튼 클릭 | 빈 카드 생성 + 즉시 편집 모드 |
| 카드 삭제 (hover 시 X 버튼) | 확인 후 DELETE — owner 또는 author 본인만 |
| 테마 버튼 클릭 | `?theme=X` URL 교체, 즉시 CSS 변수 변경 |
| 사용자 버튼 클릭 | `?as=X` URL 교체 + 쿠키 설정, 페이지 리프레시 |

## 4. 접근성 요구

- 키보드 전용 조작: 카드 간 Tab 이동, Enter로 편집, Delete로 삭제
- 포커스 가시성: 각 테마마다 고유 포커스 스타일 (figma=dashed, miro=blue ring, notion=blue solid)
- 명도 대비: 본문 텍스트는 WCAG AA 이상 (테마별 확인)
- 스크린리더 라벨: 카드 role="article", aria-label에 제목, ThemeSwitcher role="radiogroup"
- 드래그는 키보드로도 가능해야 함 (dnd-kit의 KeyboardSensor 사용)

## 5. 디자인 시스템 확장

CSS 변수 기반 테마 토큰 (globals.css에서 정의, `[data-theme="X"]` 셀렉터로 오버라이드):

```css
:root {
  --color-bg: …;
  --color-surface: …;
  --color-text: …;
  --color-text-muted: …;
  --color-accent: …;
  --color-border: …;

  --radius-card: …;
  --radius-btn: …;

  --font-display: …;
  --font-body: …;

  --shadow-card: …;

  --focus-outline: …;
}
```

3개 테마(figma/miro/notion) 각각 위 토큰을 재정의.

### 테마별 차별 포인트

| 토큰 | Figma | Miro | Notion |
|---|---|---|---|
| bg | #ffffff | #ffffff | #f6f5f4 (웜화이트) |
| surface (카드) | #ffffff | 파스텔 랜덤 (coral/teal/yellow…) | #ffffff |
| text | #000000 | #1c1c1e | rgba(0,0,0,0.95) |
| accent | 그라데이션 hero | #5b76fe (Blue 450) | #0075de (Notion Blue) |
| radius-card | 8px | 12px | 12px |
| radius-btn | 50px (pill) | 8px | 4px |
| font-display | "figmaSans", Inter, sans | "Roobert PRO", Inter, sans | "NotionInter", Inter, sans |
| shadow-card | subtle | ring-shadow `0 0 0 1px rgba(224,226,232,1)` | 4-layer soft |
| focus | dashed 2px black | 2px solid #5b76fe ring | 2px solid #097fe8 |

웹에 도달 가능한 실제 폰트가 아닌 경우 (figmaSans, Roobert PRO, NotionInter) **Inter로 폴백**하되 weight/letter-spacing/line-height는 DESIGN.md 스펙을 따라 재현.
