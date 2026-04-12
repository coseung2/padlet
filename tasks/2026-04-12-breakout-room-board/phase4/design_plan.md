# Phase 4 — Design Plan

## UI 서피스
1. `CreateBoardModal` — "모둠 학습" 타일 추가 (이모지 👥)
2. `CreateBreakoutBoardModal` — 템플릿 그리드 (8 tiles, Pro 배지 + 잠금 아이콘) + 구성 슬라이더 + 생성
3. `BreakoutBoard` (교사 풀뷰) — 모둠 N개를 grid로 표시, 각 모둠은 카드 스택
4. 카드 컨텍스트 메뉴 — "모든 모둠에 복제" (아이콘 📋×N 또는 이모지 🧬)

## 디자인 토큰 (기존 재사용)
- 색상: `--color-breakout-group-1..N` 기존 CSS 토큰 재사용; 없으면 group-color palette 신설
- 간격: 기존 `--space-*`
- 모달: `.modal-backdrop`, `.add-card-modal` 재사용
- 레이아웃 picker: 기존 `.layout-picker`, `.layout-option` 재사용

## 상호작용 플로우
- 교사가 '+보드 만들기' → 레이아웃 '모둠 학습' → 모달
- 템플릿 선택 → 구성 → 생성 버튼 → 서버 요청 → router.push(`/board/${slug}`)
- BreakoutBoard에서 카드 ⋯ → "모든 모둠에 복제" → 확인 window.confirm → POST → 낙관적 업데이트

## 접근성
- Pro 잠금 버튼은 aria-disabled + tooltip "Pro 전용"
- 모달 focus trap은 기존 패턴 승계
- ContextMenu 키보드 내비게이션 이미 구현됨

## 갤럭시 탭 S6 Lite 고려
- 터치 타겟 44px 이상 (이미 디자인 시스템 준수)
- 카드 그리드는 CSS Grid + `grid-template-columns: repeat(auto-fill, minmax(240px,1fr))` — 태블릿에서 2~3열
- 10모둠 × 6섹션 = 60 DOM 노드는 가상화 없이 렌더 가능 (BR-6에서 WS 패치 단위)
