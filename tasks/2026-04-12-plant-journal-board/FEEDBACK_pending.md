# Plant Journal Board — Pending Feedback (2026-04-12)

> 사용자가 학생 뷰 직접 확인 후 남긴 피드백. 차후 한 번에 일괄 작업 예정.

## 학생 뷰 (RoadmapView) — 레이아웃 재설계

### 현재 구현
- 로드맵: 가로(좌→우) 지하철 노선도
- 단계 노드 탭 → 우측에서 슬라이드-인 사이드 시트(StageDetailSheet)가 튀어나옴
- 관찰 기록은 시트 열었을 때만 보임

### 요청 변경
- **로드맵 방향**: 좌측 세로(상→하) 타임라인으로 전환
- **관찰 기록 노출**: 각 단계 노드의 **우측 가로로 인라인 노출** — 해당 단계에 남긴 사진·메모가 바로 펼쳐진 상태
- **인터랙션**: 탭/시트 방식 제거. "단계 클릭 → 우측 패널" 구조가 아니라, 좌측 세로 레일 + 각 레일 옆으로 나열되는 기록 카드 뷰

### 영향 범위 (예상)
- `src/components/plant/RoadmapView.tsx` — 레이아웃 전면 리라이트 (horizontal subway → vertical timeline)
- `src/components/plant/StageDetailSheet.tsx` — 제거 또는 단순 모달로 격하 (편집만 모달로)
- `src/styles/plant.css` — 그리드/플렉스 구조 재정의
- 디자인 phase4~6 재실행 권장 (로드맵 메타포 자체 변경)

### 관련 원본 로드맵
`canva project/plans/plant-journal-roadmap.md §3.1`에 "가로 방향 지하철 노선도" 명시돼 있음 → 사용자 선호에 맞춰 로드맵 문서도 업데이트 필요.

---

## 교사 뷰 (TeacherSummaryView) — 네비게이션 재설계

### 현재 구현
- 매트릭스 뷰: 행=단계, 열=학생, 셀=썸네일 — **desktop+owner only**
- 요약 뷰: 학생 리스트(이름·종·현단계·최근기록) — 클릭해도 이동 없음, 배지만 표시

### 요청 변경
- **매트릭스 뷰 우선순위 낮춤**. 주 네비게이션은 요약 뷰의 학생 리스트에서 시작
- 학생 리스트 각 행 → **클릭 시 해당 학생의 개별 작업 보드로 진입**
- 교사는 그 보드에서 학생의 로드맵·관찰·메모를 **보고 편집**까지 가능 (현재는 본인 것만 편집 가능)

### 영향 범위 (예상)
- 새 라우트: `/board/[id]/student/[studentId]` 또는 `/classroom/[id]/students/[studentId]/plant`
- `RoadmapView.tsx` — owner가 뷰잉 중일 때 편집 허용하는 `canEdit` 분기 확장 (현재는 본인 학생만 true)
- `/api/student-plants/[id]/observations/*` API 권한 — owner도 편집 허용 추가 (현재는 본인만 허용)
- `TeacherSummaryView.tsx` — 학생 행에 `<Link>` 추가
- 매트릭스 뷰는 **유지하되 보조 뷰로 격하** (전체 한눈에 스캔 용도)

### 권한 고려
- 교사가 학생 관찰 편집 시 감사 로그 필요? 또는 "교사가 수정함" 표시?
- 현재 `scope_decision.md`의 "본인만 수정/삭제" 규칙 완화 필요 — 업데이트해야 함

---

## 차후 작업 메모
- 이 피드백은 별도 feature task로 올릴 것: `tasks/YYYY-MM-DD-plant-teacher-nav/`
- 또는 로드맵 세로 재설계와 묶어서 `tasks/YYYY-MM-DD-plant-journal-v2/` 하나의 task로 처리 가능
- 다른 피드백 항목 계속 수집 후 묶어서 한 번에 처리
