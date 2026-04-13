# Variant v1 — Minimal Caption Row

단일 행, 작성자명 · 시간만 점(`·`)으로 구분. 가장 단순.

```
┌─────────────────────────────────┐
│                                 │
│   [카드 본문/첨부]              │
│                                 │
├─────────────────────────────────┤
│ 공서희 · 3분 전                 │  ← footer (h: 24px, text-xs, muted)
└─────────────────────────────────┘
```

## 구조
```tsx
<footer className="card-author-footer">
  <span className="sr-only">작성자: </span>
  <span className="card-author-name">{name}</span>
  <span aria-hidden="true" className="card-author-sep">·</span>
  <time dateTime={iso} title={absolute}>{relative}</time>
</footer>
```

## 토큰
- `font-size: var(--font-size-xs)` (≈12px)
- `color: var(--color-muted)`
- `padding: var(--space-1) var(--space-2)` (4px 8px)
- `border-top: 1px solid var(--color-border-subtle)` (선택)

## 장점
- 구현 최소(30줄 이내)
- 카드 레이아웃 영향 최소 (높이 +24px)
- 기존 토큰만 사용, 확장 없음

## 단점
- 아바타 없음 — 시각적 매력 낮음 (OUT 이라 상관 없음)
- 시간·이름 동일 스타일 — 이름 가독성 보통
