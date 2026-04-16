# Research Pack — section-actions-panel

## 내부 사례 분석 (in-repo)

### A. plant `StageDetailSheet` (benchmark)
- 경로: `src/components/plant/StageDetailSheet.tsx`
- 패턴: `backdrop(button) + aside[role=dialog]` 우측 슬라이드 시트, 모바일에선 bottom-sheet fallback
- a11y: `role=dialog`, `aria-labelledby`, ESC 닫기 keydown 리스너 (useEffect 안 cleanup)
- CSS 토큰: `--color-surface`, `--shadow-card`, `--color-border`, `--color-text-muted`, `--radius-card`, `--radius-btn`
- 뷰포트 전환 기준: `@media (min-width: 768px)` — 이 미만에서는 하단 시트(border-radius 16 16 0 0), 이상에서는 우측 고정 420px
- z-index: backdrop 90 / panel 100
- 한계:
  - 포커스 트랩 없음 (ESC만)
  - 스크롤 락 없음 (body overflow 처리 X)
  - backdrop이 `<button>` 이라 tab stop 발생 (의도: 키보드 접근성)
  - `open` prop만 있고 open 시점에 autoFocus 처리 없음

### B. 기존 Modal 컴포넌트들
- `EditSectionModal`, `AddCardModal`, `EditCardModal` 등 모두 `.modal-backdrop + .add-card-modal` 중앙 정렬 다이얼로그
- 우측 슬라이드 패턴은 plant 만 가지고 있음

### C. `SectionShareClient`
- 이미 client 컴포넌트로 분리돼 있음 (page 없이 단독 사용 가능)
- `boardId`, `sectionId`, `initialToken` 만 받음 → 패널 안에 그대로 끼워넣기 용이

### D. `/api/sections/[id]/share` (POST)
- owner-only, constant-time 비교는 GET 쪽 (page token gate) 에서 처리됨
- 토큰 회전 시 DB에 새 값 저장 → 구 링크 즉시 무효화
- 우리 패널은 이 API 그대로 호출, 변경 불필요

## 외부 UX 패턴 (기존 지식 기반)

### Right-side Sheet/Drawer 주요 사례
| 제품 | 패턴 | 특징 |
|---|---|---|
| Linear | 이슈 상세 우측 드로어 | ESC/outside click 닫기, URL 싱크 없음 |
| Notion | 페이지 사이드피크 | 우측 40% 폭, 중앙 편집창 유지 |
| Figma | 우측 인스펙터 | 상주 패널 (탭 방식 속성 분기) |
| Padlet (실물) | 섹션 설정 모달 중앙 | 우리와 다른 방향 |
| Google Classroom | 스트림 우측 슬라이드 | 탭 없음, 단일 폼 |

### 공통 a11y 요구사항 (WAI-ARIA APG - Dialog (Modal))
- `role=dialog` + `aria-modal=true`
- 초기 포커스는 다이얼로그 내부 첫 focusable 또는 close 버튼
- Tab/Shift+Tab 포커스 트랩
- ESC 닫기
- 배경 body scroll lock (iOS Safari 에서 특히 중요)
- close 시 opener 로 포커스 복귀

## 기술 참조
- React 19: `useEffect` cleanup, `useRef` for focus management
- Next 16 App Router: client component `"use client"` 유지
- 기존 modal.css 와 충돌 없게 새 prefix `side-panel-*` 사용 권장
- plant-sheet-* 클래스는 보존하고 SidePanel base 로 alias 하는 전략도 가능 (하지만 분리가 깔끔)

## 리스크 & 미지수
1. StageDetailSheet 를 SidePanel base 로 리팩터할 때 teacher matrix view 에서의 렌더 위치(`TeacherMatrixView.tsx`)가 깨지면 plant v1 teacher 경로 회귀
2. plant-journal-v2 가 동시에 StageDetailSheet 를 수정 중일 수 있음 → 머지 충돌 예상
3. 포커스 트랩 구현 누락 시 기존 plant Sheet 대비 a11y 회귀 가능성

## 의사결정 포인트
- **옵션 1**: SidePanel 을 plant 와 무관하게 신설 + StageDetailSheet 내부만 SidePanel 로 wrap
- **옵션 2**: plant-sheet-* 를 `.side-panel-*` 로 rename + 전체 교체
- **옵션 3**: plant 는 건드리지 않고 SidePanel 별도 신설 (플랜 B)

→ phase2 에서 선택. 권장: **옵션 1 (safety)** — v2 브랜치 충돌 최소화.
