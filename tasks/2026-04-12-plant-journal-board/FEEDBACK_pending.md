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

## 차후 작업 메모
- 이 피드백은 별도 feature task로 올릴 것: `tasks/YYYY-MM-DD-plant-roadmap-vertical/`
- 다른 피드백 항목 수집 후 묶어서 한 번에 처리
