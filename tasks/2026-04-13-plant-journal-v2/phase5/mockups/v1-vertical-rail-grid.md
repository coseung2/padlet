# Mockup v1 — Vertical rail + body grid (ADOPTED)

## Root structure

```html
<div class="plant-timeline" role="list" aria-label="성장 타임라인">
  <section class="plant-stage-row" role="listitem" data-state="visited">
    <aside class="plant-stage-rail" aria-hidden="true">
      <span class="plant-stage-connector plant-stage-connector--top"></span>
      <span class="plant-stage-node" data-state="visited">1</span>
      <span class="plant-stage-connector plant-stage-connector--bottom"></span>
    </aside>
    <div class="plant-stage-body" role="region" aria-label="1단계: 씨앗 (완료)">
      <header class="plant-stage-body-head">
        <h3><span aria-hidden>🌱</span> 1단계 · 씨앗</h3>
        <p>흙에 씨앗을 심어요.</p>
      </header>
      <ul class="plant-stage-body-points">
        <li>흙 습도</li>
        <li>햇빛 양</li>
      </ul>
      <div class="plant-stage-body-obs-grid">
        <!-- obs cards (reuse existing .plant-obs-card) -->
      </div>
      <!-- footer actions only when editable -->
    </div>
  </section>
  <!-- next stages … -->
</div>
```

## Grid / layout

- Root `.plant-timeline`: `display: flex; flex-direction: column; gap: var(--space-lg); max-width: 880px; margin: 0 auto;`
- `.plant-stage-row`: `display: grid; grid-template-columns: 48px 1fr; gap: var(--space-md);`
- `.plant-stage-rail`: `position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100%;`
- `.plant-stage-connector`: absolute positioned 2px-wide line. Top half from row top to node; bottom half from node to row bottom. Color driven by `data-state`.
- `.plant-stage-node`: reuse existing `.plant-node` look (circle, 36px, number), adds `z-index: 1; position: relative` to sit above connector.
- `.plant-stage-body`: `background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-md); box-shadow: var(--shadow-sm);`
- Upcoming: `.plant-stage-row[data-state="upcoming"] .plant-stage-body { opacity: 0.55; }`
- Active: `.plant-stage-row[data-state="active"] .plant-stage-body { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent); }`

## Observation cards

Reuse existing `.plant-obs-card`, `.plant-obs-meta`, `.plant-obs-imgs`, `.plant-obs-memo`, `.plant-obs-reason`, `.plant-obs-actions` classes. New wrapper `.plant-stage-body-obs-grid` gives `display: grid; gap: var(--space-sm); grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));`.

## Footer actions

```html
<div class="plant-stage-body-actions">
  <button type="button" class="primary">관찰 추가</button>
  <!-- only on current stage: -->
  <button type="button">다음 단계로 →</button>
</div>
```

## Teacher banner (above timeline)

```html
<div class="plant-teacher-banner" role="status">
  <span aria-hidden>👩‍🏫</span>
  교사 모드 — <b>{학생이름}</b>의 관찰일지
  <a href="/board/{boardId}">← 요약으로</a>
</div>
```

## Responsive

At `max-width: 520px`:
- `grid-template-columns: 32px 1fr;`
- `.plant-stage-body-obs-grid`: `grid-template-columns: 1fr;`
- `.plant-teacher-banner`: stacked vertically.
