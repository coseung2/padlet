# Phase 1 — Researcher · responsive-tablet

## 1. 발견된 이슈

### 1.1 ⋯ 토글 hover 의존 (보고된 문제)
- `src/styles/card.css:242-254` — `.card-ctx-menu` 가 기본 `display: none` + `:hover` 상태에서만 `display: block`.
- 4 board 레이아웃(column/grid/stream/padlet) 모두 hover 가정. 대상 기기 = Galaxy Tab S6 Lite Android Chrome:
  - hover 이벤트 없음 → 카드를 **포커스** 하거나 터치하지 않으면 ⋯ 영영 안 보임.
- 수정: 기본 `display: block` + `@media (hover: hover)` 조건부로 숨김/표시 토글 (데스크탑 깔끔함 유지).

### 1.2 터치 타깃 사이즈
- `.add-card-fab` 56×56 ✅
- `.assign-fab` 56px ✅
- `.modal-close` × 버튼 (card-detail 등) 작게 설정된 곳 확인 필요
- ContextMenu 트리거 (⋯) 28px — **미달**
- CardAuthorEditor 의 row 이동 버튼 28×28 — **미달**
- Quiz 답지 버튼 — 기존 CSS 확인 필요

### 1.3 기존 @media 분포
- `responsive.css` — 전역 breakpoint 모음 존재 (확장 포인트)
- `assignment.css` 767 세로 태블릿 ≤ 3열 이미 대응
- `modal.css` 반응형 있음
- `auth.css` (학생 로그인) 반응형 확인 필요

### 1.4 스캔된 grep 결과 정리
- 카드 ctx-menu hover 1곳
- FAB 이미 터치 친화
- 나머지는 pixel-hard-coded → 토큰화 가치 큼

## 2. 반응형 토큰 디자인 (신규)

```css
:root {
  /* Touch targets — minimum 44px (iOS HIG, ~Material 48dp). */
  --tap-min: 44px;

  /* Body text scale — 14px floor, 16px cap, 1.1vw fluid middle. */
  --text-body: clamp(14px, 1.1vw, 16px);
  --text-small: clamp(12px, 0.95vw, 13px);

  /* Modal width — always fits viewport with breathing room. */
  --modal-max: min(92vw, 640px);
  --modal-max-wide: min(94vw, 960px);

  /* Safe gap for touch rows — slightly more than spacing tokens. */
  --gap-tap: 10px;

  /* Breakpoints (documentation — CSS media queries hard-code for now). */
  /*  sm:  <=480px (phone)
      md:  <=767px (phone landscape / small tablet)
      lg:  <=1199px (tablet portrait) — 주요 타깃
      xl:  >=1200px (desktop) */
}
```

환경 쿼리:
- `@media (hover: hover)` — 마우스 기기
- `@media (pointer: coarse)` — 터치 기기
- `@media (max-width: 1199px)` — 태블릿 포트레이트 포함

## 3. 영향 파일 매트릭스 (학생 동선 + 토큰)

| 파일 | 변경 | 이유 |
|---|---|---|
| `src/styles/tokens-responsive.css` | NEW | primitive |
| `src/app/layout.tsx` or globals import | 1줄 | 신규 CSS import |
| `src/styles/card.css` `.card-ctx-menu` | hover 제거 + 기본 표시 | ⋯ 상시 |
| `src/styles/modal.css` | modal-max 변수 사용 + 세로 스택 break | 모달 |
| `src/styles/auth.css` | 학생 로그인 input/button | 코드 입력 UX |
| `src/styles/boards.css` | columns 가로 스크롤 OR 세로 스택 | 컬럼 보드 |
| `src/styles/quiz.css` | 답지 버튼 tap-min | quiz |
| `src/styles/drawing.css` | 툴바 버튼 크기 | 그림 |
| `src/styles/card.css` | card-ctx-menu 트리거 sizing | ⋯ 자체 터치 |
| `src/styles/misc.css` `.ctx-menu-trigger` | 28→44px | 컨텍스트 메뉴 버튼 |

DOM 쪽 변경은 거의 없음 — 거의 CSS 만.

## 4. 리스크

- `@media (hover: hover)` 호환성 — 모든 모던 브라우저 OK.
- ⋯ 상시 표시 시 desktop 에서도 항상 보임 — 사용자 의도대로. 원래 hover-only 는 "깔끔한 기본 상태" UX 였지만 터치 우선으로 트레이드.
- fluid clamp() 폰트 — 구형 브라우저 fallback 없음 (S6 Lite Chrome 은 최신 수준이라 무관).

## 5. 판정

**PASS** — 영향 파일 한정 + 토큰 primitive 명확 + ⋯ 상시 요구 직결. phase2 scope 바로 확정.
