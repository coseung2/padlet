# Breakout Section Isolation — Pending Feedback (2026-04-12)

> 사용자가 공유 관리 플로우 체험 중 남긴 피드백. 차후 일괄 작업 예정.

## Columns 보드 — 섹션 관리 UI 패턴 교체

### 현재 구현
- "공유 관리"는 **별도 라우트** (`/board/[id]/s/[sectionId]/share`)로 이동
- owner가 섹션 토큰을 발급·회전·복사하려면 페이지 전환 필요
- 기존 columns 보드의 섹션 헤더에는 공유 진입점 없음 (섹션 내부 breakout 뷰에 들어가야 보임)

### 요청 변경
- 공유 관리(토큰 발급/회전/복사 링크) 등 **섹션별 옵션을 우측 슬라이드 패널**로 제공
- 참고 UX: 식물 로드맵에서 단계 노드 탭 시 우측에서 펼쳐지는 `StageDetailSheet` 패턴
- 섹션 헤더 "⋯" 같은 액션 버튼 → 우측 패널 오픈 → 공유, 이름 변경, 삭제 등 한 곳에서 처리
- 페이지 전환 없이 columns 보드 컨텍스트 유지

### 영향 범위 (예상)
- `src/components/ColumnsBoard.tsx` — 섹션 헤더에 액션 버튼 추가, 패널 상태 관리
- 새 컴포넌트: `SectionActionsPanel.tsx` (우측 슬라이드 시트 — plant `StageDetailSheet` 참고)
- `/board/[id]/s/[sectionId]/share` 라우트는 **유지** (직접 링크로 접근도 가능하게) 또는 패널로 완전 대체 후 라우트 제거
- 토큰 발급/회전 API는 그대로 사용 (`POST /api/sections/[id]/share`)

### 주의
- 식물 로드맵의 `StageDetailSheet` 자체는 **학생 뷰에서 인라인 노출로 교체 예정** (plant-journal FEEDBACK 참고). 시트 컴포넌트 자체는 재사용 가능하니 제거하지 말고 범용화 고려.

---

## 차후 작업 메모
- 이 피드백은 별도 feature task로 올릴 것: `tasks/YYYY-MM-DD-section-actions-panel/`
- plant-journal FEEDBACK과 묶어서 "섹션/스테이지 우측 패널 통합 리팩터" task로 처리 가능
