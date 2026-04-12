# Design Spec — plant-journal-board

## 1. 선택된 변형

`mockups/v1.md` — 수평 지하철 라인. 근거는 `mockups/comparison.md` §선택.

## 2. 화면 상태별 최종 디자인

### 학생 식물 선택 (PlantSelectStep)
- 2~3 columns grid(desktop 3, mobile 2), 카드 each: 이모지 60px + nameKo Subtitle + 난이도 badge + 설명 Body
- 선택 시 카드에 2px `--color-plant-active` 보더 + 체크 icon
- 하단 sticky bar: 별명 input + primary "시작" (nickname empty/>20 disabled)

### 학생 노선도 (RoadmapView — v1 스펙, phase6 반영)
위 `mockups/v1.md` 그대로, 아래 3개 수정 반영:
- **S-1**: 노드 내부는 **숫자 1~10만**(흰색 볼드), 이모지는 노드 하단 라벨에 위치
- **S-2**: 정체 배지 텍스트는 "정체 7일+" 명시하여 returned와 의미 혼동 방지
- **S-3**: <560 뷰에서 가로 스크롤 자유, active 노드는 초기 `scrollIntoView({inline:'center'})`만

### 단계 상세 시트 (StageDetailSheet)
- 데스크탑: 우측 400px drawer with 200ms slide
- 모바일(<768): 하단 시트 70vh, drag handle on top

### 관찰 에디터 (ObservationEditor)
- 모달, max-width 560px
- 드롭존: dashed `--color-border`, drag-over → `--color-plant-active` tint
- 이미지 썸네일 100×100 grid (4col desktop, 3 mobile), 각 상단 우 ✕ 버튼
- 10장 도달 시 드롭존 비활성 + "최대 10장" 안내
- 메모 textarea autoresize, char count 하단 우

### 사진 없음 사유 (NoPhotoReasonModal)
- 모달 440px
- 4 radio 프리셋 + "기타" 자유 input
- 하단 btn bar: "취소"(ghost) + "계속"(primary, 미선택 시 disabled)

### 교사 요약 (TeacherSummaryView)
- 상단: 10 stage 가로 bar, 각 stage name 아래 badge with count
- 하단: table(name/species/stage/lastObserved/stalled) — 태블릿 이상, 모바일은 card list
- 정체(≥7일) → 경고 badge `#c62828`(returned 색 재사용)

### 교사 매트릭스 (TeacherMatrixView)
- 데스크탑 only
- sticky top header(students), sticky left(stages), cell 80×80 썸네일
- 빈 cell은 dotted `--color-border` 32×32 placeholder

### 교사 Allow-list (PlantAllowListModal)
- 모달, 10 체크박스 list(이미지 + nameKo + 난이도/계절)
- 상단 "전체 선택/해제" 토글

## 3. 사용된 토큰

### 기존 토큰 (docs/design-system.md)
- `--color-bg`, `--color-bg-alt`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-text-faint`
- `--color-border`, `--color-border-hover`
- `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-accent-tinted-text`
- `--radius-card`, `--radius-btn`, `--radius-pill`
- `--font-body`, `--font-display`

### 신규 토큰 (tokens_patch.json)
- `--color-plant-active` — 현재 단계 강조
- `--color-plant-visited` — 완료 단계
- `--color-plant-upcoming` — 미래 단계
- `--color-plant-stalled` — 정체 경고 보조톤(기존 returned 색과 구분 없이 alias)

## 4. 컴포넌트 목록

### 신규 (client components)
- `PlantRoadmapBoard` — 레이아웃 루트
- `PlantSelectStep`
- `RoadmapView`
- `StageDetailSheet`
- `ObservationEditor`
- `NoPhotoReasonModal`
- `TeacherSummaryView`
- `TeacherMatrixView`
- `PlantAllowListModal`

### 기존 재사용
- `AuthHeader`, `EditableTitle`, `UserSwitcher` — 보드 헤더
- `/api/upload` 라우트 — 이미지 업로드

## 5. 접근성 적용

- 노드 버튼 `role="link"`+`aria-current="step"` for active
- 모든 모달 focus trap + Escape
- 업로드 input은 hidden `<input type="file">` + 라벨 버튼
- `aria-live="polite"` for upload progress
- 대비 검증: active 노드 흰 텍스트 볼드로 4.5:1 확보
