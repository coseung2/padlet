# Phase 5 (Designer) — SKIP

## 사유

Shotgun 4~6 변형 탐색은 주로 **신규 컴포넌트 패턴**일 때 의미 있음. 본 feature 의 UI 블록은 전부 기존 패턴의 조합:

- 교사 컨트롤 패널 → `ClassroomStoreTab`/`VibeArcadeBoard` 의 교사 panel 패턴 재사용
- 학생 입력창 → `CardComposer` 의 짧은 변형
- 리스트/타임라인 → `DJQueueList` 구조 축약
- 바/파이 차트 → SVG 직접 렌더 (외부 라이브러리 없음)
- 워드클라우드 → d3-cloud 기본 레이아웃 + 프로젝트 색 토큰

시각 변형 탐색이 필요한 유일한 곳은 워드클라우드 컬러/폰트 매핑인데, 이는 phase 7 구현 중 tokens.ts 한 줄로 swap 가능.

## 선정된 변형 기준 (phase7 에 전달)

- 워드클라우드 폰트 크기: min 12, max 56, log 스케일 (빈도 1 일 때 min, 최고 빈도일 때 max)
- 색상: `--color-accent` 계열 3톤 로테이션 (빈도 상위 1/3, 2/3, 3/3)
- 회전: MVP 에선 0°/90° 두 각도만 (접근성)

## 탈락 변형 (rejected)

`phase5/rejected/` 디렉토리는 생성하지 않음 (탐색 미실행).
