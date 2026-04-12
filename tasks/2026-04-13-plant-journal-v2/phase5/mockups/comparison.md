# Shotgun Comparison — plant-journal-v2 RoadmapView

Text-based layout mockups (ASCII). 4 variants evaluated.

---

## v1 — Tight rail + body grid (ADOPTED)

```
┌────────────────────────────────────────┐
│  🌱 방울토마토  "토토"                  │
├────┬───────────────────────────────────┤
│    │  1단계 · 씨앗                     │
│ ①━━┤  관찰 포인트: 흙 습도, 햇빛       │
│  ┃ │  ┌──[📷 thumb]──┐ 2025-04-02     │
│  ┃ │  │ 오늘 씨앗…   │ 메모…          │
│  ┃ │  └──[수정][삭제]┘                │
│    │  ─────────────────────────       │
│ ②━━┤  2단계 · 발아                    │
│ ▲  │  (현재 단계) [관찰 추가][다음 →] │
│ ┃  │  (아직 기록 없음)                │
│    │  ─────────────────────────       │
│ ③░░┤  3단계 · 떡잎 (예정)             │
│    │  (뿌옇게 페이드)                 │
└────┴───────────────────────────────────┘
```

- Pros: Clean left rail 40-48px; body uses remaining width; visited vs current vs upcoming stages all always visible; cheap to build with CSS Grid `auto 1fr`.
- Cons: On ultra-narrow mobile (<360px) the rail needs to shrink to 24px; rail labels stack vertically above nodes.
- Score: 9/10 clarity, 8/10 density, 9/10 reuse of existing CSS classes.

## v2 — Full-width stage cards, rail as floating badge

```
┌────────────────────────────────────────┐
│  ① 1단계 · 씨앗              [완료]   │
│  ┌──[📷]──┐ 2025-04-02  메모…          │
│  │        │ [수정][삭제]                │
│  └────────┘                             │
├────────────────────────────────────────┤
│  ② 2단계 · 발아             [현재]    │
│  관찰 포인트: …                         │
│  [관찰 추가] [다음 →]                   │
├────────────────────────────────────────┤
│  ③ 3단계 · 떡잎             [예정]    │
│  (페이드)                               │
└────────────────────────────────────────┘
```

- Pros: No rail → max content width; badge-driven state.
- Cons: Lose the "timeline" metaphor feedback explicitly asked for (vertical timeline with left rail). Deviates from requested UX.
- Rejected: does not match feedback.

## v3 — Two-column: sticky rail left, scrollable body right (P2)

```
┌────┬────────────────────┐
│ ①  │  (stage 1 body)   │  ← rail sticks to viewport
│ ②  │  (stage 2 body)   │    while body scrolls
│ ③  │  (stage 3 body)   │
│ …  │                    │
└────┴────────────────────┘
```

- Pros: Orientation preserved on long journals.
- Cons: Sticky positioning inside Next.js nested layouts is fiddly; YAGNI for 6-10 stages. Phase1 explicitly tabled (P2).
- Rejected: scope.

## v4 — Inline cards list, no rail (flat)

```
┌─────────────────────────┐
│ [1단계 · 씨앗] 완료     │
│ obs cards …             │
│ [2단계 · 발아] 현재     │
│ obs cards …             │
│ [3단계 · 떡잎] 예정     │
└─────────────────────────┘
```

- Pros: Simplest; works on any viewport.
- Cons: Loses visual timeline affordance. User asked for a timeline metaphor.
- Rejected: does not fulfil feedback.

---

## Decision
Adopt **v1** — matches feedback ("좌측 세로 타임라인 + 우측 inline 기록 카드"), reuses existing tokens, minimal CSS additions.

v2/v3/v4 archived in `rejected/`.
