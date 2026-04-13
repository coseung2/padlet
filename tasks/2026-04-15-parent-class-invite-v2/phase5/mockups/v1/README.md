# Variant v1 — Inbox-First 2-Column (Notion-Calm)

컨셉: design_brief §2.1 "인박스가 1순위" 를 엄격 적용. 데스크탑에서 좌 60% 승인 인박스 + 우 40% 초대 코드 / LinkedParents 를 스택. 전반적으로 현재 Aura-board 디자인 시스템의 카드 패턴과 whisper-weight 보더를 유지하여 학부모 메일 수신자가 "새 제품" 이 아닌 "기존 선생님 대시보드의 신규 탭" 으로 인식하도록 함.

차별 요소:
- 노랑(D+3~5) 은 **신규 토큰 `--color-warning` `#f59e0b`** 채택 (design_brief §5.4 옵션 a)
- Stepper 는 **numeric dot stepper** (●—○—○—○)
- P4 학생 카드는 **정사각 그리드 4×3** (태블릿 우선 6×2)

## 1. 교사 — `/classroom/[id]/parent-access`

### 1.1 데스크탑 (>=1080px) — ready 상태

```
┌────────────────────────────────────────────────────────────────┐
│  Classroom ▸ 3학년 2반 ▸ 학부모 액세스                         │  ← 브레드크럼 14px muted
│                                                                │
│  학부모 액세스                                                 │  ← Display 26px
│  학부모가 이 학급에 연결하는 방법을 관리합니다.                │  ← Body 15px muted
├──────────────────────────────────┬─────────────────────────────┤
│  ┌──────────────────────────────┐│ ┌─────────────────────────┐ │
│  │ 승인 대기 (12)               ││ │ 초대 코드               │ │
│  │  ┌FilterBar──────────────┐   ││ │                         │ │
│  │  │ [전체][D+3↑][D+6↑]   │   ││ │   K3XM-Q7WP             │ │ ← mono 20px bold
│  │  └──────────────────────┘   ││ │   ┌──────────┐          │ │
│  │                              ││ │   │          │          │ │
│  │  ┌row──────────────────┐    ││ │   │   QR     │ 192px    │ │
│  │  │ ● kim…@naver.com    │    ││ │   │          │          │ │
│  │  │   3-2-15 · 김O민    │    ││ │   └──────────┘          │ │
│  │  │   [D+7] 7일 전       │    ││ │   발급 2026-04-15 15:23 │ │
│  │  │         [승인][거부] │    ││ │                         │ │
│  │  └──────────────────────┘    ││ │   [복사]  [회전]        │ │
│  │  ┌row──────────────────┐    ││ └─────────────────────────┘ │
│  │  │ ● lee…@gmail.com    │    ││                             │
│  │  │   3-2-08 · 이O준    │    ││ ┌─────────────────────────┐ │
│  │  │   [D+4] 4일 전       │    ││ │ 연결된 학부모 (18)      │ │
│  │  │         [승인][거부] │    ││ │  ─────────────────      │ │
│  │  └──────────────────────┘    ││ │  park…@naver · 김O민    │ │
│  │  ┌row──────────────────┐    ││ │  2026-03-02 승인 [해제]  │ │
│  │  │ · han…@daum.net     │    ││ │  ─────────────────      │ │
│  │  │   3-2-22 · 한O수    │    ││ │  ... (stacked rows)     │ │
│  │  │   [D+1] 1일 전       │    ││ │  [더 보기]              │ │
│  │  │         [승인][거부] │    ││ └─────────────────────────┘ │
│  │  └──────────────────────┘    ││                             │
│  └──────────────────────────────┘│                             │
└──────────────────────────────────┴─────────────────────────────┘
```

- Grid: `grid-template-columns: minmax(0, 6fr) minmax(0, 4fr)`, column gap 24px (design-system §3).
- PendingRow: 좌측 6px 세로 바 = D+N 색 (빨강/노랑/회색), 행 배경은 흰색, border-bottom 1px border.
- 행 height 72px (내부 세로 패딩 12px + 본문 2줄), 버튼 세로 중앙.
- 전체 페이지 max-width 1280px, 중앙 정렬.

### 1.2 태블릿 (768~1080px, 갤럭시 탭 S6 Lite 가로 1200px 도 포함)

세로 스택, 순서: 인박스 → 초대 코드 → LinkedParents. 인박스의 PendingRow 내부는 여전히 1-row, 버튼만 약간 축소.

### 1.3 모바일 (<768px)

- InviteCode 는 QR을 숨기고 "QR 보기" 버튼으로 전환 (on-demand, 렌더 비용 절감).
- PendingRow 의 승인/거부 버튼은 행 하단 full-width 2버튼.

### 1.4 상태별 화면 (인박스 예)

- empty: 중앙 정렬 illustration 대신 **Body 15px muted** "현재 승인 대기 중인 학부모가 없습니다." + sub "초대 코드를 학부모에게 공유해 보세요." — 카드 1개 차지.
- loading: 행 skeleton × 3 (높이 72px, shimmer 1.4s linear infinite 신규 `@keyframes shimmer`).
- error: 상단 red-tinted banner + "새로고침" secondary 버튼.
- success: 행 fade-out 180ms + toast 우측 하단 (design-system §9 토큰).

## 2. 학부모 온보딩

### 2.1 레이아웃 — 모든 페이지 공통

```
┌───────────────────────────────────┐  ← 페이지 height fit-content, 수직 중앙
│          Aura-board  (로고)        │  ← 24px muted
│                                   │
│   ● ── ○ ── ○ ── ○                │  ← numeric dot stepper (v1 차별점)
│   가입   코드   자녀   대기        │  ← 12px muted
│                                   │
│   학급 코드 입력                   │  ← Title 20px
│   선생님께 받은 8자리 코드를 입력.   │  ← Body 15px muted
│                                   │
│   ┌─┬─┬─┬─┬─┬─┬─┬─┐              │  ← 8칸 code input, 각 48×56
│   │K│3│X│M│Q│7│W│P│              │
│   └─┴─┴─┴─┴─┴─┴─┴─┘              │
│                                   │
│          [   다음   ]              │  ← Primary 전폭 56, sticky mobile
│                                   │
│      문제가 있나요?  선생님께 문의  │  ← 13px muted link
└───────────────────────────────────┘
```

- 카드 1개, max-width 480px, 상하 패딩 40px 32px (태블릿 48px), radius `--radius-card`.
- Stepper 점 크기 10px, active `--color-accent`, visited `--color-accent-active`, upcoming `--color-border`.

### 2.2 P4 학생 선택 (차별 레이아웃)

```
┌────────────────────────────────────────┐
│ ● ● ● ○   3 of 4 — 자녀 선택            │
│ 3학년 2반 (담임: 김선생)                │
│ ┌────────┬────────┬────────┬────────┐  │  ← 4 columns desktop
│ │  3-2-01│  3-2-02│  3-2-03│  3-2-04│  │
│ │  김O민 │  이O준 │  박O서 │  한O수 │  │
│ │  ○     │  ○     │  ●     │  ○     │  │  ← 우상단 radio (≥24px)
│ └────────┴────────┴────────┴────────┘  │
│ ┌────────┬────────┬──────── (2 rows)    │
│ ...                                    │
│                                        │
│  [ 이 학생의 학부모로 신청 ] (sticky)   │
└────────────────────────────────────────┘
```

- 카드 size 132×116 (태블릿 160×140), 44px 탭 타깃 충족.
- 선택 시: border `--color-accent`, bg `--color-accent-tinted-bg`, radio 체크.
- 태블릿 (Tab S6 Lite 가로): 3열 4행 grid.

### 2.3 P5 Pending — "calm" 스타일

```
┌────────────────────────────┐
│ ● ● ● ●   4 of 4            │
│                            │
│  ⏳                         │  ← 48px emoji (SSR 가능)
│  승인 대기 중               │  ← Title 20px
│                            │
│  선생님이 승인하면 자녀 보드를 │
│  볼 수 있습니다.             │  ← Body 15px
│  보통 1~3일 소요됩니다.      │
│                            │
│  ──────────────────────    │
│  학급     3학년 2반         │
│  자녀     김O민             │
│  신청일    2026-04-15        │
│  ──────────────────────    │
│                            │
│  [ 로그아웃 ]               │  ← Secondary small
└────────────────────────────┘
```

- Polling indicator: 카드 상단에 1px `--color-accent` progress bar 가 30s 주기로 좌→우 sweep (reduced-motion 시 정적 dot).

### 2.4 P6 Rejected — reason 분기

reason 에 따라 헤더 아이콘·본문만 치환, CTA 위치 고정.

## 3. 이메일 템플릿 9종 (React-email, 600px)

공통 레이아웃:

```
┌───────────────────────────────────┐
│    Aura-board (흰 배경, 로고 24px) │
├───────────────────────────────────┤
│                                   │
│   제목 (Title 20px, #111)          │
│                                   │
│   본문 문단 (Body 15px, #555)      │
│   ...                             │
│                                   │
│   [ CTA 버튼 (accent) ]           │  ← 해당 시
│                                   │
├───────────────────────────────────┤
│  학교 대표 연락처                  │  ← 13px muted
│  Aura-board · 자동 발송           │
└───────────────────────────────────┘
```

- 교사 PII 노출 금지 (담임 이름 대신 "담임 선생님").
- classroom-deleted 템플릿은 CTA 없음.
- 교사용 3종은 accent 대신 neutral 배경 사용.

## 4. 사용 토큰

| 용도 | 토큰 |
|---|---|
| 캔버스 | `--color-bg` |
| 카드/모달 | `--color-surface` |
| 제목 | `--color-text` Display 26 / Title 20 |
| 본문 | `--color-text` Body 15 |
| 보조 | `--color-text-muted` |
| CTA | `--color-accent` / `--shadow-accent` |
| 거부/파괴 | `--color-danger` |
| D+0~2 배지 | `--color-surface-alt` + `--color-text-muted` |
| D+3~5 배지 | **신규 `--color-warning` `#f59e0b`** + tinted bg `#fef3c7` |
| D+6~7 배지 | `--color-danger` + tinted bg `#fee2e2` |
| 보더 | `--color-border` |
| 라디우스 | `--radius-card` `--radius-btn` `--radius-pill` |
| 트랜지션 | 180ms ease / 200ms modalIn |

## 5. 컴포넌트 (신규)

- `<DPlusBadge value={n}/>` — 3색 분기, aria-label 포함
- `<CodeInput8/>` — 8칸 input + keyboard nav
- `<StudentPickerCard/>` — radio role
- `<OnboardingStepper variant="dot"/>` — numeric dot 버전

## 6. 상태 전환 요약

- pending row 클릭 → spinner 150ms → fade-out 180ms → SWR mutate → toast
- 회전 모달 → 확인 → 모달 fade-out 200ms → invite section 리렌더 (새 코드)
- P5 폴링 active 감지 → toast 1.5s → router.push

## 7. 장점 / 단점 (v1 관점)

- **장점**: 인박스 우선 원칙 엄수, 기존 디자인 시스템 거의 그대로 확장, 학습 비용 ↓.
- **단점**: 데스크탑 외 해상도에서 2-column 의 이점이 사라짐, 태블릿에서 LinkedParents 가 너무 아래로 밀림.
