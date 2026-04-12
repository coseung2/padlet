# Phase 5 — Design Spec (선정안)

## 선정안: "모둠별 컬러 그리드"

### CreateBreakoutBoardModal
- 헤더: "모둠 학습 보드 만들기" + 닫기 X
- 3탭 스텝 진행 바 (1.템플릿 / 2.구성 / 3.확인)
- 템플릿 그리드: 2열 × 4행, 각 타일
  - 이모지 (큰 사이즈)
  - 제목 + "Free"/"Pro 전용" 배지
  - 1줄 설명
  - recommendedVisibility 힌트 아이콘 (👁 peek-others, 🔒 own-only)
- 구성 페이지:
  - 모둠 수: stepper (-/+) 1-10, default 4
  - 모둠 정원: stepper 1-6, default 6
  - 열람 모드: 라디오 (템플릿 권장값 기본 선택)
- 확인 페이지: 요약 텍스트 + "보드 만들기" primary 버튼

### BreakoutBoard 교사 뷰
- 헤더 하위에 teacher-pool 섹션 가로 카드 밴드 (있을 때만)
- 메인: `.breakout-groups-grid` (CSS Grid auto-fill 240px)
  - 각 `.breakout-group` 카드
    - 상단: 모둠 번호 + (정원 표시는 BR-5에서)
    - 섹션 탭 (예: KWL은 K/W/L 3개) — role=group-copy만
    - 현재 탭의 카드 리스트 (column-card 재사용)
  - "+카드 추가" 버튼은 교사 권한 시만
- 카드 컨텍스트 메뉴: 수정 / 복제 / **📋 모든 모둠에 복제** / 삭제

### 탈락안 (3개, phase5/rejected/ 로 아카이브)
1. "시계열 타임라인" — 모둠 간 타임스탬프 비교 → v1 불필요
2. "탭뷰 한 모둠씩" — 교사가 모둠 비교하기 어려움
3. "세로 열거" — 태블릿 가로 공간 낭비

선정 근거: 교사가 10모둠을 한눈에 비교·관리하는 것이 가장 빈번한 워크플로우.
