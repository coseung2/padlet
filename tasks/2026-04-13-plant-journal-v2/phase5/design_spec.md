# Design Spec — plant-journal-v2 (selected: v1 — Vertical rail + body grid)

## 1. 선택된 변형

`mockups/v1-vertical-rail-grid.md`. 선택 사유: 피드백 요구(세로 타임라인 + 우측 인라인 기록)를 그대로 만족하며, 기존 `.plant-obs-*`, `.plant-node` 토큰을 재사용해 추가 CSS 표면적을 최소화. 모바일 리사이즈도 `grid-template-columns`만 조정하면 동작.

## 2. 화면 상태별 최종 디자인

| 상태 | 레이아웃 |
|---|---|
| **empty (0 observations)** | 전체 stage row 렌더. Stage 1 body: 관찰 포인트만 + "관찰 추가" CTA + "아직 기록이 없어요" 안내. Stage 2+ body: faded, "아직 도달 전" 안내. |
| **ready (student, current=stage 2)** | Stage 1 visited(완료 뱃지 톤) body에 기존 기록 카드들. Stage 2 active(accent 테두리) body에 기록 없거나 있음. Stage 3+ upcoming(페이드). |
| **ready (teacher editAnyStage)** | 동일하되 상단에 `.plant-teacher-banner`. 모든 stage body 하단에 "관찰 추가" CTA. 현재 stage만 "다음 단계로" 표시. |
| **loading** | Refetch 중에는 UI를 고정(React 상태 유지). 쓰이면 CTA에 disabled=true (모달이 이미 처리 중이면 disabled). 별도 skeleton 없음 (데이터 최초 로드는 서버 컴포넌트에서 완료). |
| **error (save 실패)** | `ObservationEditor` 모달 내 error 메시지 렌더(기존 동작). 타임라인 상태는 이전 스냅샷 유지. |
| **lightbox** | 기존 `.plant-lightbox` 풀스크린 오버레이. 썸네일 클릭 시 오픈. |
| **403 / forbidden (teacher drill-down)** | 교사 섹션 대신 단순 상자: "접근 권한이 없어요" + `<Link href="/board/{id}">← 보드로 돌아가기</Link>`. |
| **empty (teacher drill-down to student without plant)** | "이 학생은 아직 식물을 고르지 않았어요" + back link. |

## 3. 사용된 토큰

기존 토큰만 사용. 변경 없음.

- Colour: `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-soft` (if present, else fallback), `--color-surface`, `--color-surface-hover`, `--color-border`.
- Radius: `--radius-md`, `--radius-btn`.
- Spacing: `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`.
- Shadow: `--shadow-sm`.
- Typography: existing h3, p styles.

State colour mapping (reuses v1 plant-node tokens):
- `data-state="visited"` → `color-mix(in srgb, var(--color-accent) 40%, var(--color-surface) 60%)`
- `data-state="active"` → `var(--color-accent)`
- `data-state="upcoming"` → `var(--color-border)`

## 4. 컴포넌트 목록

### 신규 (code)
- `src/components/plant/TeacherStudentPlantView.tsx` — client wrapper for drill-down route.
- `src/app/board/[id]/student/[studentId]/page.tsx` — server page.

### 수정
- `src/components/plant/RoadmapView.tsx` — layout overhaul.
- `src/components/plant/TeacherSummaryView.tsx` — row link + demoted matrix link.
- `src/components/PlantRoadmapBoard.tsx` — drop sheet wiring, pass boardId through.
- `src/styles/plant.css` — add timeline classes, preserve legacy ones.
- `src/lib/plant-schemas.ts` — add `PatchStudentPlantSchema`.
- `src/app/api/student-plants/[id]/route.ts` — add `PATCH` handler; add teacher allow.
- `src/app/api/student-plants/[id]/observations/route.ts` — widen teacher allow on POST.
- `src/app/api/student-plants/[id]/observations/[oid]/route.ts` — widen teacher allow on PATCH/DELETE.
- `src/app/api/student-plants/[id]/advance-stage/route.ts` — widen teacher allow.

### 유지 (no-op for student flow)
- `src/components/plant/StageDetailSheet.tsx` — kept in repo, no longer mounted.
- `src/components/plant/NoPhotoReasonModal.tsx`, `src/components/plant/ObservationEditor.tsx` — unchanged.

## 5. Tokens patch
- See `tokens_patch.json`. Empty — no token additions.
