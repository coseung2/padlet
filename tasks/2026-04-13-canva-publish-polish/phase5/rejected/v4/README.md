# Variant v4 — Two-Line Stacked

작성자를 상단 라벨, 시간을 하단에. 2행 구조.

```
┌─────────────────────────────────┐
│   [카드 본문/첨부]              │
├─────────────────────────────────┤
│ 공서희                          │  ← name text-sm
│ 3분 전                          │  ← time text-xs muted
└─────────────────────────────────┘
```

## 구조
```tsx
<footer className="card-author-footer stacked">
  <span className="card-author-name">
    <span className="sr-only">작성자: </span>{name}
  </span>
  <time dateTime={iso} title={absolute} className="card-author-time">{relative}</time>
</footer>
```

## 토큰
- 이름: `font-size: var(--font-size-sm)`, `color: var(--color-text)`
- 시간: `font-size: var(--font-size-xs)`, `color: var(--color-muted)`
- 행 간격: `var(--space-1)`

## 장점
- 이름 강조 최대
- 긴 이름/긴 상대시간 wrap 안정 (고정폭 카드에서)

## 단점
- 카드 높이 +40px (v1-v3 는 +24px)
- 태블릿에서 카드 4개 세로 배치 시 합산 증가 — 스크롤 비용↑
- Galaxy Tab S6 Lite 성능 기준에서 보수적 선택이 아님
