# Phase 8 — Code Review (self-review / staff-engineer persona)

## Scope
`git diff develop..feat/section-actions-panel -- 'src/**'` 기준.

## 체크리스트

### 1. a11y
- [x] SidePanel: `role=dialog` + `aria-modal=true` + `aria-labelledby` 연결
- [x] ESC 닫기 / backdrop 닫기
- [x] Focus trap: Tab/Shift+Tab 최소구현 + opener 복귀
- [x] Body scroll lock (prev overflow 복구)
- [x] prefers-reduced-motion 시 transition off
- [x] tablist 세마틱(`role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`)
- [x] 섹션 ⋯ 버튼 `aria-haspopup=dialog` + 동적 aria-label

### 2. RBAC
- [x] ⋯ 버튼은 owner/editor 만 노출 (viewer 에게는 `canEdit && (...)` 가드)
- [x] 공유 탭: editor 에게 안내문구. 실제 POST 는 owner-only(서버 측) — UI 는 버튼 클릭 시 409/403 케이스를 `SectionShareClient` 가 "생성 실패" 로 표시. 회귀 없음.
- [x] 이름 변경/삭제: PATCH/DELETE `requirePermission(..., "edit")` → owner+editor. viewer 직접 호출 시 403.
- [x] `/share` 라우트: server-side role !== owner 시 "접근 불가" (기존 그대로).

### 3. 회귀 위험
- [x] breakout 학생 뷰(`/board/[id]/s/[sectionId]`) 미변경.
- [x] `SectionShareClient` 미변경 — token rotation semantics 보존.
- [x] `EditSectionModal.tsx` 파일은 유지(미참조). 추후 삭제 가능. 영향 없음.
- [x] StageDetailSheet 외부 props 불변 — 호출처(PlantRoadmapBoard, TeacherMatrixView) 회귀 없음.

### 4. 타입/빌드
- [x] `npm run typecheck` PASS
- [x] `npm run build` PASS (routes 전부 정상 컴파일)
- [x] Prisma 스키마 변경 없음

### 5. 성능
- [x] SidePanel 은 `open=false` 시 null 반환 → DOM 부재
- [x] SectionActionsPanel 역시 tab 별 조건부 렌더로 다른 탭 작업 미발생
- [x] useMemo(`cardsBySection`) 영향 없음
- [ ] 포커스 트랩 내 `querySelectorAll` 는 Tab 이벤트마다 실행. 섹션 패널 크기는 소규모라 무시 가능.

### 6. 시큐리티
- [x] 외부 입력 삭제/이름 PATCH 는 기존 API 사용(Zod 검증 보존)
- [x] 토큰은 URL param 그대로 — 기존 pattern 유지, 신규 노출 벡터 없음
- [x] innerHTML / dangerouslySetInnerHTML 미사용

### 7. 코드 품질
- [x] 하드코딩 문자열 최소화(한국어 UI 문구는 spec 에 명시)
- [x] 에러 상태 live region `aria-live="polite"` 노출
- [x] `@ts-ignore` 없음, `any` 없음
- [ ] `SectionActionsPanel` 에서 tablist 를 `style={{ margin: "-16px -20px 16px" }}` 인라인 스타일로 시트 바디 패딩을 보정. CSS 로 이관 가능하나 MVP 범위 유지.

## 발견된 경미 이슈 (논블로커)
1. `SectionActionsPanel` 의 tablist 인라인 스타일 → `src/styles/side-panel.css` 로 이관 권장. 현 MVP 유지.
2. `EditSectionModal.tsx` 는 이제 참조처가 없어 dead file. 삭제하지 않는 이유: PR 크기 최소화 + 다른 브랜치에서 참조할 가능성. phase11 문서에 "추후 정리" 로 기록.
3. `StageDetailSheet` 에 남긴 v2 머지 주석은 리뷰어 힌트 — v2 가 먼저 머지되면 이 래퍼 재적용.

## 결과
**REVIEW_OK** — 배포 블로커 없음.
