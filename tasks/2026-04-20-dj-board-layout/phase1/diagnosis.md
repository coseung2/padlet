# Diagnosis — dj-board-layout

## 1. 재현 절차

1. DJ 역할이 부여된 학급에서 `/board/[id]` (layout=`dj-queue`) 보드 생성 또는 열기.
2. DJ 학생(또는 교사)으로 로그인 후 해당 보드 진입.
3. 큐에 YouTube 곡을 **여러 개(≥5곡)** 신청하고, 몇 곡은 재생 완료(`played`) 처리.
4. 뷰포트 너비 ≥ 1280px(노트북/태블릿 가로)로 관찰.
5. 페이지를 아래로 스크롤.

### 재현 결과 (코드 기반 예측 — 실측 재현 환경 제약 아래 "Environment" 참조)

- 우측 `.dj-ranking` 영역이 260px 고정폭으로 좁게 표시됨.
- 곡 제목 긴 항목은 `ellipsis`로 잘림(콘텐츠 박스 ~228px, 제목 영역 ~100px).
- 메인 컬럼(큐 + Now Playing 플레이어 240×135 썸네일 포함)이 길어질수록, sticky로 고정된 우측 랭킹 아래로 **본문과의 높이 차만큼 빈 공백**이 노출됨.

## 2. 증상 범위

- **영향 사용자**: DJ 보드를 여는 모든 사용자(DJ 학생/일반 학생/교사). DJ 역할자는 주 사용자이므로 체감이 큼.
- **영향 페이지/기능**: `/board/[id]` 중 `board.layout === "dj-queue"`인 보드만. 다른 레이아웃(freeform/columns/breakout) 영향 없음.
- **영향 뷰포트**: ≥ 1280px (3-컬럼 분기 이상). 1279px 이하는 1-컬럼으로 재배치되어 증상 없음.
- **시작 시점**: `8e52ab9 fix(dj-board): raise 3-col breakpoint to 1280px + queue row flex-wrap` 직전부터 3-컬럼 그리드 정의가 존재 → DJ 보드 최초 도입(`205fe97 feat(dj-board): YouTube queue layout + classroom role system`)부터 누적된 설계 문제.
- **심각도**: low (미관/레이아웃, 기능 손상 없음).

## 3. 근본 원인

세 가지 설계 결정이 중첩되어 증상을 만듦 — 단일 버그 아님:

### (a) 우측 컬럼 폭이 260px **고정**
`.dj-board { grid-template-columns: 160px minmax(320px, 1fr) 260px; }`
우측이 `1fr` 또는 `minmax(auto, …)`가 아닌 **고정 260px**이므로, 뷰포트가 커져도 사이드바는 넓어지지 않고 **중앙만 확장**. 사용자가 느끼는 "우측이 좁다"는 정확히 이 고정폭 때문.
또한 사이드바 내부 `.dj-ranking-section`의 padding 14×16을 빼면 콘텐츠 박스 ~228px. 썸네일·랭크·카운트 자리를 빼면 곡명 영역은 ~100px로 극단적 ellipsis.

### (b) 우측 컬럼이 `position: sticky; top: 24px;`
본문(`.dj-board-main`)은 Now Playing 카드(큰 썸네일 240×135) + 큐 N개 + 신청 버튼 → 쉽게 1000-2000px로 증가.
랭킹 사이드바는 2개 섹션 × 최대 10개 row → 고정 높이 약 500-600px에서 멈춤.
sticky가 유지되므로 스크롤이 내려갈수록 우측에는 **짧은 카드 + 그 아래 빈 영역**이 점점 커져 보임. 사용자가 느끼는 "공백 과도"는 이 높이 차.

### (c) `align-items: start` + sticky
`align-items: start`로 자식들이 top에 정렬되고 sticky가 작동하는 구조에서, 우측 컬럼이 본문 높이까지 stretch되지 않음. 즉 **트랙은 본문 전체 높이만큼 확보되어 있지만 그 안의 콘텐츠만 짧은 상태** — 보이는 것도 공백이고 실제 레이아웃 상으로도 공백이 정상.

### 코드 경로 (worktree 기준)

- `.claude/worktrees/stupefied-benz-0c99b1/src/styles/boards.css:302-310` — 그리드 정의
- `.claude/worktrees/stupefied-benz-0c99b1/src/styles/boards.css:319-325` — `.dj-ranking` sticky
- `.claude/worktrees/stupefied-benz-0c99b1/src/styles/boards.css:872-878` — `.dj-played-stack` sticky (좌)
- `.claude/worktrees/stupefied-benz-0c99b1/src/components/DJBoard.tsx:234-294` — 렌더 트리
- `.claude/worktrees/stupefied-benz-0c99b1/src/components/dj/DJRanking.tsx` — 사이드바 컴포넌트(섹션 2개)

### 회귀 커밋

- `205fe97 feat(dj-board): YouTube queue layout + classroom role system` — 최초 도입 시점에 3-컬럼 구조 확정.
- `66c46de fix(dj-board): teacher identity + add play button + monthly ranking sidebar` — 랭킹 사이드바 추가(= 우측 컬럼에 콘텐츠 배치).
- `8e52ab9 fix(dj-board): raise 3-col breakpoint to 1280px + queue row flex-wrap` — 분기점을 1280px로 올려 3-컬럼 노출 범위를 좁혔으나 **3-컬럼 내부 비율 자체는 그대로**.

## 4. 증거 목록

- `evidence/grid-definition.css` — 그리드/sticky/반응형 CSS 원본 인용
- `evidence/layout-math.md` — 뷰포트별 컬럼 폭 계산 + sticky 공백 발생 메커니즘

### 교차 검증 상태

본 진단은 **단일 소스(코드)** 기반입니다. incident _index.md의 "로그/모니터링/사용자 재현 세 소스 교차 검증" 원칙을 완전히 충족하지 못합니다. 사유:

- 로그/모니터링: 미관 이슈라 서버 로그에 흔적 없음(정상).
- 사용자 재현: dev 서버 실측이 필요한데 메인 repo의 main 브랜치에는 DJ 보드 코드가 없고(워크트리 브랜치 `feat/classroom-bank`·`feat/dj-board-queue-v2`에만 존재), worktree는 사용자 지시에 의해 수정/실행 금지.
- 사용자 관찰: 스크린샷 없음 — 프롬프트 서술에만 의존.

phase2 진행 전 사용자가 실측 확인(스크린샷 제공 또는 별도 환경에서 브랜치 체크아웃)을 해주는 것을 권장합니다.

## 5. 수정 방향 (제안만 — phase2에서 구현)

### 권고안 A (최소 변경·권장): 우측 컬럼을 가변폭으로 + sticky 제거
- `.dj-board`의 `grid-template-columns`를 `160px minmax(320px, 1fr) minmax(260px, 340px)` 또는 `minmax(240px, 0.4fr)`로 변경하여 뷰포트가 커질 때 우측도 확장.
- `.dj-ranking`의 `position: sticky; top: 24px;`를 제거 → 본문과 같이 스크롤되어 "고정 + 아래 공백" 증상 소멸.
- 장점: CSS 2곳 수정, 기능 변경 없음, 가장 surgical.
- 단점: 긴 스크롤 시 랭킹이 시야에서 사라짐. 하지만 랭킹은 non-critical 정보이므로 수용 가능.

### 권고안 B: 우측 사이드바를 본문 끝으로 이동(컬럼 2개로 축소)
- 그리드를 `160px minmax(320px, 1fr)` 2-컬럼으로 유지하고, 랭킹은 본문(`.dj-board-main`) 하단 또는 Now Playing 옆 별도 카드로 이동.
- 장점: 가로 공간을 메인 콘텐츠에 몰아주어 3-컬럼 비율 문제 원천 해소.
- 단점: 정보 구조 변경 → 디자인 리뷰 필요. phase2 surgical 원칙 위배 가능성.

### 권고안 C: 우측 카드를 "통계 카드" 형태로 재정의
- 현재 우측은 "이번달 재생 랭킹 + 신청자 랭킹" 두 섹션. 이를 3-4개 작은 통계 카드(총 재생수, 이번주 TOP 1, 대기 중 곡 수, 이번달 인기 신청자)로 리디자인하고 우측 컬럼 폭을 300-320px로 조정.
- 장점: 우측의 좁은 공간을 "정보 밀도 높은 위젯 보드"로 재활용.
- 단점: UI 리디자인 스코프 — incident 파이프라인보다 feature task가 적합할 수 있음.

### 권고안 우선순위

1. **A 먼저 적용** — incident hotfix 성격에 부합, 커밋 2-3줄 수정으로 증상 제거.
2. B/C는 후속 feature task로 승격 검토.

## 핸드오프

검증 게이트("진단 검증") 요구: 근본 원인(§3) + 재현 조건(§1) + 권고안(§5 A/B/C) 세 항목 모두 존재 — 통과.

phase2는 본 diagnosis.md만 입력으로 사용하며, 실제 CSS 수정은 **메인 repo에서 feat/classroom-bank 브랜치 체크아웃 후** 진행해야 함(worktree는 건드리지 않음). 사용자 승인 대기.
