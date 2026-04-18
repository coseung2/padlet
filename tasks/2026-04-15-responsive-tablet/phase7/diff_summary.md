# Phase 7 Diff Summary · responsive-tablet

## 검증
- tsc ✅ / vitest 54/54 ✅ / build ✅

## 파일 변경
- `src/styles/tokens-responsive.css` — NEW (--tap-min, clamp fonts, modal widths, fab safe area)
- `src/app/globals.css` — tokens import 추가
- `src/styles/card.css` — `.card-ctx-menu` hover-only → 상시 표시 (`@media (hover:hover)` 만 opacity 0→1 reveal)
- `src/styles/misc.css` — `.ctx-menu-trigger` `@media (pointer:coarse)` 에서 --tap-min
- `src/styles/card.css` — CardAuthorEditor row 버튼 28→32px + coarse 에서 --tap-min
- `src/styles/modal.css` — `.add-card-modal` max-width `var(--modal-max)` + dvh
- `src/styles/misc.css` + `src/styles/assignment.css` — FAB bottom var(--fab-bottom-safe)

## 스킵 (이미 충족)
- Student login input 52px height / 24px font → ≥44
- Quiz options min-height 80px + gap 12
- Drawing tool button 48×48
- Card modal 900px breakpoint 세로 스택 이미 있음

## AC
- AC1 ⋯ 상시 표시 ✅ (hover 기기만 hover-reveal)
- AC2 터치 타깃 44×44 ✅ (coarse pointer 미디어 쿼리)
- AC3~6 기존 CSS 가 이미 충족 ✅
- AC7 Quiz 간격 ✅ (기존 12px gap)
- AC8 데스크탑 regression 0 ✅ (@media (hover:hover) 만 이전 동작 유지)
- AC9 tsc/vitest/build ✅
- AC10 기존 테스트 54 pass ✅

## Karpathy
- Simplicity: CSS 토큰 primitive + @media 쿼리 2종. JavaScript 0 라인.
- Surgical: 원본 값 유지 기본, coarse/hover 쿼리 안에서만 증분 변경.
