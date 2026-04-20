# Design Spec — vibe-coding-arcade

> **선택된 변형**: [`mockups/v2_notion_soft.md`](mockups/v2_notion_soft.md)
> **탈락 변형**: `rejected/` 5개 (v1, v3, v4, v5, v6) — 감사 이력 보존.

---

## 1. 선택된 변형

**v2 Notion Soft (혼합안)**

### 최종 철학

> "카탈로그는 Notion, 플레이 모달은 Arcade, 대시보드는 VS Code"

- 카탈로그 S1 · Studio S3 · 리뷰 S4 · 교사 설정 S5.4 → **v2 Notion Soft** (기존 design-system 99% 재사용)
- 플레이 모달 S2 → **v2 기본 + v3의 `--color-vibe-sandbox-bg #1a1a1a` 어두운 배경 차용** (몰입)
- 교사 모더레이션 대시보드 S5.1~S5.3 → **v2 기본 + v5 좌 리스트/우 상세 레이아웃 차용** (SidePanel 패턴)
- 승인 큐 항목 리스트 → **v6 밀집 타이포 차용** (정보 밀도)

### 선정 사유 (comparison.md 요약)

1. 디자인 시스템 정합성 최고 (신규 토큰 7개로 제한)
2. 탭 S6 Lite §2c 성능 예산 최적 (gradient/네온/아바타 0)
3. 초등 친화 게임 느낌은 플레이 모달 다크 배경으로 국소 해결
4. 승인 배지·반려 배너 등 기존 시맨틱 상태색 완전 재활용

---

## 2. 화면 상태별 최종 디자인

### S1. 학생 카탈로그

#### 2.1.1 empty

- 중앙 정렬 `<EmptyState>`: 일러스트 skeleton (단색 line-art, `--color-text-faint`) + "첫 작품을 만들어 보세요" (Title 20px) + 쿼터 잔량 배지 + CTA `+ 새로 만들기`
- 배경 `--color-bg`, skeleton 컬러 `--color-text-faint`
- 상단 탭 네비게이션은 렌더(탭 전환은 가능하지만 모든 탭 empty)

#### 2.1.2 loading

- 탭 네비게이션 렌더
- 카드 skeleton 6개 (썸네일 160×120 placeholder + 3줄 rect) · shimmer animation `--color-surface-alt → --color-border`
- `prefers-reduced-motion: reduce` 시 shimmer 정적 회색

#### 2.1.3 ready

```
배경: var(--color-bg) #f6f5f4
헤더: padding 18px 32px · 타이포 Display 26px (보드 제목 재사용)
  제목: "🎮 학급 아케이드" (Title 20px/700)
  서브카피: "반 친구들이 만든 작품을 플레이해 보세요" (Body 14px, --color-text-muted)

탭 네비게이션: 수평, padding 8px 0, gap 8px, 반응형 wrap
  탭 chip: font Label 13px/600, padding 6px 12px, radius --radius-pill
  활성: bg --color-accent-tinted-bg + text --color-accent-tinted-text
  비활성: bg transparent + text --color-text-muted

그리드: display grid, grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
       gap 20px, padding 32px (desktop) / 24px (tablet) / 18px (mobile)

카드 (CatalogCard):
  bg --color-surface, border --border-card, radius --radius-card
  shadow --shadow-card → hover --shadow-card-hover + border --color-border-hover
  transition: 150ms ease

  ┌ 썸네일 img 160×120 WebP
  │   loading="lazy", IntersectionObserver, alt="{title} 썸네일"
  │   radius: 12px 12px 0 0 (카드 상단 맞춤)
  │   aspect-ratio: 4/3
  │   bg fallback: --color-surface-alt
  ├ 메타 영역 padding 12px 14px
  │   제목 (Subtitle 15px/700/-0.15px, color --color-text, 1줄 truncate)
  │   작가 (Micro 11px/600, "6-2 김철수", color --color-text-muted)
  │   하단 라인 flex gap 8px
  │     <StarRating size="sm" value={ratingAvg} readonly />
  │     <PlayCountPill>▶ 23</PlayCountPill>

FAB:
  position fixed bottom 24px right 24px
  크기 56px circular, bg --color-accent, shadow --shadow-accent
  hover: --color-accent-active + shadow --shadow-accent-hover
  아이콘 + 툴팁 "새로 만들기" (screen reader label)
  단축키 'n'
```

#### 2.1.4 error

- 상단 banner `--color-status-returned-bg/text` "불러오기 실패" + `<Button>재시도</Button>`

#### 2.1.5 gate-off

- 중앙 `<GateOffState>`: 🔒 아이콘(24px, `--color-text-faint`) + "교사가 아직 이 공간을 열지 않았어요" (Body 15px, `--color-text-muted`)

### S2. 플레이 모달

#### 2.2.1 ready

```
overlay: bg rgba(0,0,0,0.72), backdrop-filter blur(4px)
모달 container:
  position fixed inset 0 (전체화면 mobile) / max-width 1200px centered (desktop)
  bg --color-vibe-sandbox-bg #1a1a1a
  radius 0 (전체화면) / --radius-card (desktop contained)

헤더 (auto-hide after 3s idle, mouse move로 재표시):
  height 56px, padding 0 20px
  bg rgba(0,0,0,0.5), backdrop-filter blur(8px)
  border-bottom 1px solid rgba(255,255,255,0.08)
  내용: flex space-between
    좌: 🎮 제목 (Title 20px/700, color #fff) · Body "6-2 김철수 · ⭐4.2" (color rgba(255,255,255,0.7))
    우: IconButton 🚩 신고 · IconButton 리뷰 · IconButton ✕ 닫기
    버튼 color: rgba(255,255,255,0.9), hover bg rgba(255,255,255,0.1)

iframe 영역:
  flex 1, bg #000
  <iframe src="https://sandbox.aura-board.app/vibe/{projectId}?pt={playToken}"
          sandbox="allow-scripts"  (NO allow-same-origin)
          title="학생 작품: {title}"
          data-vibe-sandbox />
  LRU managed (lib/iframe-lru.ts, cap 3)

리뷰 패널 슬라이드업 (S4와 공유):
  position absolute bottom 0, height 40% (max 400px)
  bg --color-surface, border-top 1px solid --color-border
  radius --radius-card --radius-card 0 0
  transition: transform 300ms cubic-bezier(0.2, 0, 0, 1)
```

#### 2.2.2 completed

- iframe postMessage `{type:"completed"}` 수신
- 리뷰 패널 자동 슬라이드업 (0.3s)
- 헤더 auto-hide 해제

#### 2.2.3 error (iframe 로드 실패)

- iframe 영역에 dark `<ErrorState>`: "작품을 불러올 수 없어요. 선생님께 알려주세요" (color #fff)
- 3초 후 자동 모달 닫힘

#### 2.2.4 flagged-hidden

- iframe 마운트 이전에 dark `<NoticeState>`: "이 작품은 현재 검토 중입니다" (Body 15px, color rgba(255,255,255,0.7))

### S3. 바이브 코딩 스튜디오

#### 2.3.1 initial

```
상단 바: 56px, bg --color-bg-alt
  좌: 제목 "새 작품 만들기" (Title 20px/700)
  우: <TokenCountPill value={remaining} cap={perStudentDailyTokenCap} />

좌우 2분할 (desktop · tablet ≥768):
  좌 "채팅" 50% (tablet 40%), bg --color-surface, border-right --border-card
  우 "미리보기" 50% (tablet 60%), bg --color-bg-alt

세로 스택 (mobile-L ≤768):
  상 "채팅" height 50vh
  하 "미리보기" height 50vh

탭 전환 (mobile-S ≤560):
  [채팅] [미리보기] 탭 전환

채팅 패널:
  환영 메시지 (카드 형태 --color-surface-alt bg, padding 12px 14px, radius --radius-card)
    "🤖 어떤 걸 만들고 싶어?"
    예시 3개 클릭 가능 chip: "· 틱택토 게임" "· 퀴즈쇼" "· 그림판"
    chip hover: --color-accent-tinted-bg
  채팅 입력 영역: 하단 고정
    input bg --color-surface, border --border-card, radius --radius-btn
    placeholder "메시지 입력…"
    전송 버튼 (아이콘 Paper-plane + "전송") bg --color-accent

미리보기 패널:
  빈 상태: 중앙 placeholder
    아이콘 + "여기에 작품이 나타나요" (Body 15px, --color-text-muted)
  iframe srcdoc 로드됨:
    border --border-card, radius --radius-card, bg #fff
```

#### 2.3.2 streaming

- AI 말풍선 (message bubble): `--color-surface`, `--border-card`, radius `--radius-card`, padding `12px 14px`, max-width 80%
- 타이핑 indicator: 점 3개 animated (Sonnet 응답 대기 시)
- 본문 증분 append → **DOM 직접 조작**(React state 누적 금지, §2c AC-N5). `useRef` + `appendChild(textNode)`
- `aria-live="polite"` 영역에 증분 text (10자 이상 쌓인 후 announce)
- 토큰 카운터 실시간 갱신 (Anthropic stream response header 기반)

#### 2.3.3 ready-to-save

- 하단 액션 바 등장: 제목 input (40자) + 태그 select (5종 dropdown) + `<Button>저장하기</Button> primary`
- 설명 input (optional, 500자 접기/펼치기)

#### 2.3.4 saving

- 저장 버튼 disabled + spinner
- "저장 중… (썸네일 생성 중)" 캡션

#### 2.3.5 saved

- 중앙 `<SuccessToast>` 2초 표시 → router.push(`/board/{id}/vibe-arcade`)
- 토스트: ✅ "게시됨! 선생님 승인을 기다리는 중" · bg `--color-status-submitted-bg` · text `--color-status-submitted-text`

#### 2.3.6 refusal

- AI 말풍선 위치에 시스템 메시지 (회색 박스, `--color-surface-alt`, italic)
- 내용: "이 요청은 학습 공간에 맞지 않아요. 다른 주제로 다시 시도해 보세요."
- 입력창 placeholder 변경: "다른 주제로 다시…"
- refusalCount 3 이상 시 세션 종료 모달 (R-2)

#### 2.3.7 quota-exhausted (S6 공용 모달)

- 중앙 모달 420×240: 아이콘 ⏰ + Title "오늘치 소진" + Body "내일 다시 시도해 주세요 (자정까지 {n}시간)"
- 확인 버튼 1개 (accent)

#### 2.3.8 api-error

- 토스트 "잠시 문제가 있어요. 선생님께 알려주세요" + Slack 경보 자동 발생 (backend)

#### 2.3.9 rejected-returning

- 상단 배너 (sticky top, `--color-status-returned-bg`) "선생님 의견: {moderationNote}"
- 기존 htmlContent 로드 + `version` 표시 ("v2 수정 중")

### S4. 리뷰 패널

#### 2.4.1 empty

```
padding 20px 24px
제목 "플레이 잘했어? 별점을 남겨주세요" (Subtitle 15px/700)

polos: flex gap 16px align center
  <StarRating size="lg" editable onChange={setRating} />
  <input placeholder="한줄 감상 (선택)" flex 1 />
  <Button primary disabled={rating===0}>제출</Button>

구분선 16px gap

다른 친구 리뷰 (최신 5개):
  제목 "친구들 리뷰" (Label 13px/600)
  각 행: flex gap 8px items-start
    <StarRating size="sm" value={rating} readonly />
    <span>6-2 {name} · "{comment}"</span>
    IconButton 🚩 (신고, tooltip "리뷰 신고")
```

#### 2.4.2 existing, submitting, success, error

- existing: 기존 별점·댓글 readonly + "이미 리뷰 작성했어요" caption
- submitting: 버튼 disabled + spinner (2초 lock)
- success: 체크 아이콘 + "감사합니다" 2초 → 닫기
- error: 토스트 "다시 시도해 주세요"

### S5. 교사 모더레이션 대시보드

#### 2.5.1 탭1 — 승인 큐

```
좌 리스트 패널 (300px 고정폭):
  상단 접기 섹션 "🤖 자동 1차 필터 auto-rejected 3건 ▾"
    펼치면 회색 목록 (hover로 복구 버튼)
  검색 필터 "학생명 / 태그" input

  승인 큐 리스트 (v6 밀집 스타일):
    각 행 48px, padding 8px 12px, border-bottom --color-border
    flex gap 10px align center
      checkbox
      thumb 32×24
      text block: 제목 (Badge 12px bold) · 작가 시간 (Micro 11px, muted)
    hover: bg --color-surface-alt
    selected: bg --color-accent-tinted-bg + left-border 3px --color-accent-tinted-text

우 상세 패널 (flex 1):
  상단: 학생명 · 시간 · 태그 · 상태 배지 <ModerationStatusBadge />
  중앙: HTML 미리보기 iframe (모달용 1개, LRU 관리) height 320px
  하단:
    프롬프트 로그 접기/펼치기 "💬 프롬프트 ▾"
      펼치면 VibeSession.messages 순차 렌더
    액션 버튼 그룹:
      <Button success shortcut="A">A  승인</Button>
      <Button danger shortcut="R">R  반려 (노트 필수)</Button>
      반려 시 모달: textarea 필수 + 예시 사유 드롭다운 3종(이미 다른 보호자…등)

단축키 힌트: 상단 중앙 고정 caption
  "⌨ A 승인 · R 반려 · ↑↓ 이동 · / 검색 · Esc 닫기"

탭 뱃지 (phase6 §4.6):
  "승인 큐" 뒤 4px gap에 count pill
  bg --color-accent, radius --radius-pill, padding 2px 8px
  font Badge 12px/700, text #fff
  count 0 = 미표시 / count ≥ 100 = "99+"

bulk-mode (phase6 §4.1):
  각 행 좌측 checkbox 체크 시 상단 sticky action bar 등장
  "선택된 {n}건"  [일괄 승인 A]  [일괄 반려 R]  [취소]
  일괄 반려는 공통 노트 1개 input
  A/R 단축키는 선택된 n건에 적용
  최대 50건 (이상은 "차례로 처리해 주세요" 안내)
```

#### 2.5.2 탭2 — 쿼터 현황

```
상단 큰 게이지 (학급 풀):
  라벨 "학급 풀 잔량" Label 13px/600
  <QuotaGauge height="12px" value={used/pool} variant={ok|warn|danger} />
  숫자 표시 "1,200,000 / 1,500,000 토큰 사용" Body 14px

7일 추이 꺾은선:
  가로 길이 360px, 높이 120px
  line color --color-accent, dot 4px
  y축 일별 토큰 사용량

학생별 사용량 리스트 (내림차순):
  각 행 64px
    flex: 학생명 (Label 13px) · QuotaGauge width 160px · 숫자 · 슬라이더(일일 한도 조정)
    슬라이더 step 5K, min 0, max 200K
  "한도 조정" = PATCH /api/vibe/config

긴급 정지 버튼 (상단 우):
  <EmergencyStopButton /> bg --color-danger, 2단 확인 "학급명 재입력"
```

#### 2.5.3 탭3 — 프롬프트 로그 감사

- 필터 영역 상단: 학생 select · 기간 datepicker · "금칙어 매치만" 토글 · CSV 다운로드 버튼
- 세션 리스트 좌측 · 선택 시 우측 대화 전체 (메시지 버블)
- 금칙어 매치 highlight: `background: #fef9e7; border-left: 3px solid --color-vibe-quota-warn;`

#### 2.5.4 탭4 — 설정

**gate-toggle 최상단 sticky (phase6 §4.2)**:

- row "이 보드의 학급 아케이드" + 우측 큰 토글 스위치
- 토글 off 시 모든 하위 필드 disabled
- aria-label "학급 아케이드 활성화"
- 변경 시 confirm 모달 "{n}명 학생에게 영향. 정말 변경할까요?"
- FeatureFlag.vibeArcadeGate + 보드 레벨 조합

- SidePanel 같은 폼 레이아웃, 6필드:
  - moderationPolicy 라디오 3개 (required/auto/hybrid)
  - perStudentDailyTokenCap 숫자 input
  - classroomDailyTokenPool 숫자 input
  - crossClassroomVisible 토글
  - reviewAuthorDisplay 라디오 3개
  - reviewRatingSystem 라디오 3개
- 하단: 저장 버튼 + 긴급 정지 버튼 (탭2와 동일)

### S6. 쿼터 소진 모달

공통: 420×240 centered, bg `--color-surface`, radius `--radius-card`, shadow `--shadow-lift`. 하단 확인 버튼 primary.

**student-cap 분기** (phase6 §4.3):

- 아이콘 ⏰
- 제목 "오늘 쓸 수 있는 만큼 다 썼어요"
- 본문 "내일 자정에 다시 시작해요 (자정까지 {n}시간)"

**classroom-pool 분기** (phase6 §4.3):

- 아이콘 🏫
- 제목 "학급이 같이 쓰는 만큼 다 썼어요"
- 본문 "선생님께 여쭤보세요. 내일 다시 시작해요"

### S7. 반려 복구

- 카탈로그 진입 시 토스트 (`--color-status-returned-bg/text`)
- Studio 재진입 시 S3.9 배너

---

## 3. 사용된 토큰

### 3.1 기존 토큰 (재사용)

- **배경/표면**: `--color-bg`, `--color-bg-alt`, `--color-surface`, `--color-surface-alt`
- **텍스트**: `--color-text`, `--color-text-muted`, `--color-text-faint`
- **액센트**: `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-accent-tinted-text`
- **보더**: `--color-border`, `--color-border-hover`
- **시맨틱 상태**: `--color-status-submitted-bg/text` (pending_review) · `--color-status-reviewed-bg/text` (approved) · `--color-status-returned-bg/text` (rejected/flagged)
- **Destructive**: `--color-danger`, `--color-danger-active`
- **radius**: `--radius-card`, `--radius-btn`, `--radius-pill`
- **shadow**: `--shadow-card`, `--shadow-card-hover`, `--shadow-accent`, `--shadow-accent-hover`, `--shadow-lift`
- **border**: `--border-card`
- **font**: `--font-body`, `--font-display`

### 3.2 신규 토큰 (7)

[`tokens_patch.json`](tokens_patch.json) 참조. 요약:

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-vibe-rating` | `#f5a623` | 별점 amber |
| `--color-vibe-rating-empty` | `#e5e5e5` | 빈 별 |
| `--color-vibe-quota-ok` | alias `--color-plant-active` (#27a35f) | 쿼터 정상 |
| `--color-vibe-quota-warn` | `#f5a623` | 쿼터 경고 |
| `--color-vibe-quota-danger` | alias `--color-danger` (#c62828) | 쿼터 소진 |
| `--color-vibe-sandbox-bg` | `#1a1a1a` | 플레이 모달 배경 |
| `--color-vibe-chat-user-bg` | alias `--color-accent-tinted-bg` (#f2f9ff) | 사용자 메시지 |

### 3.3 타이포 사용

| 위치 | 레벨 |
|---|---|
| 보드 제목 "🎮 학급 아케이드" | Title 20px/700 |
| 카드 제목 | Subtitle 15px/700/-0.15px |
| 모달 제목 · Studio 헤더 | Title 20px |
| 탭 라벨 · 설정 폼 | Label 13px/600 |
| 별점·플레이수·카운터 | Badge 12px/600 |
| 작가·시간 | Micro 11px/600 |
| 본문 | Body 14-15px/400 |

### 3.4 간격·반경

- 카드 그리드 gap 20px (grid) / 16px (stream) 규칙 준수
- 헤더 padding 18px 32px → 반응형 축소
- 카드 padding: 썸네일 0 · 메타 12px 14px
- 모달 padding: 헤더 20px 24px · 바디 16px 24px 24px
- 카드 radius `--radius-card` 12px / 버튼 4px / pill 9999

---

## 4. 컴포넌트 목록

### 4.1 신규 컴포넌트 (9)

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| `StarRating` | `src/features/vibe-arcade/components/ui/StarRating.tsx` | 별점 표시·입력. size sm/md/lg. aria radiogroup |
| `QuotaGauge` | `...QuotaGauge.tsx` | 3단 색상 horizontal bar. role=meter |
| `TokenCountPill` | `...TokenCountPill.tsx` | Studio "23K / 45K" pill |
| `ModerationStatusBadge` | `...ModerationStatusBadge.tsx` | 5 variant 시맨틱 색 재활용 |
| `SandboxIframe` | `...SandboxIframe.tsx` | CSP 검증 · LRU 관리 · about:blank 언마운트 |
| `StreamingChatBubble` | `...StreamingChatBubble.tsx` | DOM 직접 append, React state 누적 금지 |
| `TagChip` | `...TagChip.tsx` | 고정 5종 단일 선택 dropdown |
| `ApprovalQueueCard` | `...ApprovalQueueCard.tsx` | 48px 행, A/R 단축키 힌트 |
| `EmergencyStopButton` | `...EmergencyStopButton.tsx` | 빨강 · 2단 확인 · 학급명 재입력 |

### 4.2 재사용 컴포넌트

- `SidePanel` (dialog 패턴) — 설정 탭4, 반려 사유 모달
- `BoardSettingsPanel` 탭 스타일 — 교사 대시보드 탭 네비게이션
- `ContextMenu` — 카드 long-press 메뉴
- 기존 Modal 시스템 — 쿼터 소진 · 긴급 정지 확인
- `EmptyState` 패턴 (기존 있으면 재사용)
- `Button` / `IconButton` / `Input` / `Textarea` / `Select` primitive

### 4.3 기존 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `src/styles/base.css` | 7개 토큰 추가 (§3.2) |
| `src/lib/board/layout-registry.ts` | `"vibe-arcade"` 엔트리 추가 |
| `docs/design-system.md` | 신규 섹션 "vibe-arcade" 추가 (phase11 doc_syncer) |

---

## 4.4 모바일 인터랙션 보강 (phase6 §4.4·§4.7)

**카드 long-press (mobile 500ms)**:

- ContextMenu 열림 · 항목: "작가 정보" / "공유 링크 복사" / "신고"
- 작가 정보 → 학생 프로필 시트 (6-2 김철수, 최근 3 작품)
- 공유 링크 → `navigator.clipboard.writeText` + 토스트
- 신고 → 서버 moderation 요청

**Studio iOS Safari / Android Chrome visual viewport**:

- `useVisualViewport()` hook 재사용 (신규면 `src/features/vibe-arcade/lib/visual-viewport.ts`)
- 키보드 올라올 때:
  - 입력창 `bottom: env(safe-area-inset-bottom) + keyboardHeight`
  - 미리보기 영역 flex 자동 축소
  - 채팅 `scrollIntoView({block: "end"})`

---

## 5. 접근성 완료 체크리스트

- ✅ 키보드 only — 카탈로그 Tab/Enter, 모달 Tab trap, Studio Ctrl+Enter/Ctrl+S, 대시보드 A/R/화살표
- ✅ 스크린리더 라벨 — 별점 radiogroup, 쿼터 meter, iframe title, 카드 alt, 탭 tablist
- ✅ WCAG AA 명도 — 모든 텍스트/배경 쌍 대비 검증 (tokens_patch.json wcag 필드)
- ✅ 포커스 링 — `outline: 2px solid --color-accent-tinted-text; outline-offset: 2px`
- ✅ 터치 타겟 ≥ 44×44px (탭 S6 Lite)
- ✅ `prefers-reduced-motion` — 모달 transition · shimmer · ai typing animation 전부 대체 경로
- ✅ Sonnet 스트리밍 `aria-live="polite"` 10자 이상 버퍼링 후 announce
- ✅ refusal `aria-live="assertive"`

---

## 6. 반응형 완료

| 브레이크 | 카탈로그 | Studio | 플레이 모달 |
|---|---|---|---|
| Desktop | 5열 · gap 20 · padding 32 | 50/50 좌우 | max-w 1200 centered |
| Tablet ≤1080 | 3열 · padding 24 | 40/60 좌우 | 전체화면 |
| Mobile-L ≤768 | 2열 · padding 18 | 상하 스택 50/50 | 전체화면 + 축소 헤더 |
| Mobile-S ≤560 | 1열 · padding 18 | 탭 전환 | 전체화면 |

---

## 7. 자동 검증 게이트

- ✅ 선택된 변형 명시 (v2 + v3·v5·v6 국소 차용)
- ✅ 화면 상태 7화면 × 34상태 전부 디자인됨
- ✅ 토큰 사용 기존/신규 구분
- ✅ 컴포넌트 신규 9 / 재사용 5+
- ✅ 접근성 · 반응형 체크리스트 완료

→ phase6 design_reviewer 진입 가능.
