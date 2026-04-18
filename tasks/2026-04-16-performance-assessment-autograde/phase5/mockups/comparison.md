# Mockups Comparison — performance-assessment-autograde (MVP-0)

4 개 변형을 검토. 각 변형은 학생 Take 화면(가장 넓은 디자인 여지를 가진 화면) 기준.

## v1 — All-questions scroll (선택)

- 한 페이지에 모든 문항 세로 스크롤.
- 타이머 sticky top, 제출 버튼 sticky bottom.
- 각 문항 번호 좌측 인덱스.

장점: 학생이 전체 진행 한눈에 파악, "이전 문항으로" 탐색 자유. 실 구현 간단 (DOM 단순).
단점: 문항 수 ≥ 30 시 스크롤 과도. MVP-0 ≤ 20 문항 한도에서는 OK.

## v2 — One-question-at-a-time with pagination

- 문항 1개만 보이고 "다음" 버튼.
- 하단 ●●●○○ 진도 인디케이터.

장점: Kahoot 풍, 집중도 ↑. 태블릿 소화면에 유리.
단점: 이전 문항 재검토 불편. 네비게이션 UI 추가 필요. MVP-0 단순성 원칙 위반.

## v3 — Sidebar navigation + content

- 좌측 문항 인덱스 리스트(1,2,3...) + 우측 현재 문항.
- 인덱스에서 이미 답한 문항 체크마크.

장점: 자유 네비 + 진행상황 명확.
단점: 태블릿 portrait 에서 sidebar 공간 과다. CSS 복잡.

## v4 — Card deck swipe

- 모바일 스와이프 제스처로 문항 전환.
- Gesture 기반.

장점: 모바일 친화.
단점: 태블릿 primary + 데스크톱 교사 뷰와 상충. 제스처 라이브러리 필요.

## 결정

**v1 채택**. MVP-0 핵심이 단순성 + 기존 CSS 재활용. v2/v3 는 MVP-1 에서 문항 ≥ 20 나타나면 재검토.
