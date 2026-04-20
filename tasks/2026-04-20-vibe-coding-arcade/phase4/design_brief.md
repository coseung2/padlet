# Design Brief — vibe-coding-arcade

> **입력**: `phase2/scope_decision.md` + `phase3/design_doc.md` + `docs/design-system.md`
> **출력 원칙**: 텍스트 중심 — 실제 비주얼은 phase5. 모든 화면 상태 빠짐없이.

---

## 1. 화면/상태 목록

### S1. 학생 카탈로그 (`/board/[id]/vibe-arcade`)

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty (작품 0) | 일러스트 placeholder + "첫 작품을 만들어 보세요" CTA + 쿼터 잔량 | `+ 새로 만들기` 버튼 |
| loading | 6개 카드 skeleton (shimmer) + 탭 skeleton | — |
| ready | 카드 그리드(썸네일+제목+작가+별점+플레이수) · 탭 5종 `신작/인기/친구 추천/🎯 평가 미작성/태그` · `+ 새로 만들기` FAB | 카드 탭→PlayModal · FAB→Studio · 탭 전환 · 태그 필터 |
| error | "불러오기 실패" + 재시도 버튼 | 재시도 |
| gate-off | 🔒 "교사가 아직 이 공간을 열지 않았어요" | — |

### S2. 플레이 모달 (전체화면)

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| loading | 제목 헤더 + iframe 영역 skeleton + "안전하게 준비 중…" | 닫기 |
| ready | 헤더(제목·작가·⭐·신고) · cross-origin iframe · 하단 "플레이 완료 후 리뷰 쓰기" CTA | 신고 · 완료 · 리뷰 · 닫기 |
| play-running | iframe 전체 포커스 · 헤더 반투명 auto-hide | Esc/닫기 |
| completed | 리뷰 패널 자동 슬라이드업 + 별점 · 댓글 · 제출 | 별점/댓글 제출 |
| error (iframe 로드 실패) | "작품을 불러올 수 없어요 (CSP/DNS 이슈)" + 교사 알림 안내 | 닫기 |
| flagged-hidden | "이 작품은 현재 검토 중입니다" | 닫기 |

### S3. 바이브 코딩 스튜디오 (`/board/[id]/vibe-arcade/new`)

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| initial | 좌: 채팅 welcome + 예시 프롬프트 3개 / 우: 빈 미리보기 "여기에 작품이 나타나요" | 첫 메시지 입력 |
| streaming | 좌: Sonnet 증분 응답 + 타이핑 indicator · 토큰 카운터(남은량) / 우: srcdoc 실시간 갱신 | 중단 · 토큰 확인 |
| ready-to-save | 하단 "저장하기" 활성 + 제목·설명·태그 입력 필드 | 저장 · 추가 편집 |
| saving | "저장 중…" + progress · Playwright 썸네일 생성 대기 | — |
| saved | "게시됨! 교사 승인을 기다리는 중" + 카탈로그로 | 카탈로그 이동 |
| refusal | "이 요청은 학습 공간에 맞지 않아요. 다른 주제로 다시 시도해 보세요" + refusalCount 표시 | 다시 입력 |
| quota-exhausted | "오늘치 소진, 내일 다시 시도" 모달 (Haiku 다운그레이드 금지 규칙) | 확인 |
| api-error | "잠시 문제가 있어요, 교사에게 알려주세요" + Slack 경보 자동 발생 | 확인 |
| rejected-returning | 상단 배너 "선생님께서 이렇게 말씀하셨어요: {moderationNote}" + 수정 플로우 | 재제출 (version+=1) |

### S4. 리뷰 패널 (플레이 모달 내부 슬라이드업)

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty (내 리뷰 없음) | 별점 5개 (hollow) + 댓글 placeholder + 제출 | 별점 선택 · 댓글 입력 · 제출 |
| existing (내 리뷰 있음) | 기존 별점·댓글 read-only + "이미 리뷰했어요" | 닫기 |
| peer-list | 다른 학생 리뷰 최신 5개 (named: 실명·번호) · 신고 버튼 | 신고 (1회/리뷰) |
| submitting | 버튼 disabled + spinner | — |
| success | ✅ "리뷰 감사합니다" · 2초 후 닫기 | — |
| error | "다시 시도해 주세요" | 재시도 |

### S5. 교사 모더레이션 대시보드 (`/board/[id]/vibe-arcade/moderation`)

#### S5.1 탭1 — 승인 큐

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty | "새 제출이 없습니다 ✨" | — |
| ready | 큐 리스트(학생명·시간·thumb) · 선택 시 우측 상세(HTML 미리보기 iframe + 프롬프트 로그 + A/R 버튼) | A=승인 · R=반려(노트 필수) · 화살표 키 이동 |
| auto-filtered (상단) | "🤖 자동 1차 필터 auto-rejected N건" 접기/펼치기 | 펼쳐 확인 · 복구 |
| bulk-mode | 복수 선택 체크박스 + 일괄 A/R | 일괄 처리 |

#### S5.2 탭2 — 쿼터 현황

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| ready | 학급 풀 가로 막대 게이지(잔량/당일 소진) · 7일 추이 꺾은선 · 학생별 사용량 내림차순 리스트 · 학생 일일 한도 조정 슬라이더 | 슬라이더 조정 · 긴급 정지(풀=0) |
| pool-exhausted | 상단 경고 배너 빨강 "학급 풀 소진 — 신규 세션 차단됨" | 한도 상향 |
| emergency-stop | "일시 정지 중" 배너 + 해제 버튼 | 해제 |

#### S5.3 탭3 — 프롬프트 로그 감사

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty | "필터 조건에 맞는 로그 없음" | 필터 재설정 |
| ready | 필터(학생·기간·금칙어 매치) · 세션 리스트(학생별 그룹핑) · 선택 시 대화 전체 · CSV 다운로드 | CSV 다운로드 · 학생 제한 |
| matched | 금칙어 매치 하이라이트 노랑 highlight | 상세 확인 |

#### S5.4 탭4 — 설정

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| ready | 6필드 폼 (moderationPolicy 라디오 · perStudent 숫자 · classroom 숫자 · crossClassroomVisible 토글 · reviewAuthorDisplay 라디오 · reviewRatingSystem 라디오) + 긴급 행동 "학급 아케이드 일시 정지" | 저장 · 정지 |
| saved | "설정이 저장되었습니다" · 2초 후 해제 | — |
| gate-toggle | 상단 `FeatureFlag.vibeArcadeGate` 토글(Board-level on/off) — 교사 한정 | on/off |

### S6. 쿼터 소진 모달 (공용)

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| student-cap | "오늘치 소진, 내일 다시 시도" + 남은 시간 (자정까지) | 확인 |
| classroom-pool | "학급 공용 쿼터가 소진됐어요 · 선생님께 문의" + 교사 연락처(없으면 생략) | 확인 |

### S7. 반려 복구 알림 / 수정 플로우

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| notification-badge | 카탈로그 상단 토스트 "선생님이 작품에 의견을 남겼어요" | 보러가기 |
| edit-mode | S3 Studio 재진입 + 이전 htmlContent 로드 + 배너에 moderationNote | 재편집 · 재제출 |

---

## 2. 정보 계층

### 2.1 학생 카탈로그 (S1)

| 우선순위 | 정보 |
|---|---|
| 1 | 카드 썸네일 + 제목 (시각 우선) |
| 2 | 별점 평균 + 플레이수 (사회적 증거) |
| 3 | 작가명 + 태그 (부가) |

**시선 흐름**: 상단 탭(5종) → FAB(`+ 새로 만들기`) 우하단 지속 가시 → 그리드 Z자 → 리뷰 미작성 배지(🎯) 강조

### 2.2 플레이 모달 (S2)

| 우선순위 | 정보 |
|---|---|
| 1 | iframe 콘텐츠 (플레이 본체) |
| 2 | 헤더 제목 · 작가 (맥락) |
| 3 | 신고 · 별점 · 닫기 (보조 액션) |

**시선 흐름**: iframe 자동 포커스 → 완료 시 하단 리뷰 패널 슬라이드업 → 헤더는 auto-hide

### 2.3 Studio (S3)

| 우선순위 | 정보 |
|---|---|
| 1 | 우측 미리보기 (결과 즉시 확인 = 바이브 코딩 본질) |
| 2 | 좌측 채팅 입력 (행동 유발) |
| 3 | 토큰 카운터 + 저장 버튼 (맥락) |

**시선 흐름**: 좌 입력 → 우 미리보기 → 좌 대화 증분 → 하단 저장 CTA. 탭 S6 Lite 세로 모드에서는 위/아래 스택 전환(세로 2분할)

### 2.4 교사 대시보드 (S5)

| 우선순위 | 정보 |
|---|---|
| 1 | 승인 큐 건수 뱃지 (긴급성) |
| 2 | 쿼터 잔량 게이지 (운영성) |
| 3 | 탭 간 이동 (감사) |

**시선 흐름**: 좌 탭 목록 → 우 상세. 단축키 A/R은 상시 캡션 고정

---

## 3. 인터랙션 명세

### 3.1 카탈로그

- **카드 탭(mobile) / 클릭(desktop)** → 플레이 모달 슬라이드업 (Framer motion 등 기존 패턴)
- **카드 long-press** → 작가 정보 + 공유 링크 복사 시트 (mobile)
- **FAB 탭** → Studio 라우트 push (router.push)
- **탭 전환** → URL query `?tab=popular` 변경 + 낙관적 refetch
- **IntersectionObserver** — 카드 뷰포트 진입 시 썸네일 lazy load (AC-N4)

### 3.2 플레이 모달

- **ESC or 배경 클릭** → 모달 닫기 → iframe `src="about:blank"` → LRU evict (AC-N3)
- **postMessage `{type:"completed"}`** → 리뷰 패널 슬라이드업 (0.3s)
- **postMessage origin 검증 실패** → 메시지 silently drop (AC-N9)
- **5분 비활성** → iframe 자동 언마운트 + "다시 플레이" 버튼 (AC-N6)
- **신고 버튼** → 확인 다이얼로그 → `POST /api/vibe/projects/:id/flag` (+1 관리자 리뷰)

### 3.3 Studio

- **Enter / 전송 버튼** → SSE 시작, 우측 srcdoc 점진 업데이트 (throttle 100ms)
- **Shift+Enter** → 줄바꿈
- **토큰 카운터** → 남은량 5K 이하 시 노란색, 1K 이하 빨강, 0 시 모달
- **저장 버튼** → 제목 ≤40자 · 설명 ≤500자 · 태그 1개 필수. 서버 응답 후 카탈로그 자동 이동
- **refusal 수신** → 채팅에 시스템 메시지 삽입(회색 박스) + 입력창 placeholder "다른 주제로 다시…"

### 3.4 리뷰 패널

- **별점 hover** → 라이브 preview (★ 채우기)
- **별점 선택** → 즉시 색 확정 + 댓글 필드 포커스 이동
- **제출 버튼** → 2초 disabled (중복 방지) + unique violation 시 409 우아한 안내
- **신고 버튼** → 인라인 확인 "정말 신고하시겠어요?" → 1회/리뷰

### 3.5 교사 대시보드 — 키보드 전용 (AC-G4 R-7 완화)

- **A** → 선택된 큐 승인
- **R** → 반려 모달 (노트 필수 입력, 미입력 시 불가)
- **↑/↓** → 큐 항목 이동
- **Tab** → 탭1~4 순환
- **/ 또는 Ctrl+F** → 필터 포커스
- **Escape** → 상세 패널 닫기

### 3.6 토스트·스낵바

- 성공: `--color-status-reviewed-bg/text` (재활용)
- 경고: `--color-status-returned-bg/text` (반려 시)
- 정보: `--color-accent-tinted-bg/text` (승인 배지)

---

## 4. 접근성 요구

### 4.1 키보드 전용 동작

- 카탈로그 — Tab 순회 · Enter로 카드 진입 · FAB에 단축키 `n`(new)
- 플레이 모달 — ESC로 닫기 · Tab trap · 리뷰 폼 Tab 순서 명확
- Studio — 단축키 `Ctrl+Enter` 전송 · `Ctrl+S` 저장
- 교사 대시보드 — A/R/화살표/Tab/Escape 전역 단축키

### 4.2 스크린리더 라벨 (aria-\*)

- 별점 — `role="radiogroup"` + `aria-label="별점 1~5점"` + 각 별 `aria-label="{n}점"`
- 쿼터 게이지 — `role="meter"` + `aria-valuenow/min/max` + `aria-label="학급 풀 잔량"`
- cross-origin iframe — `title="학생 작품: {title}"` 필수
- 카드 썸네일 — `alt="{title} 썸네일"` (alt 공란 금지)
- 탭 — `role="tablist"` + `aria-selected`

### 4.3 명도 대비 / 포커스 가시성

- 모든 텍스트 WCAG AA 이상 (시맨틱 상태색 포함, design-system §1.62에 이미 검증)
- 포커스 링 — `outline: 2px solid var(--color-accent-tinted-text); outline-offset: 2px` 전역 강제
- 초중등 대상 — 터치 타겟 ≥ 44×44px (탭 S6 Lite 10인치 기준)
- `prefers-reduced-motion` 존중 — 플레이 모달 transition 무효화 대체

### 4.4 특수 요구 (7개)

- 별점 선택 후 screen reader announce ("3점 선택됨")
- Sonnet 스트리밍 중 `aria-live="polite"` 영역에 증분 테스트 — 과도한 낭독 방지 위해 10자 이상 쌓인 후 announce
- refusal 수신 시 `aria-live="assertive"` (긴급)
- 쿼터 소진 모달 — focus trap + 확인 버튼 기본 focus
- 교사 대시보드 단축키 사용 시 snackbar announce ("A 승인됨 1건")
- 반려 노트 입력 — 빈 submit 방지 + aria 필수 지시 ("반려 사유를 입력해 주세요")
- iframe title 필수 (WCAG 4.1.2)

---

## 5. 디자인 시스템 확장 여부

### 5.1 기존 토큰으로 가능

- 카탈로그 카드 — `--radius-card` · `--shadow-card/-hover` · `--border-card`
- 승인 배지 — `--color-status-reviewed-bg/text` 재사용
- 반려 배너 — `--color-status-returned-bg/text` 재사용
- 댓글/입력 — 기존 타이포 Body 14-15px
- 모달 — 기존 SidePanel/Modal 패턴 재활용 가능 여부 phase5에서 판단

### 5.2 신규 토큰 (7)

| 토큰 | 예상 값 | 용도 |
|---|---|---|
| `--color-vibe-rating` | `#f5a623` (amber) | 별점 채움 색 |
| `--color-vibe-rating-empty` | `#e5e5e5` | 빈 별 |
| `--color-vibe-quota-ok` | `#27a35f` (plant-active alias 검토) | 쿼터 정상 게이지 |
| `--color-vibe-quota-warn` | `#f5a623` | 쿼터 20% 이하 |
| `--color-vibe-quota-danger` | `#c62828` (danger alias) | 쿼터 5% 이하 |
| `--color-vibe-sandbox-bg` | `#1a1a1a` | 플레이 모달 배경(어두운 몰입) |
| `--color-vibe-chat-user-bg` | `#f2f9ff` (accent-tinted alias) | 채팅 사용자 메시지 배경 |

### 5.3 신규 컴포넌트 (9)

- `StarRating` (readonly/editable, size sm/md/lg, aria 완비)
- `QuotaGauge` (horizontal bar, 3단 색상, role=meter)
- `TokenCountPill` (Studio 헤더 "23,400 / 45,000")
- `ModerationStatusBadge` (pending_review / approved / rejected / flagged / hidden)
- `SandboxIframe` (wrapper — CSP 검증 · LRU 관리 · about:blank 언마운트)
- `StreamingChatBubble` (Sonnet 증분 append 용, DOM 직접 조작)
- `TagChip` (고정 5종 — 게임·퀴즈·시뮬·아트·기타, 단일 선택)
- `ApprovalQueueCard` (학생·시간·thumb·A/R 단축키 힌트)
- `EmergencyStopButton` (빨강 · 2단 확인 · 학급명 재입력)

### 5.4 재사용 가능 컴포넌트

- `SidePanel.tsx` — 교사 대시보드 설정 탭4
- `BoardSettingsPanel.tsx` 패턴 — 탭 네비게이션 스타일 승계
- `ContextMenu` — 카드 long-press 메뉴
- 기존 Modal 시스템 — 쿼터 소진 모달

---

## 6. 반응형 (탭 S6 Lite 기준 — §2c 성능 예산 정합)

| 브레이크 | 카탈로그 | Studio | 플레이 모달 |
|---|---|---|---|
| Desktop (>1080) | 4-5열 | 좌우 50/50 | 16:9 centered |
| Tablet (≤1080) | 3열 | 좌우 40/60 | 전체화면 |
| Mobile-L (≤768) | 2열 | 상하 스택 (채팅 위 / 미리보기 아래) | 전체화면 + 헤더 축소 |
| Mobile-S (≤560) | 1열 | 탭 전환(채팅 ↔ 미리보기) | 전체화면 |

---

## 7. 자동 검증 게이트

- ✅ 화면 7종 × 상태 총 35개 나열 (≥ 1 요구)
- ✅ 접근성 요구 6개 (≥ 3 요구)
- ✅ 디자인 시스템 확장 판단 명시 (신규 토큰 7·컴포넌트 9)
- ✅ 반응형 브레이크포인트 4개
- ✅ 실제 목업 첨부 없음 (phase5의 일)

→ phase5 designer 진입 가능.
