# Phase 3 — Architecture · responsive-tablet

## 1. CSS 변수 정의

### `src/styles/tokens-responsive.css`
```css
:root {
  --tap-min: 44px;
  --text-body: clamp(14px, 1.1vw, 16px);
  --text-small: clamp(12px, 0.95vw, 13px);
  --modal-max: min(92vw, 640px);
  --modal-max-wide: min(94vw, 960px);
  --gap-tap: 10px;
}
```

import 는 `src/app/globals.css` 또는 기존 import 체인에 추가.

## 2. 수정 명세 (파일별)

### 2.1 `src/styles/card.css` — ⋯ 토글 상시 표시
```css
.card-ctx-menu { position: absolute; top: 8px; right: 8px; display: block; }
@media (hover: hover) {
  .card-ctx-menu { opacity: 0; transition: opacity 120ms; }
  .column-card:hover .card-ctx-menu,
  .grid-card:hover .card-ctx-menu,
  .stream-card:hover .card-ctx-menu,
  .padlet-card:hover .card-ctx-menu { opacity: 1; }
}
```
- hover 기기(데스크탑)는 기존 hover-reveal UX
- 터치 기기 = no-hover = 항상 보임

### 2.2 `src/styles/misc.css` — `.ctx-menu-trigger`
```css
.ctx-menu-trigger { min-width: var(--tap-min); min-height: var(--tap-min); ... }
```

### 2.3 `src/styles/card.css` — CardAuthorEditor row 버튼
`.card-author-row-actions button { width: var(--tap-min); height: var(--tap-min); }`

### 2.4 `src/styles/modal.css` — 모달 폭 + 세로 스택
- `.add-card-modal` max-width 를 `var(--modal-max-wide)` 로
- CardDetailModal `.card-detail-body` 1199px 이하 세로 stack (flex-direction column)

### 2.5 `src/styles/auth.css` — 학생 로그인
- 코드 input: height 48px, font-size 20px, letter-spacing 2px
- 큰 숫자 패드 스타일 버튼이 있으면 44px+

### 2.6 `src/styles/drawing.css` — 툴바
- 툴바 버튼 `.tool-btn` 등 44×44

### 2.7 `src/styles/quiz.css` — 답지
- `.quiz-answer-btn` 최소 높이 56px, margin 8px+

### 2.8 `src/styles/boards.css` — columns 보드 세로 스크롤
- `.columns-board` overflow-x: auto; `.column` min-width 240px

### 2.9 FAB — on-screen keyboard safe area
`.add-card-fab`, `.assign-fab` bottom `calc(32px + env(safe-area-inset-bottom, 0px))`

## 3. 검증 방법

- `npx tsc --noEmit` ✅
- `npm run build` ✅
- `npx vitest run` — 기존 54 tests 계속 pass
- 수동: 로컬 dev 서버에서 Chrome DevTools Galaxy Tab S6 (emulation) — 주요 서피스 클릭/탭 가능성 확인

## 4. 롤백
- tokens-responsive.css import 제거
- 각 @media / hover 블록 git revert
- DOM 변경 없어 안전

## 5. 판정
PASS — phase4/5/6 skip (시각 신규 디자인 없음), phase7 바로 진입.
