# Variant v2 — Weighted Name + Muted Time

이름은 semibold, 시간은 muted 로 위계 분리. 같은 한 줄.

```
┌─────────────────────────────────┐
│   [카드 본문/첨부]              │
├─────────────────────────────────┤
│ 공서희  3분 전                  │  ← name semibold, time xs muted
└─────────────────────────────────┘
```

## 구조
```tsx
<footer className="card-author-footer">
  <span className="sr-only">작성자: </span>
  <span className="card-author-name">{name}</span>  // font-weight: 600
  <time dateTime={iso} title={absolute}              // color: muted
        className="card-author-time">{relative}</time>
</footer>
```

## 토큰
- 이름: `font-size: var(--font-size-xs)`, `font-weight: 600`, `color: var(--color-text)`
- 시간: `font-size: var(--font-size-xs)`, `color: var(--color-muted)`
- gap: `var(--space-2)`

## 장점
- 이름 가독성 향상 — 학급 맥락에서 "누가 올렸는지" 스캔 빠름
- 토큰 추가 0

## 단점
- v1 대비 1 스타일 룰 추가
