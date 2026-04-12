# Phase 3 — Architecture

## Route tree

```
/parent/
  layout.tsx          — viewport, manifest link
  logged-out/page.tsx
  account/
    page.tsx          — settings stub
    withdraw/page.tsx — confirm flow
  home/page.tsx       — child grid (existing, upgraded)
  child/[studentId]/
    layout.tsx        — child bottom nav + scope guard
    page.tsx          — overview (redirect to plant)
    plant/page.tsx
    drawing/page.tsx
    assignments/page.tsx
    events/page.tsx
    breakout/page.tsx
```

## API tree

```
/api/parent/
  children/[id]/
    plant/route.ts
    drawing/route.ts
    assignments/route.ts
    events/route.ts
    breakout/route.ts
  links/[id]/route.ts       — DELETE teacher revoke
  account/
    withdraw/route.ts       — POST self-withdraw
/api/cron/
  parent-weekly-digest/route.ts
  parent-anonymize/route.ts
```

## Data flow

Every `/api/parent/children/[id]/*` route:
```ts
export const GET = (req, ctx) =>
  withParentScopeForStudent(req, ctx.params.id, async (scope) => {
    // DB query here, always filtering by ctx.params.id
    return NextResponse.json({...});
  });
```

## UI patterns

- Bottom nav: fixed, 56px, 3 items, tab bar icons via emoji for no extra asset weight
- Child page header: student avatar (initial circle) + name + tab row (5 tabs scrollable horizontal)
- Design tokens: inline var(--color-*) matching existing /parent/home styles

## Perf budget checklist
- No iframes, no new libs
- Images via OptimizedImage (existing)
- SWR 60s polling in client wrappers (we avoid adding SWR lib — use native fetch + `setInterval` with cleanup, identical semantics)
- First-paint bundle: RSC-first, client components only for polling + nav interactions
