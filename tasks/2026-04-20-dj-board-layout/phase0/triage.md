# Triage — dj-board-layout

## 증상 (관찰)

DJ 담당 학생이 DJ 보드(`/board/:id`, layout=`dj-queue`)를 열었을 때:

- 우측 사이드바(랭킹/통계 카드 영역)가 **좁게** 노출.
- 메인 큐 컬럼이 길어지면 우측 사이드바 콘텐츠 아래로 **과도한 공백**이 생김.
- 좌(played stack) / 중(main queue) / 우(ranking) 3-컬럼 비율이 부자연스럽다고 사용자 보고.

> 원인은 추측하지 않음 — phase1에서 규명.

## severity 분류

**low** — 미관/레이아웃 문제. 기능 손상 없음. 사용자가 곡 신청·승인·재생·삭제 모두 정상 수행 가능.
우회 불필요. 데이터 손실·보안·인증 영향 없음.

## 영향 범위 (초기 관찰)

- 페이지: `/board/[id]` 중 `layout === "dj-queue"`인 보드만.
- 사용자: DJ 역할 학생 + DJ 보드를 열람하는 모든 교사/학생.
- 뷰포트: ≥1280px(3-컬럼 분기 기준) — 아래는 1-컬럼이라 해당 없음.

## 초기 증거

- CSS 그리드 정의 — `.claude/worktrees/stupefied-benz-0c99b1/src/styles/boards.css:302-310`
  ```css
  .dj-board {
    max-width: 1300px;
    display: grid;
    grid-template-columns: 160px minmax(320px, 1fr) 260px;
    gap: 20px;
  }
  ```
- 반응형 분기 — 같은 파일 1042-1058: `max-width: 1279px` 이하에서 1-컬럼.
- 우측 컬럼 컴포넌트 — `.claude/worktrees/stupefied-benz-0c99b1/src/components/dj/DJRanking.tsx` + `.dj-ranking { position: sticky; top: 24px; }` (boards.css:319-325).

## 긴급 단축 여부

해당 없음 (severity=low).

## 환경 제약 (진단 시 고려사항)

- 관련 코드(`DJBoard`, `dj/*`, `.dj-board` CSS)는 현재 **worktree 브랜치(`feat/classroom-bank`)에만 존재**. `main` 브랜치엔 없음.
- 메모리 규칙에 따라 dev 서버는 메인 repo 경로에서만 실행 가능하나, 메인 repo의 main 브랜치엔 DJ 보드 코드가 없어 **chrome MCP로 실측 재현은 불가능**.
- 재현·진단은 worktree의 정적 코드(읽기 전용) 기반으로 수행. worktree 파일 수정은 금지.

## 핸드오프

phase1 investigator → 위 CSS 그리드 정의의 우측 260px 고정폭 + sticky 정책이 "좁고 공백 과도" 증상을 어떻게 만들어내는지 규명하고 권고안 3개 이상 제시.
