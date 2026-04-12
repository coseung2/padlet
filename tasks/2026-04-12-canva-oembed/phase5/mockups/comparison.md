# Canva Embed Card — Variant Comparison

task_id: 2026-04-12-canva-oembed
phase: 5 (designer)
axes (from `phase4/design_brief.md` §1, §3, §4, §5 + phase3 §3, §5-4):
- **LCP** — time-to-first-paint of the card's visual content
- **Simplicity** — component complexity, failure modes, state count
- **Attribution** — how author/title is surfaced and consistency with Aura-board tokens
- **Big-board scaling** — iframe cost when board has 30–100 cards, many Canva
- **A11y** — keyboard/SR/reduced-motion adherence

---

## 2×2 matrix (high-level)

| | Fast & simple | Fast but complex |
|---|---|---|
| **High attribution control** | — | **v1** (thumb-fade), **v3** (author chip) |
| **Low attribution control** | **v2** (skeleton) | **v4** (lazy click-to-embed) |

---

## Axis-by-axis

| Axis | v1 thumb-fade | v2 iframe+skeleton | v3 iframe+attr chip | v4 lazy embed |
|---|---|---|---|---|
| **LCP** | Best — `<img>` paints instantly, iframe is background | Worst — nothing visible until iframe commits (~400–1500ms on 4G) | Same as no-thumb iframe — medium-poor | Best — thumbnail only; iframe never costs until click |
| **Simplicity** | Medium — two render layers + `iframeLoaded` state | Best — single iframe, skeleton is pure CSS | Medium — iframe + extra positioned chip, extra token discipline | Medium-complex — new `activated` state, click handler, keyboard activation, focus ring |
| **Attribution** | Canva `?meta` handles it consistently inside the frame; we don't duplicate | No attribution during loading; reliant on Canva `?meta` after paint | **Strongest brand consistency** — Inter font, Aura pill — but duplicates when Canva `?meta` renders | Explicit `"by {author}"` baked into the thumbnail CTA; disappears after activation |
| **Big-board scaling** | Iframe mounts on each render — 30 Canva cards = 30 concurrent iframes | Same 30 iframes, plus 30 shimmer animations | Same iframe cost + 30 extra DOM chips (cheap) | **Best** — 30 `<img>` only, ~0 iframe cost until user activates specific cards |
| **A11y** | Good — `alt` on thumb, `title` on iframe, `prefers-reduced-motion` override | Good — skeleton `aria-label`, shimmer silenced on reduced-motion; no fallback cue for color-only loading state | Good — chip readable by SR ("by Jinho Park"), chip respects existing focus tokens | **Best intent** — explicit affordance ("Click to open"), but requires extra keyboard handler + tabindex; users expecting live sync lose one affordance |

---

## Per-variant notes

### v1 — thumbnail-first fade-in  [RECOMMENDED — selected]
- Matches phase4 §3 micro-interaction (opacity 150ms ease) and `design_brief.md` §6 Variant A.
- Directly implements `phase4/ux_patterns.json#thumbnail-first-iframe-swap` (UX pattern adopted in phase2 scope).
- The "extra render tier" tradeoff is cheap in practice: the `<img>` tag is already the DB `linkImage` field (no extra fetch), and the iframe only occupies GPU layers after it paints.
- **Risk**: on a slow network, users see thumbnail for 2–3s while iframe loads — static feel. Mitigated by Canva's own `?meta` rendering overlay once loaded, so the payoff is consistent.

### v2 — iframe-only + loading skeleton
- Simplest React tree — no `iframeLoaded` state machine, just mount-and-wait.
- Worst LCP: board feels "empty" during loading because `<iframe>` paints late. Direct conflict with `phase4/design_brief.md` §3 "썸네일 `<img>` 즉시 표시 (LCP 선점)".
- Skeleton shimmer is charming but paints a *fake* visual weight that can mislead users into thinking content is imminent when `canva.com/_oembed` has failed.
- Keeps only as comparative baseline — not selected.

### v3 — iframe + persistent Aura author chip
- Strongest brand alignment: Inter font, Aura accent dot, surface pill matching modal style.
- Duplicates information: Canva's own `?meta` overlay *also* renders "Q2 Kickoff Deck by Jinho Park" at bottom-left — the chip sits on top of it. Visual conflict fixable by either dropping `&meta` from the URL (loses Canva controls) or dropping the chip (this variant's raison d'être).
- Useful for *post-MVP* when we introduce Figma / GeoGebra where third-party chrome is absent. For Canva specifically, redundant.
- Keep in `mockups/` for audit; worth revisiting when we generalize `.card-live-embed`.

### v4 — thumbnail-only lazy embed
- Wins big-board scaling by a mile: 100-card board with 30 Canvas = 0 iframe frames until user clicks.
- **Loses live sync by default** — the scope_decision §3 acceptance criterion "30초 내 반영" requires the iframe to be live, which v4 breaks for unclicked cards. Interpreting §3 strictly, v4 is non-conformant.
- But §3 is ambiguous: "반영" could mean "when the user next focuses the card". If we re-interpret in a future task, v4 becomes the natural scaling escape hatch.
- Keep for audit + flag as **future work** in `design_spec.md § compromise`.

---

## Decision

Selected: **v1**. Rationale: direct match to the phase4-approved UX pattern, best LCP with zero net cost (thumbnail URL is already stored in `linkImage`), and simplest fail-gracefully path (iframe `onError` → existing `card-link-preview` branch). v4 flagged as post-launch optimization target once we have board-size metrics.
