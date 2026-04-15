# Phase 2 — Scope Decision · responsive-tablet

## IN
- **[IN-T1]** `src/styles/tokens-responsive.css` 신규 — `--tap-min`, `--text-body`, `--text-small`, `--modal-max`, `--modal-max-wide`, `--gap-tap`
- **[IN-T2]** globals import (전역 적용)
- **[IN-U1]** `.card-ctx-menu` hover-only 제거 → 상시 표시. `@media (hover: hover)` 에서만 hover-reveal 애니메이션 유지 (desktop 깔끔함)
- **[IN-U2]** `.ctx-menu-trigger` 28→44px tap-min 준수
- **[IN-U3]** CardAuthorEditor 의 row move/remove 버튼 28→44px
- **[IN-U4]** modal.css `.add-card-modal` max-width 에 `--modal-max-wide` 사용 + 640px 이하 세로 스택
- **[IN-U5]** 학생 로그인 (`auth.css`) 코드 input 터치 친화 (height 44px+, font-size 18px, letter-spacing)
- **[IN-U6]** CardDetailModal 세로 stack — 1199px 이하 media/aside 세로 배치
- **[IN-U7]** DrawingStudio 툴바 버튼 44px
- **[IN-U8]** QuizBoard 답지 버튼 44px + 간격 8px+
- **[IN-U9]** columns board 태블릿 세로 가로 스크롤 명시 (overflow-x)
- **[IN-U10]** FAB bottom 여백 — on-screen keyboard 회피용 환경 padding (iOS env(safe-area-inset-bottom))

## OUT
- 교사 대시보드 반응형
- 학부모 페이지 반응형 (parent v2 별도 task)
- assignment AB-1 grid (이미 3열 @767)
- iPad Pro 12.9 초대형 뷰
- 다크 모드
- 방향(세로↔가로) 전환 시 state 유지 로직

## AC

1. ⋯ 토글 터치/마우스 무관 상시 표시
2. 모든 수정 대상 버튼 44×44 이상
3. 학생 로그인 코드 입력 viewport 80%+ 너비
4. CardDetailModal 1199px 이하 세로 스택
5. Columns 보드 태블릿 세로 horizontal scroll
6. Drawing 툴바 손가락 터치 가능
7. Quiz 답지 간격 8px+
8. 데스크탑 1200px+ 시각 동일 (regression 0)
9. tsc + vitest + build green
10. 기존 54 tests pass

## 위험
- R1 (MED): 하드코드 px 값을 토큰으로 바꿀 때 의도하지 않은 사이즈 변화. 대응: 기존값 유지를 기본 fallback 으로.
- R2 (LOW): `.card-ctx-menu` 상시 표시로 카드 공간 잠식. 대응: 36px 트리거 영역을 카드 우상단으로 absolute positioning 유지, 시각적 무게 최소화 (투명도 / 배경).

## 판정
PASS — 전체 CSS 위주 변경, 예측 가능. phase3→phase7 바로 진행.
