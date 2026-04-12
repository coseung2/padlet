# Phase 8 — Code Review

## Scope audited
All phase7 additions + modifications.

## Checklist

### Schema
- [x] New models non-destructive. All @@index declared.
- [x] onDelete Cascade for child rows; Card/Observation fk also cascade (orphan prevention R6).
- [x] classroomId denormalized for fast classroom gallery scans (roadmap requirement).
- [x] No @db.* types — schema portable across providers.

### API — POST /api/student-assets
- [x] Auth via getCurrentStudent (R5 — teacher cannot upload as a student; only students with cookies).
- [x] MIME allowlist + 50MB cap matches /api/upload pattern.
- [x] Extension sanitization (alphanum only).
- [x] classroomId derived from session — never from client body.
- [x] Error logged via console.error (codebase convention).

### API — GET /api/student-assets
- [x] zod query validation.
- [x] scope=mine: student-gated, returns [] when no session (soft fail for teacher inspecting).
- [x] scope=shared: classroomId required + dual-path access control (student in classroom OR teacher owner).
- [x] Take limits (100/200) prevent runaway payloads.

### API — POST /api/student-assets/[id]/attach
- [x] Dual authorization: asset owner OR board owner (teacher curation path preserved).
- [x] Only writes Card.imageUrl when null — does not clobber existing /api/upload image.
- [x] Returns DTO with ISO timestamps (consistent with rest of codebase).

### Components
- [x] DrawingBoard: tab state local, no server round-trip for tab switch.
- [x] env access via `process.env.NEXT_PUBLIC_*` at module scope — Next.js inlines at build time.
- [x] iframe sandbox restrictive (allow-scripts + same-origin + forms + modals; no top navigation, no pointer-lock).
- [x] StudentLibrary: file input reset after selection (e.target.value = "" — prevents repeated upload with same file name).
- [x] Thumbnails use native img + eslint-disable with comment (matches existing event/plant boards pattern — OptimizedImage requires Next image config for external URLs we may introduce post-blocker).
- [x] No useMemo/useCallback anti-patterns; dependency arrays minimal and correct.

### AddCardModal
- [x] attachAssetId threads through cleanly — AddCardData type + BoardCanvas handleAdd.
- [x] Library picker local state only; no leak on close.
- [x] Picker overlay click-outside to close; stop propagation on inner panel.
- [x] Fire-and-forget attach in BoardCanvas — failures are cosmetic since Card.imageUrl already set.

### Styles
- [x] CSS variables with fallbacks → no regression if some token missing.
- [x] Mobile breakpoint 768px collapses sidebar (matches responsive.css convention).

## Risks still open (from phase2)
- R1 Supabase migration: documented in BLOCKERS.md #5. App behavior if table missing: Prisma throws → try/catch in routes returns 500. Acceptable for stub (not production-hot-path until Drawpile deployed).
- R2 COOP/COEP: deliberately untouched. Doc'd.
- R4 S6 Lite perf: not measured (server not deployed). Placeholder path has zero cost.

## Security notes
- Upload endpoint uses `getCurrentStudent` — CSRF protection via SameSite=Lax cookie (existing pattern).
- Path traversal prevention: filename uses generated id + sanitized ext; user-supplied file.name not used verbatim.
- Library picker image src comes from DB-stored fileUrl — no HTML injection (React escapes attribute).

## Verdict
APPROVE. Ready for QA.

```
touch tasks/2026-04-13-drawpile-schema-stub/phase8/REVIEW_OK.marker
```
