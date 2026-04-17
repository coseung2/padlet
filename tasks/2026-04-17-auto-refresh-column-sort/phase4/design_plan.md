# Phase 4 — Design Plan

신규 토큰 없음. 기존 `boards.css`의 column-header 패턴 안에 정렬 select만 삽입.

## 변경 표면

- `.column-header` — flex 행. 제목 + 카운트 + select + ⋯메뉴.
- 신규 클래스
  - `.column-sort-select` — 작은 select. 폰트 11~12px, 패딩 2~4px, border 없음(누르면 native dropdown).
  - `.column-sort-active` — 정렬이 manual 외일 때 select에 약한 강조 배경.

## 상태 표기

- 라벨 옵션: `수동`, `최신`, `오래된`, `제목`.
- `aria-label="정렬 기준"`.

## 자동 동기화 인디케이터

- 별도 토스트/뱃지 없음. 카드가 자연스럽게 추가/이동되는 경험으로 충분.
- 향후 phase에서 "동기화 중" pulsing dot 추가 검토.
