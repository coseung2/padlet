# phase5 Shotgun SKIP — breakout-section-isolation

## 사유

본 task의 신규 UI 표면은 다음과 같이 최소/기능적이다:

1. **Breakout View** — 기존 `column-card` / `.forbidden-card` / `.board-header` 컴포넌트 스타일을 **재사용**하는 카드 리스트. 단일 컬럼(현재 섹션) 렌더. 새로운 비주얼 언어 없음.
2. **Share Page** — 공유 URL `<input readonly>` + [복사] / [새로 생성] 버튼 2개. 단일 CTA 플로우.

"shotgun 4~6안 변형"은 진지한 디자인 의사결정이 필요한 표면에서 타당한 비용이지만, 두 화면 모두 `docs/design-system.md`의 기존 토큰/패턴에 매핑되므로 변형 생성은 AI slop을 유발할 위험이 크다.

대신 **단일 design_spec.md**로 최종 스펙만 기록한다. phase6 리뷰어는 이 스펙을 기존 디자인 시스템 대조로 평가한다.

## 오케스트레이터 판정

`prompts/feature/_index.md` 스킵 규칙에는 `shotgun SKIP`이 명시돼 있지 않으나, `prompts/feature/phase6_design_reviewer.md`는 design_spec + mockups 의존. design_spec.md 단일 파일로 핸드오프 일관성 유지. mockups/ 디렉토리 생성 없음.
