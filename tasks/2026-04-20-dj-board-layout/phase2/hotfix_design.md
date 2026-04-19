# Hotfix Design — dj-board-layout

## 권고안 적용
diagnosis.md §5 **권고안 A** (minimal·권장) 채택.

## 변경 요약
CSS 2곳 · 총 `+1 / -3` 실효 변경.

| 위치 | before | after |
|---|---|---|
| `src/styles/boards.css:307` | `grid-template-columns: 160px minmax(320px, 1fr) 260px;` | `grid-template-columns: 160px minmax(320px, 1fr) minmax(260px, 340px);` |
| `src/styles/boards.css:319-325` | `.dj-ranking { ... position: sticky; top: 24px; }` | `.dj-ranking { ... }` (두 줄 제거) |

## 왜 최소인가 (Karpathy §2 Simplicity First · §3 Surgical)
- **한 CSS 파일 · 두 선택자만** 수정. 컴포넌트 계층, 상태, 접근성 코드 일절 건드리지 않음.
- 우측 폭 상한을 340px로 제한해 4-컬럼 수준으로 벌어지는 상황을 예방. 원래 의도(사이드바 역할)를 유지.
- sticky 제거로 "본문 길이 > 사이드바 높이"의 빈 공간 문제가 구조적으로 제거됨. JS/레이아웃 재구성 불요.
- 대안 B/C(디자인 변경)는 incident 스코프 밖이라 배제.

## 롤백
`git revert 9f506d8` — CSS 2줄만 되돌리면 끝. 기능적 의존 없음.

## 회귀 테스트
`src/styles/dj-board-layout.vitest.ts` 추가:
- `.dj-board`의 `grid-template-columns`에 고정 `260px` 재등장 금지, `minmax(260px, 340px)` 존재 보장.
- `.dj-ranking` 블록에 `position: sticky` 재삽입 금지.

CSS 전용 변경이라 DOM·스냅샷 기반 visual regression은 인프라 부재로 생략. 본 text-level assertion으로 실수로 이전 상태 복귀되는 것 방지.

## 남은 검증
- phase3 code review (Karpathy 4원칙 + surgical diff 검수).
- 시각 확인(선택): main 브랜치에서 `/board/[id]` layout=dj-queue 보드에 큐 5곡 이상 + 1280px 이상 뷰포트로 재현 후 우측 공백 해소 확인.
