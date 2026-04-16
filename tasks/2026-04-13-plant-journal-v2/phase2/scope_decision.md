# Scope Decision — plant-journal-v2

## 1. 선택한 UX 패턴

**Part A** — `P1-vertical-timeline-inline` (research_pack §P1) + `P3-current-stage-composer` + `P4-modal-editor-plus-lightbox`.
- 근거: 현재 가로 로드맵 + 슬라이드 시트 조합은 학생이 "해당 단계에서 뭘 기록했는지" 한 눈에 보지 못함. 세로 타임라인 + 인라인 기록 렌더는 스크롤 한 방향으로 전체 journal을 훑게 해 학생 피드백(§학생 뷰)의 원인을 제거한다.
- 기각: `P2-sticky-rail` (6-10 단계 규모에서 필요 없음), `P6-teacher-edit-badge` (스키마 변경 필요 → 금지 제약 + FEEDBACK에서도 nice-to-have).

**Part B** — `P5-row-as-link` + `P7-owner-impersonation-subpath`.
- 근거: Google Classroom/Seesaw 두 레퍼런스 모두 동일 패턴을 쓰며 교사에게 예측 가능. Owner-only gating은 server component + classroom.teacherId 체크로 이미 있는 `canAccessStudentPlant` 로직과 동치.

## 2. MVP 범위

### IN
- **A1** RoadmapView를 세로 타임라인 레이아웃으로 전면 리라이트. 좌측 stage-rail + 각 stage 우측 inline 기록 블록.
- **A2** 학생 플로우에서 `StageDetailSheet` 사용 제거(컴포넌트 자체는 유지하되 import/mount 하지 않음; 혹은 삭제).
- **A3** 관찰 추가/수정 → 기존 `ObservationEditor` 모달 재사용(트리거만 inline CTA로 이동).
- **A4** 사진 없음 사유 모달(`NoPhotoReasonModal`) + 다음 단계 이동 버튼 → 현재 stage 블록 footer에 inline 배치.
- **A5** 썸네일 → 원본 라이트박스 동작 보존.
- **A6** `canva project/plans/plant-journal-roadmap.md §3.1` 문구 업데이트 ("vertical timeline").
- **B1** 신규 라우트 `src/app/board/[id]/student/[studentId]/page.tsx` — server component. Board owner(=classroom teacher)만 200, 그 외 403.
- **B2** `TeacherSummaryView.tsx` — 학생 행 전체를 해당 라우트로 가는 링크로 변환. "매트릭스 뷰" 버튼을 보조 링크 스타일로 격하.
- **B3** `PATCH /api/student-plants/[id]` — 기존에 없던 nickname 수정 엔드포인트 신설. owner + student 본인 허용.
- **B4** `/api/student-plants/[id]/observations`, `/[oid]`, `/advance-stage` — owner edit 허용하도록 권한 완화 (`gate.ok && (ownedByActor || actor.kind==="teacher")` 허용).
- **B5** 새 라우트는 `RoadmapView`를 `canEdit={true}`로 렌더. 기존 학생 플로우와 동일 동작. 추가 UI로 "교사 모드" 배너.
- **B6** v1 `scope_decision.md` "본인만 수정/삭제" 룰은 이 task에서 완화됨을 명시.

### OUT
- **교사 편집 감사 배지 (P6)** — 스키마 변경 필요. 후속 task 후보.
- **"교사 모드" 감사 로그 테이블** — 동일 사유로 제외.
- **nickname 외 플랜트 메타 편집 (species 변경)** — 별도 feature. 이번 task에서는 nickname만.
- **모바일 전용 sticky 레일(P2)** — YAGNI.
- **breakout / quiz / canva 관련 어떤 변경도 제외.**

## 3. 수용 기준 (Acceptance Criteria)

1. `RoadmapView`가 `.plant-timeline` 컨테이너(세로 방향)로 렌더되며, 좌측 rail과 각 stage별 inline 기록 블록이 동시에 보인다. 탭/클릭 없이 모든 stage의 기록이 펼쳐진 상태다.
2. `StageDetailSheet` 컴포넌트는 `RoadmapView` 및 `PlantRoadmapBoard`에서 import되지 않는다 (grep 0 match).
3. 학생(=canEdit) 세션에서 현재 stage 블록 내 "관찰 추가" CTA 클릭 → `ObservationEditor` 모달 오픈 → 제출 후 해당 stage 블록에 새 카드가 렌더된다 (SSR/CSR 새로고침 없이 상태 업데이트).
4. 학생 세션에서 이전 stage 카드의 "수정"/"삭제" 버튼이 동작한다 (PATCH/DELETE 호출 후 UI 갱신).
5. 학생 세션에서 현재 stage에 사진이 0장일 때 "다음 단계로" 버튼 → `NoPhotoReasonModal` 오픈 → 사유 제출 시 `/advance-stage` 성공.
6. `/board/[id]/student/[studentId]` 라우트가 교사(board owner) 세션에서 200을 반환하고 `RoadmapView`를 `canEdit={true}`로 렌더한다. 학생이 해당 반이 아니면 403.
7. 같은 라우트가 비-owner 세션(다른 교사, 학생 비본인, 익명)에서 403 응답 또는 403 UI를 돌려준다.
8. `TeacherSummaryView`의 학생 테이블 각 행이 `<Link href="/board/{boardId}/student/{studentId}">`로 감싸진다. 매트릭스 뷰 링크는 secondary 스타일(뮤트 컬러/아웃라인)로 격하된다.
9. `PATCH /api/student-plants/[id]` 엔드포인트가 `{ nickname }`를 받아 owner 및 student 본인 세션에서 200. 타 세션에서는 403.
10. 관찰 POST/PATCH/DELETE 및 advance-stage API가 owner(teacher of classroom) 세션에서도 201/200으로 성공. (v1에서는 403이던 케이스).
11. `canva project/plans/plant-journal-roadmap.md §3.1`에 "세로 타임라인" 문구로 업데이트돼 있다.
12. v1 기능 회귀 없음: PlantSelectStep, TeacherMatrixView, NoPhotoReasonModal, ObservationEditor, `/api/boards/[id]/plant-journal` GET 모두 smoke test 통과.
13. `npm run build` + `npx tsc --noEmit` 성공.

## 4. 스코프 결정 모드

**Selective Expansion** — Part A는 레이아웃 전면 리라이트(확장), Part B는 새 라우트 + API 권한 완화(확장). 감사 배지/audit log/species 편집 같은 인접 요구는 제외(Selective).

## 5. 위험 요소

- **R1 (권한 오류)** — owner 세션이 observation POST/PATCH/DELETE를 허용받으면, 기존 "ownedByActor" 분기와의 상호작용으로 학생 세션에서 의도치 않은 타 학생 접근이 열릴 수 있음. 완화: 기존 `canAccessStudentPlant`가 student actor에 대해 ownedByActor=false면 이미 403으로 끊고 있음. owner 분기만 분리해서 열 것. 테스트 10, 7로 검증.
- **R2 (route 404)** — `/board/[id]/student/[studentId]`에서 boardId=slug인 경우(보드 URL은 slug도 허용). 기존 page.tsx가 `OR: [{ id }, { slug: id }]`로 조회하므로 새 라우트도 동일 패턴을 사용해야 함.
- **R3 (세로 타임라인 성능)** — 전체 관찰을 한 번에 렌더. 썸네일+lazy 로드로 완화. 다량 이미지 학급에서는 모니터링 필요.
- **R4 (디자인 토큰 이탈)** — v1이 일부 인라인 스타일을 사용함. v2에서는 plant.css에 새 클래스(`.plant-timeline`, `.plant-stage-row`, …)를 추가하고 토큰만 사용.
- **R5 (feedback 문서 상충)** — v1 scope_decision.md의 "본인만 수정/삭제" 룰이 완화됨. v2 scope_decision.md(본 문서)가 오버라이드함을 §2 B6에 명시.
- **R6 (PlantRoadmapBoard 서버/클라이언트 경계)** — 새 라우트는 server component이지만 RoadmapView는 client. `getCurrentUser` + classroom.teacherId 체크는 서버에서, 이후 초기 state는 `/api/student-plants/[id]` 응답(서버-side fetch 혹은 직접 db)로 구성.
