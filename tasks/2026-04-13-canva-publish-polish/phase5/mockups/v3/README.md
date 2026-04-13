# Variant v3 — Author Chip + Relative Time

이름을 pill-shape chip 으로 감싸 카드 구조를 명확히. 터치 대상을 시각적으로 분리.

```
┌─────────────────────────────────┐
│   [카드 본문/첨부]              │
├─────────────────────────────────┤
│ [ 공서희 ]  3분 전              │  ← name in rounded chip, time plain
└─────────────────────────────────┘
```

## 구조
```tsx
<footer className="card-author-footer">
  <span className="card-author-chip">
    <span className="sr-only">작성자: </span>
    <span>{name}</span>
  </span>
  <time dateTime={iso} title={absolute}>{relative}</time>
</footer>
```

## 토큰
- chip background: `var(--color-surface-elevated)` 또는 `var(--color-accent-tinted)` (tinted 는 이름 강조)
- chip radius: `var(--radius-pill)` (존재 시) 또는 `9999px`
- chip padding: `2px 8px`

## 장점
- 시각적 계층 명확
- 작성자 존재감 높음 — 학급 참여감 강조

## 단점
- 카드가 이미 chip/badge 를 갖는 경우(section badge 등) 시각 복잡도 증가
- chip 이 후속 task 에서 "작성자 프로필 열기" 등으로 발전 시 변경 폭 커짐
- 본 scope (pointer-events: none) 에서 chip 은 인터랙션 없이 장식적 — 오해 소지
