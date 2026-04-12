# Phase 6 — before/after diff notes

Text-only diff (no screenshots). Selected variant: `mockups/v1` (thumbnail-first fade-in).

## Fix 1 — Sibling margin parity (consistency)

### Why
`.card-attach-image` and `.card-attach-video` both declare `margin-bottom: 8px` (see `src/styles/card.css` L85–L113). The original `.card-canva-embed` rule omitted this, so a Canva card would sit visually tighter against its sibling body paragraph than a YouTube or image card — an inconsistent vertical rhythm across attachment types.

### Before (tokens_patch.json — .card-canva-embed declarations)
```json
{
  "position": "relative",
  "width": "100%",
  "padding-bottom": "56.25%",
  "background": "var(--color-bg)",
  "border-radius": "8px",
  "overflow": "hidden"
}
```

### After
```json
{
  "position": "relative",
  "width": "100%",
  "padding-bottom": "56.25%",
  "min-height": "90px",
  "background": "var(--color-bg)",
  "border-radius": "8px",
  "overflow": "hidden",
  "margin-bottom": "8px"
}
```

## Fix 2 — Responsive floor for very narrow cards

### Why
`padding-bottom: 56.25%` is a percentage of the wrapper's computed width. On Aura-board's freeform layout a card can be resized well below the grid default (≥240px). At card widths below ~100px the iframe visible height would collapse under a comfortable tap/read target (<60px) — unusable both for pointer and screen-reader users who land on the iframe. A `min-height: 90px` floor preserves the 16:9 shape for all normal layouts (dominant path) while guaranteeing a sane minimum when a user explicitly shrinks a card.

### Before
No lower bound. Risk of 0-height iframe on extreme freeform resize.

### After
`min-height: 90px` added to `.card-canva-embed`. Rationale documented in the rule's `rationale` field.

## Fix 3 — iframe `loading="lazy"` contract (responsive / perf)

### Why
`design_spec.md §1 compromise note` flags the concurrent-iframe cost on large boards as a known watch item. Adding `loading="lazy"` to the iframe element is free, widely supported (Chrome 77+, Firefox 121+, Safari 15.4+), and converts off-screen Canva cards into zero-network entries until they scroll into view. This is a responsive/perf guardrail that does not change the visual design and does not require a new token — it is captured as a React contract note so phase7 implementer doesn't miss it.

### Before
`react_contract_notes` did not mention lazy loading. Implementation could ship all iframes eager by default.

### After
New `iframe_lazy` key in `react_contract_notes` making the lazy attribute mandatory.

## Fix 4 — Requirement checklist additions

Three rows appended to `design_spec.md §5` checklist covering the three fixes above, so the phase4 → phase5 traceability matrix reflects the review additions.

## Not changed

- `.card-canva-embed > img` opacity-transition rule — untouched, already matches `.modal-attach-section` (150ms ease).
- `prefers-reduced-motion` media query — untouched, already WCAG-compliant.
- Mockup HTML at `mockups/v1/index.html` — a demo artifact; the production CSS is governed by `tokens_patch.json` which is the source of truth. No mockup edit needed.
- No new color, radius, shadow, or font tokens introduced — brief §5 constraint held.
