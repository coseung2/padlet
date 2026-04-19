# Design Brief — dj-board-queue

## 1. 화면/상태 목록

### 화면 A — DJ 큐 보드 (`/board/:id`, layout=dj-queue)

| 상태 | 표시 정보 | 행동 |
|---|---|---|
| **empty (비어있음)** | 중앙 "🎧 아직 신청 곡이 없어요", DJ/교사에게 "첫 곡을 추가해보세요" CTA | DJ/교사 → 곡 추가, 학생 → 곡 신청 |
| **loading (초기)** | 빈 리스트 자리에 skeleton 3행 | — |
| **ready (곡 있음)** | Now-Playing (상단) + 큐 리스트 (아래) + 하단 "곡 신청" 버튼 | 드래그 재정렬, 승인/거부, 삭제, 다음으로, 곡 신청 |
| **ready — 비-DJ 뷰** | 동일한 리스트지만 status pill과 제출자만 보임. 드래그핸들/승인버튼 숨김 | 곡 신청, 본인 pending 곡 취소 |
| **error (제출 실패)** | 모달 하단 에러 메시지 빨간 텍스트 | 다시 시도 |
| **success (제출 성공)** | 모달 닫힘 + 큐 리스트 끝에 새 곡 optimistic 추가 | — |
| **rejected 표시** | 거부된 곡은 기본 필터에서 숨김. "거부된 곡 보기" 토글 (DJ/교사만) | 필터 토글 |

### 화면 B — 곡 신청 모달 (DJSubmitForm)

| 상태 | 표시 정보 | 행동 |
|---|---|---|
| **initial** | YouTube URL 입력란, "신청" 버튼 (비활성), 취소 | URL 붙여넣기 |
| **validating** | URL 아래 "미리보기 확인 중…" + 스피너 | — |
| **preview-ready** | 썸네일 + 제목 + 채널명 미리보기. 신청 버튼 활성 | 신청 |
| **invalid-url** | "YouTube 링크만 신청할 수 있어요" 빨간 메시지 | 다시 입력 |
| **fetch-failed** | "재생할 수 없는 영상이에요 (비공개/삭제)" | 다시 입력 |
| **submitting** | 신청 버튼 스피너 + 비활성 | — |

### 화면 C — DJ 역할 할당 패널 (`/classroom/:id`)

| 상태 | 표시 정보 | 행동 |
|---|---|---|
| **empty** | "아직 DJ로 지정된 학생이 없어요" + 학생 목록 | 학생 옆 "DJ 지정" 버튼 |
| **ready** | 현재 DJ 학생 명단 (상단 칩) + 전체 학생 목록 (하단, DJ 여부 토글) | 토글 → assign / revoke |
| **no-classroom** | 학급 정보 없음 메시지 | — |
| **loading** | 학생 목록 skeleton | — |

---

## 2. 정보 계층

### DJ 큐 보드 (화면 A)
1. **Now-Playing 카드 (최우선)** — 현재 재생 중 곡. 썸네일 120×68, 제목 16px, 채널 13px muted, `--color-accent-tinted-bg` 배경.
2. **Up-Next 리스트** — 각 행: 드래그 손잡이 / 썸네일 / 제목+채널+제출자 / status pill / 액션 메뉴.
3. **시선 흐름**: Now-Playing(상단 고정) → Up-Next 1번 → 하단 "곡 신청" CTA.

### DJ 역할 할당 패널 (화면 C)
1. **현재 DJ 칩 (최우선)** — "🎧 DJ: 가온 · 민준" 같은 형식으로 상단 sticky 섹션.
2. **학생 목록** — 번호순. 각 행에 토글 스위치.
3. **시선 흐름**: 현재 DJ 목록(확인) → 학생 목록(수정).

---

## 3. 인터랙션 명세

### A. 곡 신청 플로우 (학생)
- CTA 클릭 → 모달 열림 (`opacity` 200ms, `transform: translateY(8px→0)`)
- URL paste → 자동 validating (debounce 500ms)
- preview 로드 성공 시 썸네일이 fade-in (200ms)
- 신청 성공 시 모달 close + 큐 리스트에 optimistic insert (slide-in 250ms from bottom)

### B. 순서 변경 (DJ/교사)
- 드래그 핸들 길게 누르기 → row 반투명 60%, cursor `grabbing`
- drag over 중 목적지 슬롯 높이 공간 + `--color-accent-tinted-bg` 배경
- drop → 즉시 제자리 착지 (no animation), 서버 PATCH는 background
- 실패 시 복원 + 토스트 "순서 변경 실패"

### C. 승인/거부 (DJ/교사)
- overflow 메뉴(`⋯`) 클릭 → ContextMenu 오픈
- "승인" 선택 → status pill이 회색 "대기" → 초록 "승인됨" 으로 dissolve (150ms crossfade)
- "거부" → 행이 collapse (max-height 200ms) 후 리스트에서 제거

### D. "다음으로 이동" (DJ/교사)
- Now-Playing 영역 우측 상단 `⏭` 버튼
- 클릭 → 현재 곡 `queueStatus="played"` + 큐 최상단 곡 → Now-Playing 자리로 slide-up (300ms)

### E. 역할 할당 토글 (교사)
- 학생 행의 스위치 클릭 → optimistic ON
- 실패 시 500ms 후 roll back + 토스트

---

## 4. 접근성 요구

1. **명도 대비**: status pill은 `--color-status-*` 토큰 그대로 재사용 (WCAG AA 검증됨). 신규 "pending" 배경은 `rgba(0,0,0,0.05)` + text `#615d59` — 4.5:1 이상.
2. **포커스 가시성**: 모든 버튼/링크 `:focus-visible`에 `outline: 2px solid var(--color-accent-tinted-text)`.
3. **스크린리더 라벨**:
   - 드래그 핸들: `aria-label="{곡 제목} 순서 변경"` + `role="button"`
   - 재생 상태 pill: `aria-label="대기 중" | "승인됨" | "재생됨" | "거부됨"`
   - Now-Playing 영역: `role="status"` + `aria-live="polite"` (현재 곡 변경 시 스크린리더 안내)
4. **키보드**: 드래그 재정렬은 MVP 제외지만 "다음으로/승인/거부/삭제" 버튼은 전부 탭 순서에 포함 + 엔터/스페이스 활성화.
5. **prefers-reduced-motion**: 모든 transition/transform은 `@media (prefers-reduced-motion: reduce)` 분기에서 0ms.

---

## 5. 디자인 시스템 확장 여부

### 기존 토큰으로 커버 가능
- 레이아웃 / 카드 / 보더 / 텍스트 — `--color-bg/surface/text/border/accent` 전부 기존 재사용
- status pill — `--color-status-submitted-*` (pending = 기존 submitted 스타일 재활용), `--color-status-reviewed-*` (approved), `--color-status-returned-*` (rejected)

### 신규 토큰 (최소)

| 신규 토큰 | 용도 | 값 |
|---|---|---|
| `--color-dj-nowplaying-bg` | Now-Playing 강조 배경 | `linear-gradient(135deg, #e8f3ff 0%, #f2f9ff 100%)` (accent-tinted 두 단계 조합) |
| `--color-dj-pending-text` | pending pill 텍스트 | `#615d59` (= `--color-text-muted` alias — 신규 토큰 만들 필요 있는지 phase5에서 재평가) |
| `--color-dj-played-text` | played pill (재생 완료 muted) | `#a39e98` (= `--color-text-faint` alias) |

**phase5 결정사항**: 위 3개 중 accent-tinted 토큰 조합 1개만 신규로 낼지, 모두 alias만 쓸지는 phase5 mockup 평가 후 `tokens_patch.json`에 반영.

### 신규 컴포넌트

디자인 시스템에 편입할 범용 컴포넌트는 **없음**. DJ 전용 컴포넌트 5개 + 역할 할당 패널 1개 전부 `src/components/dj/` 및 `src/components/classroom/` 에 지역 보관.

향후 범용 "역할 할당 패널"이 필요해지면 그 시점에 `src/components/shared/`로 이동 (scope out).
