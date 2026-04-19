# Layout math — DJ Board 3-column

## 그리드 정의

`.dj-board`:
- `max-width: 1300px`
- `padding: 24px 16px 40px` (좌우 16px씩 컨텐트박스에서 제외)
- `grid-template-columns: 160px minmax(320px, 1fr) 260px`
- `gap: 20px` (컬럼 사이 2 × 20px)

## 가용 컬럼 총합

뷰포트 W에서 실제 그리드 폭:
```
W_grid = min(W - scrollbar, 1300) - 32(padding) - 40(gaps)
       = min(W, ~1283) - 72
```

각 컬럼 너비:
- 좌(played stack): **160px 고정**
- 중(main): `W_grid - 160 - 260` (1fr)
- 우(ranking): **260px 고정**

## 뷰포트별 구체값

| 뷰포트 W | W_grid | 중앙 | 좌/중/우 비율 |
|---|---|---|---|
| 1280px (분기 하한) | 1208 | 788 | 13% / 65% / 22% |
| 1440px (갤럭시탭 가로·중형 노트북) | 1228 | 808 | 13% / 66% / 21% |
| 1920px (풀HD) | 1228 | 808 | 13% / 66% / 21% (max-width 1300 cap) |

모든 큰 뷰포트에서 좌·우가 동일하게 **고정폭**이라 비율이 W에 민감하게 반응하지 않음 — 중앙이 커질 수 있어도 max-width 1300 cap 때문에 최대 808px에서 정체.

## 우측 260px 내부 시각 공간

`.dj-ranking-section` padding: 14px 16px → 콘텐츠 박스 **228px**.
`.dj-ranking-row` 그리드: `18px auto 1fr auto`, gap 6px.
썸네일 48×27px 포함 시: 18 + 6 + 48 + 6 + (1fr) + 6 + (count) ≈ 85 + 카운트
→ 제목 ellipsis 영역 ≈ 100px — **매우 협소**, 긴 곡명이 극단적으로 잘림.

## sticky 사이드바와 본문 높이 차

- `.dj-ranking { position: sticky; top: 24px; }`
- 본문(`.dj-board-main`) 높이 = 헤더 + Now Playing(패딩 16+ 썸네일 135) + Queue(row당 ~60 × N) + Footer
- DJ 본문은 쉽게 1000-2000px로 증가.
- sticky 사이드바는 두 개 섹션 + 10개 row(약 240px씩 × 2 ≈ 500px) 정도에서 멈춤.
- 따라서 스크롤 중 우측에는 **sticky로 고정된 짧은 컨텐츠 + 그 아래 빈 공간**이 노출 — 본문 하단까지 가면 빈 영역 1000px 이상 발생.

## 결론(1줄)

우측 260px 고정 + sticky 정책 + 랭킹 섹션 최대 높이 한계 → 본문이 길수록 우측 하단 공백이 기하급수적으로 증가.
