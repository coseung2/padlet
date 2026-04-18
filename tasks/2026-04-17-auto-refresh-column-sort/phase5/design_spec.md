# Phase 5 — Design Spec

## column-header 새 레이아웃

```
[제목  카운트   ▾정렬select   ⋯메뉴]
```

flex order: title(flex:1), count, select, menu.

## CSS (boards.css 추가)

```css
.column-sort-select {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-faint);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  padding: 2px 6px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.column-sort-select:hover {
  background: var(--color-surface-muted, rgba(0,0,0,0.04));
  color: var(--color-text);
}

.column-sort-select.column-sort-active {
  color: var(--color-accent-tinted-text);
  background: var(--color-accent-tinted-bg);
  border-color: transparent;
}
```

토큰 새로 만들지 않음. `--color-surface-muted` 미정의 시 fallback 적용.
