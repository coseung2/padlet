# Design Brief — assignment-board

- **task_id**: `2026-04-14-assignment-board-impl`
- 입력: `phase2/scope_decision.md`, `phase3/design_doc.md`, `phase3/architecture.md`, `docs/design-system.md`
- 사용자 결정(2026-04-15): ①모달 네비 = 기존 card-modal prev/next 재사용, ②반려 인터랙션 = 모달 내 inline 확장 + 학생 재진입 배너는 guide 상단, ③미제출 slot = 회색 placeholder + 번호만, ④slotNumber snapshot 툴팁 = v2 이월, ⑤접근성 = 본 문서 §4 제안안 승인.

---

## 1. 화면/상태 목록

### 1.1 `/board/[id]` — 교사(owner) 격자 뷰

| 상태 | 트리거 | 렌더 | 행동 |
|---|---|---|---|
| empty | `classroomId` 유효 + slot 0 (로스터 empty) | 격자 영역에 "학급에 학생이 없습니다. [로스터 동기화]" CTA | 로스터 동기화 버튼 → `POST /api/boards/[id]/roster-sync` |
| loading | 최초 SSR 후 클라이언트 hydrate 대기 | `<AssignmentGridView>` skeleton: 회색 pill 30개 고정 배치 | 입력 차단 |
| ready | slot N개(≤30) 조회 완료 | 상단 guide 패널 + 5×6 격자(slot 카드: 번호/이름/썸네일 or placeholder/상태 뱃지) | slot 클릭 → 풀스크린 모달 오픈 |
| error | `GET /api/boards/[id]/assignment-slots` 실패 | 격자 자리에 "불러오기 실패 [다시 시도]" 배너 | 재시도 버튼 |

### 1.2 `/board/[id]` — 풀스크린 모달 (교사)

| 상태 | 트리거 | 렌더 | 행동 |
|---|---|---|---|
| viewing | slot 클릭 (첫 오픈) | 모달 opens → 서버 `viewedAt` stamp → 학생 이름/번호, 제출물 미디어, guide, 메타 | prev/next, 반려, 확인됨, ESC 닫기 |
| returning (inline) | "반려" 버튼 클릭 | 모달 하단 푸터가 `returnReason` textarea로 확장 (1~200자 카운터, 제출 버튼 비활성 until 1자+) | 제출 → `submissionStatus=returned` / 취소 → 푸터 원복 |
| reviewed | "확인됨" 버튼 클릭 | 상태 뱃지가 "확인됨"(green)으로 전환 + toast | 자동 닫힘 없음(교사가 수동 ESC 또는 다음 slot) |
| error | PATCH/POST 실패 | 푸터에 인라인 에러 메시지 + 낙관 상태 롤백 | 재시도 or 닫기 |

### 1.3 `/board/[id]` — 학생 뷰

| 상태 | 트리거 | 렌더 | 행동 |
|---|---|---|---|
| empty | 본인 slot이 없는 예외(데이터 이상) | "할당된 과제가 없습니다" 메시지 | 없음 |
| assigned (미제출) | 초기 진입 | 상단 guide + 제출 카드(빈 미디어 슬롯 + 업로드 CTA) | 업로드/텍스트 입력 → `POST submission` |
| returned | `submissionStatus=returned` + `returnReason` | **guide 상단에 빨간 배너 `.assign-return-banner`**(아이콘 + "반려 사유: {returnReason}") → 그 아래 guide → 재제출 카드 | 내용 수정 → 재제출 |
| submitted | 제출 완료 | 제출물 미리보기 + "제출 완료" 뱃지 + (편집 가능 조건 충족 시) 편집 버튼 | 편집 → overwrite submission |
| disabled | `gradingStatus∈{graded,released}` 또는 late 불허 | 편집 버튼 `aria-disabled="true"` + 안내 툴팁 | 읽기 전용 |

### 1.4 `/parent/child/[id]/assignment` — 학부모 뷰

| 상태 | 렌더 | 행동 |
|---|---|---|
| empty | "배정된 과제가 없습니다" | 없음 |
| ready | 자녀 본인 slot 1개 read-only 카드(상태 뱃지 + 제출물 썸네일 탭으로 확대) | 확대 lightbox만 |

### 1.5 Matrix 뷰 (`?view=matrix`, owner+desktop)

- 데스크탑 owner 전용. 태블릿 접근 시 default grid로 redirect, 학생/학부모 403.
- empty/loading/ready/error 상태는 1.1과 동일, 레이아웃만 행=학생 / 열=과제(단, v1은 단일 보드이므로 1열, v2 확장지점).

---

## 2. 정보 계층

### 2.1 격자 뷰 (교사)
1. **slot 번호 + 학생 이름** (Micro 11px + Body 15px) — 자리 기억 1순위
2. **제출 상태 색/뱃지** (썸네일 프레임 테두리 1px + 우상단 pill) — bulk scan 2순위
3. **썸네일 160×120** — 제출 내용 판별 3순위; 미제출은 회색 placeholder(번호만, `var(--color-surface-alt)`)
- 시선: 좌상단(slot 1, 1번) → 우하단(slot 30, 30번), Z 패턴.

### 2.2 모달 (교사)
1. 제출물 미디어 (중앙 70% 영역)
2. 학생 식별 + 상태 뱃지 + 메타(제출시각/반려이력) — 상단 바
3. 액션 푸터 (반려 / 확인됨 / prev / next) — 하단 고정

### 2.3 학생 뷰
1. 반려 배너(존재 시) — **guide 바로 위**, returned 주의 환기 최우선
2. guide 텍스트 — 과제 내용 이해
3. 제출 카드 — 업로드/편집

---

## 3. 인터랙션 명세

### 3.1 격자 → 모달
- slot 클릭/Enter → 모달 open; 첫 오픈 시 서버 `PATCH … {action:"view"}` 자동 호출로 `viewedAt` stamp (AC-6).
- 오픈 애니메이션: 기존 card-modal과 동일 fade+scale 120ms.

### 3.2 Prev/Next 네비 (기존 card-modal 재사용)
- 키보드 `←`/`→` 또는 모달 좌우 엣지 버튼 → 현재 slot의 `slotNumber` 기준 ±1 이동(1↔30 끝단은 비활성).
- 이동 시에도 새 slot의 `viewedAt` auto stamp.
- 이동 애니메이션: 기존 feat/modal-nav 패턴의 slide+crossfade 재사용 (추가 구현 없음).

### 3.3 반려 inline 확장
- "반려" 버튼 클릭 → 푸터가 `max-height: 0 → 160px` 180ms ease-out 확장, textarea autofocus.
- 카운터 "0 / 200" 실시간 갱신; 200자 초과 입력 차단.
- "반려하기" 버튼 `disabled` until length ≥ 1.
- 취소 → 푸터 축소, 입력값 폐기.
- 제출 성공 → optimistic state 반영 + toast "반려 사유가 전달되었습니다" + 모달 내 상태 뱃지 변경. 모달은 닫지 않음 (교사가 다음 slot으로 이동하기 위함).

### 3.4 학생 재제출
- 반려 배너 내 "재제출하기" 버튼 클릭 → 제출 카드 포커스 이동(스크롤) + 편집 모드 진입.
- 재제출 성공 시 배너는 숨김 (status: `returned → submitted`).

### 3.5 마이크로
- slot hover: border `--color-border → --color-border-hover`, 썸네일 0.98 scale 80ms.
- 반려 slot 뱃지 "!": 150ms pulse 2회 (첫 진입 시만, `prefers-reduced-motion` 존중).
- 모달 close: ESC 또는 배경 클릭 또는 X 버튼. 닫힐 때 격자 포커스는 방금 열었던 slot로 복귀.

---

## 4. 접근성 요구 (승인안)

1. **키보드 전용 흐름**: Tab으로 격자 진입 → 방향키(`↑↓←→`)로 slot 포커스 이동(격자 2D 내비) → Enter/Space로 모달 오픈 → 모달 내 Tab 트랩 → `←/→`로 prev/next, `R` 반려, `Shift+R` 확인됨, `ESC` 닫기 → 닫힌 후 직전 slot에 포커스 복귀.
2. **스크린리더 라벨**: slot 카드 `aria-label="{번호}번 {이름}, 상태: {제출/미제출/반려/확인됨}, {제출시각 or 미제출}"`. 반려 배너 `role="alert"` + 사유 읽기. 모달 `role="dialog"` + `aria-labelledby="{학생이름}"`.
3. **명도 대비 / 포커스 가시성**: 상태 뱃지 텍스트 대비 ≥ 4.5:1 (Submitted `#1565c0` on `--color-accent-tinted-bg`, Reviewed `#2e7d32` on 연두 `#e8f5e9` — 신규 토큰 필요 §5, Returned `#c62828` on `#ffebee`). 포커스 링은 기존 `--color-accent-tinted-text` 2px outline 재사용. `prefers-reduced-motion` 시 pulse/slide 애니메이션 비활성.

---

## 5. 디자인 시스템 확장 여부

### 5.1 기존 토큰으로 커버되는 것
- 모든 기본 배경/텍스트/보더 → `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border*`
- 반려 색상 → `--color-danger` / `--color-plant-stalled` (#c62828) 재사용
- 액센트(CTA, 제출 뱃지 배경) → `--color-accent*`
- 라디우스 → `--radius-card`(모달/카드), `--radius-pill`(뱃지), `--radius-btn`(버튼)
- 타이포 → Display(보드 제목)/Title(모달)/Subtitle(카드)/Body/Label/Micro 기존 8단계로 충분

### 5.2 신규 토큰 (필요 — phase5 designer가 추가)
| 토큰 | 제안 값 | 용도 |
|---|---|---|
| `--color-status-submitted-bg` | `#f2f9ff` | 제출 완료 뱃지 배경 (accent-tinted alias — 확인만) |
| `--color-status-submitted-text` | `#1565c0` | 제출 완료 뱃지 텍스트 (시맨틱) |
| `--color-status-reviewed-bg` | `#e8f5e9` | 확인됨 뱃지 배경 (신규) |
| `--color-status-reviewed-text` | `#2e7d32` | 확인됨 뱃지 텍스트 (시맨틱) |
| `--color-status-returned-bg` | `#ffebee` | 반려 뱃지/배너 배경 (신규) |
| `--color-slot-placeholder` | `var(--color-surface-alt)` | 미제출 slot 썸네일 자리 회색 placeholder |

### 5.3 신규 컴포넌트 (phase5 designer)
- `<AssignmentGridView>` — 5×6 격자 컨테이너(데스크탑/태블릿 반응형: `grid-template-columns: repeat(5, minmax(0,1fr))`, gap 12px)
- `<AssignmentSlotCard>` — 번호/이름/썸네일or placeholder/상태 뱃지 표시
- `<AssignmentFullscreenModal>` — 미디어 영역 + 메타 바 + 액션 푸터(+inline reason 확장); card-modal의 prev/next/fullscreen primitive 재사용
- `<ReturnReasonInlineEditor>` — 푸터 확장 textarea + 카운터
- `<ReturnReasonBanner>` — `role="alert"`, guide 상단 고정, dismiss 없음 (재제출 시 자동 소멸)
- `<AssignmentStudentView>` — 학생 전용 single-slot 화면
- `<ParentAssignmentView>` — read-only 단일 slot

### 5.4 확장 불필요
- 레이아웃 grid: Tailwind 유틸 + 기존 토큰으로 충분
- 버튼: 기존 primary/secondary/destructive variant (`--color-danger` 활용) 그대로 사용
- 모달 섀도/백드롭: 기존 card-modal CSS 재사용

---

## 6. v2 이월 (본 phase 범위 밖)

- slotNumber snapshot 툴팁("번호가 현재와 다를 수 있음") — 사용자 결정 ④에 따라 v1 미포함, v2 research 때 재검토.
- Matrix 뷰 다중 보드 확장(현재 1열 placeholder).

---

## 7. Phase 4 판정

**PASS** — 5개 섹션(화면/정보계층/인터랙션/접근성 3개/디자인 시스템 확장) 모두 충족. 상태 empty/loading/ready/error/success 누락 0. 접근성 3개 명시. 신규 토큰 6개 + 신규 컴포넌트 7개 목록화. 사용자 결정 5건 모두 반영. phase5 designer로 핸드오프.
