# Design Spec — dj-board-queue

## 1. 선택된 변형

**`mockups/v2_selected.md` — Vertical list with pinned Now-Playing**

선택 사유:
- `design_brief.md §1~2` 정보 계층과 정확 매치 (Now-Playing 최우선 → Up-Next → CTA)
- 단일 column → 모바일/데스크탑 동일 구조, 스크린리더 동선 단순
- 접근성 9/10, 정보 계층 9/10, MVP 적합성 10/10 (comparison 표)
- 기존 `ColumnsBoard.tsx` reorder 로직 재사용 가능
- YouTube iframe embed 도입 시에도 v2 구조에서 Now-Playing 영역만 확장하면 됨 (확장성 8/10)

## 2. 화면 상태별 최종 디자인

| 상태 | 구조 | 노출 요소 | 토큰 |
|---|---|---|---|
| **empty (DJ/교사)** | 중앙 정렬 🎧 아이콘 + "아직 신청 곡이 없어요" + "첫 곡 추가" CTA | `.dj-board-empty`, `.dj-empty-cta` | `--color-text-muted`, `--color-accent` |
| **empty (학생)** | 중앙 🎧 + "아직 신청 곡이 없어요" + "곡 신청" CTA | 동일 | 동일 |
| **loading** | `<ul>` 안에 skeleton 3행 (96×54 썸 placeholder + 12px bar × 2) | `.dj-queue-skeleton` + `@keyframes shimmer` | `--color-surface-alt` |
| **ready (DJ)** | Now-Playing + 리스트(드래그핸들·썸·info·status·⋯) + 하단 CTA | 전체 | 전체 |
| **ready (학생)** | 동일 레이아웃, 드래그핸들·ContextMenu 숨김. 본인 pending "취소" 버튼 조건부 | `.is-viewer` 클래스 부착 → 숨김 CSS | 전체 |
| **modal — initial** | URL 입력 + 신청(비활성) + 취소 | `.dj-submit-modal` | `--color-surface`, `--color-border` |
| **modal — validating** | URL 아래 "미리보기 확인 중…" 스피너 | `.dj-submit-validating` | `--color-text-faint` |
| **modal — preview-ready** | 썸네일 + 제목 + 채널 + 신청(활성) | `.dj-submit-preview` | `--color-accent` |
| **modal — invalid-url** | "YouTube 링크만 신청할 수 있어요" (빨강) | `.dj-submit-error` | `--color-status-returned-text` |
| **modal — fetch-failed** | "재생할 수 없는 영상이에요" (빨강) | 동일 | 동일 |
| **modal — submitting** | 신청 버튼 spinner | `.dj-submit-btn.is-loading` | `--color-accent` |

## 3. 사용된 토큰

### 기존 재사용
- `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-text-faint`
- `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-accent-tinted-text`
- `--color-border`, `--color-border-hover`
- `--color-status-reviewed-bg/-text` (approved pill)
- `--color-status-returned-bg/-text` (rejected pill — 기본 숨김)

### 신규 토큰 (`tokens_patch.json`)
1 개만 신규. 나머지는 기존 토큰 alias로 충분:

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-dj-nowplaying-bg` | `linear-gradient(135deg, #e8f3ff 0%, #f2f9ff 100%)` | Now-Playing 섹션 배경 강조 |

### Alias (새 토큰 아님, CSS 변수로만 명명)
- pending status pill: `background: rgba(0,0,0,0.05)` + `color: var(--color-text-muted)` (인라인)
- played status pill: `background: transparent` + `color: var(--color-text-faint)` (인라인)

## 4. 컴포넌트 목록

### 신규
- `src/components/DJBoard.tsx` — 보드 셸, SSE 구독, 상태 보유
- `src/components/dj/DJNowPlayingHeader.tsx` — 최상단 Now-Playing 카드
- `src/components/dj/DJQueueList.tsx` — `<ul>` + 드래그 재정렬 wrapper
- `src/components/dj/DJQueueItem.tsx` — `<li>` + 썸/info/status/액션
- `src/components/dj/DJSubmitForm.tsx` — 곡 신청 모달
- `src/components/dj/DJEmptyState.tsx` — empty 상태 중앙 뷰
- `src/components/classroom/ClassroomDJRolePanel.tsx` — 역할 할당 패널

### 기존 재사용
- `ContextMenu` — DJ 액션 메뉴
- `Modal` 또는 기존 모달 패턴 — 신청 모달 래퍼
- `CardAuthorFooter` — 제출자 attribution (쓰지 않을 수도 있음, DJQueueItem 내 meta 줄로 대체)

### 기존 수정
- `src/components/CreateBoardModal.tsx` — layouts에 dj-queue 추가
- `src/app/board/[id]/page.tsx` — renderBoard switch에 case 추가
- `src/app/classroom/[id]/page.tsx` — 교사 뷰에 `<ClassroomDJRolePanel>` 삽입
