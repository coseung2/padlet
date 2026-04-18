# Phase 1 — Research Pack (plant-journal-v2)

> No live-browse tool available in this worktree; research is synthesised from known-good UX patterns in comparable journaling / classroom / timeline products. References are documentary (URLs), not scraped screenshots. Because the v1 interaction model failed in field testing, prior-art evidence focuses on **why vertical timelines beat horizontal rails when each entry has its own body content**, and **how teacher consoles gate impersonation/edit-on-behalf without losing an audit trail**.

## Part A — Vertical timeline + inline entries

### Pattern P1: "Vertical stepper with expanded entries" (Notion / Linear changelog / GitHub issue timeline)
- **Description**: Left-aligned vertical rail of node markers with content blocks rendered to the right of each node. Each content block is visible by default; the rail provides orientation (which stage / when) and never hides content behind a click.
- **Pros**:
  - Natural top-to-bottom reading order (matches Korean/English flow).
  - Stage + content both visible → no extra tap to see "what did I record".
  - Adds stages easily without horizontal overflow. Mobile-friendly.
- **Cons**:
  - Long journals become long pages → need sticky stage rail or jump nav.
  - Inline images increase initial paint cost → must keep thumbnails.
- **Source**: GitHub issue timeline (https://docs.github.com/en/issues), Notion timeline blocks (https://www.notion.so).

### Pattern P2: "Sticky stage rail, scrollable stage body" (Trello roadmap, Linear roadmap)
- **Description**: Rail remains pinned while body scrolls. Clicking a stage in the rail scrolls the corresponding block into view.
- **Pros**: Preserves orientation on long journals.
- **Cons**: Requires scroll containers that don't clobber Next.js layout sticky contexts. On mobile with small viewport, sticky rail eats horizontal real estate.
- **Decision**: Start without stickyness (YAGNI for 6-10 stages in 1st grade plant timeline). Revisit if students report losing orientation.

### Pattern P3: "Inline composer for current stage, read-only for past stages" (Instagram story highlights, Day One journal)
- **Description**: Only the current stage exposes an "add entry" CTA inline; past stages show content but no composer.
- **Pros**: Reduces accidental writes on old stages; matches plant-journal semantics (advance stage = lock previous).
- **Cons**: Teacher-on-behalf edit still needs to reach any stage.
- **Decision**: Adopt for students (write only on current stage). Teacher mode shows composer on every stage.

### Pattern P4: "Compact modal for add/edit, full-screen lightbox for originals"
- **Description**: Composer = small modal centered over the timeline; photo originals = fullscreen lightbox.
- **Pros**: No slide-in sheet eating layout; composer and timeline reflow together.
- **Cons**: Modal focus-trap needed for a11y.
- **Decision**: Adopt. `ObservationEditor` already renders as a modal; we just stop launching it from the sheet.

## Part B — Teacher drill-down & edit-on-behalf

### Pattern P5: "Row-as-link summary tables" (Google Classroom student list → student submission, Notion DB views)
- **Description**: Each table row is a `<Link>` to the detail page; hover affordance (underline / cursor) makes the click target obvious.
- **Pros**: Predictable. Teachers already expect this from Google Classroom.
- **Cons**: Requires making the whole row clickable while keeping per-cell semantics clean (don't nest `<a>` inside `<td>` with interactive children).
- **Decision**: Adopt — whole row wraps in a `<Link>` (or a per-row cell link with `cursor: pointer`).

### Pattern P6: "Teacher edits on behalf, with subtle attribution badge" (Google Classroom teacher comments, Seesaw teacher annotations)
- **Description**: Teacher can create/modify student work; a small badge ("선생님 수정" / "by teacher") marks content touched by the teacher.
- **Pros**: Transparency without heavy audit tooling. Students see their teacher helped.
- **Cons**: Needs a column to record the editor identity. We don't want a schema migration in this feature.
- **Decision**: **Skip attribution badge in v2** (FEEDBACK explicitly marks it "nice-to-have; skip if it bloats scope" and schema changes are blocked). Record in follow-up backlog.

### Pattern P7: "Owner-impersonation routes under a board subpath" (Classroom `/students/:id/work`, canvas LMS teacher gradebook drilldowns)
- **Description**: Subroute like `/board/:id/student/:studentId` that renders the student's own view, in edit mode, but only when the viewer is the board/classroom owner.
- **Pros**: Reuses the student component. Clean URL for deep-linking.
- **Cons**: Must 403 hard for non-owners (can't fall through to "not found"). Must never leak when a non-owner tries to guess student IDs.
- **Decision**: Adopt. Server-component page checks `getCurrentUser` + classroom ownership; 403 otherwise.

## Performance notes
- v1 already lazy-renders lightbox (only on click). Keep that.
- Inline observations: each stage may have N images. Use `<img>` with `loading="lazy"` and `decoding="async"`, rely on `thumbnailUrl` when present (already persisted by POST).
- No virtualization — 10 stages × avg 2 images × 6 classrooms keeps DOM under 200 nodes.

## Conclusion (guidance for phase2)
Adopt P1 + P3 + P4 for Part A (vertical rail, inline content, current-stage composer, modal editor, lightbox). Adopt P5 + P7 for Part B (row link + subpath drill-down, owner-only). Defer P6 (attribution badge) to follow-up task. Do NOT adopt P2 (sticky rail) yet.
