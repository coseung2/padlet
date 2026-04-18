# Design Brief — plant-journal-v2

## 1. 화면/상태 목록

### S1. RoadmapView (student, canEdit=true, editAnyStage=false)
- **empty (plant just chosen, 0 observations)**: show all stages; stage 1 body shows "아직 기록이 없어요" + "관찰 추가" CTA; other stages show "아직 도달 전" faded body.
- **ready**: stages 1..N rendered top-down. Visited stages dimmed (but content visible). Current stage emphasised (rail node accent, body border accent, composer CTA visible). Upcoming stages faded + observation points muted, no CTA.
- **loading (optimistic refetch after save)**: preserve last snapshot; show subtle rail node pulse on changed stage.
- **error (POST/PATCH fail)**: `ObservationEditor` modal displays error text (existing); timeline unchanged.
- **lightbox**: full-viewport overlay on thumbnail click (existing behaviour preserved).

### S2. RoadmapView (teacher, canEdit=true, editAnyStage=true)
- Same as S1, plus a blue-accent banner "교사 모드 — {studentName}의 관찰일지" at the top.
- Composer CTA visible on **every** stage (teacher can retroactively add entries).
- "다음 단계로" button only visible on current stage (semantics identical).

### S3. TeacherStudentPlantView — 403 / forbidden
- Rendered when server gate denies: "접근 권한이 없어요" + link "← 보드로 돌아가기".

### S4. TeacherStudentPlantView — empty (student hasn't picked a plant)
- "이 학생은 아직 식물을 고르지 않았어요" + link back to summary.

### S5. TeacherSummaryView — with drill-down affordance
- Each student row: whole row clickable, hover bg `var(--color-surface-hover)`, keyboard focus ring.
- Empty state unchanged ("아직 학생이 없어요.").
- Secondary matrix-view link: outline style, muted colour.

## 2. 정보 계층

**RoadmapView (vertical)**:
1. 식물 이름 + 별명 (plant-head, top).
2. 타임라인 전체 (stage rail + stage body).
3. 각 stage body 내부 — stage name, observation points, entry cards, footer actions.

Eye flow: top (plant head) → down the left rail to current-stage node → jump right into composer. On scroll, past stages appear above current.

**TeacherSummaryView**: student list dominates; matrix link demoted to secondary position; distribution counts kept as supporting info.

## 3. 인터랙션 명세

- **Click past stage rail node** → no-op (hover cue only; body is already visible).
- **Click observation thumbnail** → lightbox opens with full-size image. Esc / backdrop click closes.
- **Click "관찰 추가" CTA** → `ObservationEditor` modal with stageId=that-stage.
- **Click "수정" on observation card** → `ObservationEditor` modal pre-filled.
- **Click "삭제"** → `confirm()` then DELETE + refetch.
- **Click "다음 단계로" on current stage** → POST /advance-stage; if `require_reason`, open `NoPhotoReasonModal`.
- **Click student row in TeacherSummaryView** → router push to `/board/{boardId}/student/{studentId}`.
- **Click secondary "매트릭스 뷰" link** → `/classroom/{classroomId}/plant-matrix` (unchanged destination).
- Micro-animations: rail connector transitions from muted to accent between visited & current. Hover on row in summary: bg change + subtle translate-x.

## 4. 접근성 요구

1. **Keyboard**: every interactive control (rail nodes, add/edit/delete buttons, row link, matrix link, modal buttons) reachable via Tab. Rail nodes are buttons (or `role="button"`) but since they're no-op in v2, render them as plain divs with aria-label like "3단계: 떡잎 — 완료" and no tabstop (except current if desired — we'll make only current-stage indicator focusable with the "관찰 추가" cta in reach).
2. **Screen reader**: each stage body has `role="region"` and `aria-label="{order}단계: {nameKo}"`. Teacher banner has `role="status"`. Row link has `aria-label="{studentName} 관찰일지 열기"`.
3. **Contrast / focus**: reuse existing plant-node colour tokens (visited/active/upcoming) — already AA. Focus ring: `outline: 2px solid var(--color-accent); outline-offset: 2px` on all buttons and row links.
4. **Reduced motion**: rail connector transition wrapped in `@media (prefers-reduced-motion: reduce)` — disable the fade animation.

## 5. 디자인 시스템 확장 여부

- **Existing tokens sufficient**: `--color-text`, `--color-text-muted`, `--color-accent`, `--color-surface`, `--color-surface-hover`, `--color-border`, `--radius-md`, `--radius-btn`, `--space-xs…lg`, `--font-size-sm/md/lg`, `--shadow-sm`. All present in `docs/design-system.md` (verified during v1). No new tokens required.
- **New reusable pattern**: "vertical-timeline" could migrate to design-system.md as a documented pattern after v2 stabilises (phase11 note). Not adding a shared component — only plant-journal uses this layout.
- **Components to add/retire**:
  - Add: `TeacherStudentPlantView` (thin wrapper).
  - Retain (not deleted): `StageDetailSheet` (unused in student flow, possible future teacher modal reuse).
  - Modify: `RoadmapView`, `TeacherSummaryView`, `PlantRoadmapBoard`.

## 6. Out-of-scope design concerns

- Matrix view visual redesign (still v1).
- `PlantAllowListModal` unchanged.
- No dark-mode work beyond what existing tokens already provide.
