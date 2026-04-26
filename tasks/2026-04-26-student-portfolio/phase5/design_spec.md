# Design Spec — student-portfolio

## 1. 선택된 변형

`mockups/comparison.md` v1 (Classic 2-pane). 사유: 사용자 명시 요구와 1:1, 모바일 stack 변환 명확, 기존 컴포넌트 재활용 최대.

## 2. 화면 상태별 최종 디자인

### A. 포트폴리오 페이지 `/student/portfolio` — ready

**Desktop (≥768px)**

```
┌────────────────────────────────────────────────────────────────┐
│  ← /student        포트폴리오                              👤 │ <- header (기존 student layout)
├──────────────────┬─────────────────────────────────────────────┤
│ 우리 학급 (30명)  │  📚 김민수의 작품 12개                      │
│                  │                                             │
│ 🟢 1. 김민수 (12) │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│    2. 이서연 (8)  │  │ 🌟 카드  │  │   카드   │  │   카드   │  │
│    3. 박지호 (5)  │  │ 제목     │  │ 제목     │  │ 제목     │  │
│    4. 최예린 (0)  │  │ 본문...  │  │ 본문...  │  │ 본문...  │  │
│    5. 정우진 (3)  │  │ ─────── │  │ ─────── │  │ ─────── │  │
│    6. ...        │  │ 미술 4월 │  │ 자유보드 │  │ 미술 4월 │  │
│                  │  │ · 입체파 │  │          │  │ · 추상화 │  │
│                  │  └──────────┘  └──────────┘  └──────────┘  │
│                  │                                             │
│                  │  ┌──────────┐  ┌──────────┐                 │
│                  │  │   카드   │  │   카드   │                 │
│                  │  └──────────┘  └──────────┘                 │
└──────────────────┴─────────────────────────────────────────────┘
```

치수:
- 좌측 폭: `clamp(220px, 22%, 280px)`
- 좌측 학생 행: 높이 44px, padding 8px 12px
- 우측 그리드: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;`
- 카드 자체 크기: width 240~320px, height fit-content (CardBody 그대로)

**Mobile (<768px)**

좌측 리스트 풀스크린 → 학생 탭 시 우측 그리드 풀스크린으로 push (router 페이지 전환 또는 stacked sheet). 뒤로가기로 복귀.

```
list 화면                    detail 화면 (학생 클릭 후)
┌────────────────┐           ┌────────────────┐
│ 우리 학급       │           │ ← 김민수의 작품  │
│ 🟢 1.김민수(12) │   →       │ ┌────────────┐ │
│    2.이서연(8) │           │ │ 카드        │ │
│    3.박지호(5) │           │ └────────────┘ │
└────────────────┘           └────────────────┘
```

### A. ready (타인 카드)

자랑해요 토글 메뉴 항목 미노출. 카드 클릭 → 보드 deep-link 그대로.

### A. empty (학생 카드 0개)

```
┌──────────────────┬─────────────────────────────────────────────┐
│ 우리 학급         │                                             │
│                  │           📭                                │
│  ...             │      아직 작품이 없어요                      │
│                  │                                             │
│                  │   (본인이면) [+ 보드에서 카드 만들기 →]      │
└──────────────────┴─────────────────────────────────────────────┘
```

### A. loading

좌측: 학생 항목 skeleton 8개 (회색 가로바). 우측: 카드 skeleton 6개 그리드.

### A. error (403)

```
┌────────────────────────────────────────────────────────────────┐
│        🔒 이 학급에 접근할 수 없어요                            │
│                                                                │
│        [메인으로 돌아가기]                                      │
└────────────────────────────────────────────────────────────────┘
```

### B. dashboard `/student` 상단 highlight strip — ready

```
┌────────────────────────────────────────────────────────────────┐
│  🌟 우리 학급 자랑해요                              [더 보기 →] │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  → →   │
│  │      │ │      │ │      │ │      │ │      │ │      │        │
│  │ chip │ │ chip │ │ chip │ │ chip │ │ chip │ │ chip │        │
│  │      │ │      │ │      │ │      │ │      │ │      │        │
│  │김민수 │ │이서연 │ │박지호 │ │최예린 │ │정우진 │ │김민수 │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
└────────────────────────────────────────────────────────────────┘
```

chip 치수: 160×120px. 썸네일 (있으면) + 학생 이름 + 카드 제목(짧게 1줄). hover 시 상위로 살짝 올라옴(translateY -2px).

`overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 16px;`

### C. ShowcaseLimitModal — ready

```
┌──────────────────────────────────────────┐
│  🌟 자랑해요는 3개까지예요               │
│                                          │
│  지금 자랑해요 카드 중 어느 걸 내릴까요?  │
│                                          │
│  ○ ┌────────┐  카드 A 제목              │
│    │ thumb  │  미술 4월 · 입체파         │
│    └────────┘                            │
│                                          │
│  ○ ┌────────┐  카드 B 제목              │
│    │ thumb  │  자유보드                  │
│    └────────┘                            │
│                                          │
│  ○ ┌────────┐  카드 C 제목              │
│    │ thumb  │  미술 4월 · 추상화         │
│    └────────┘                            │
│                                          │
│           [취소]  [내리고 새로 올리기]    │
└──────────────────────────────────────────┘
```

폭 480px, 라디오 버튼 + 미니 카드 프리뷰 행 단위 클릭 가능 (label 으로 wrap).

### D. 학부모 `/parent/portfolio` — ready (자녀 1명)

```
┌────────────────────────────────────────────────────────────────┐
│  ← /parent      김민수의 학교 활동                          👤 │
├────────────────────────────────────────────────────────────────┤
│  📚 자녀의 작품                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │ 카드     │ │ 카드     │ │ 🌟 카드  │                      │
│  └──────────┘ └──────────┘ └──────────┘                      │
│                                                                │
│  🌟 우리 학급 친구들 자랑해요                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│  │ chip     │ │ chip     │ │ chip     │                      │
│  └──────────┘ └──────────┘ └──────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

자녀 ≥2명: 헤더 좌측에 자녀 셀렉터 chip:
```
[김민수 (3-1반) ▼]   김민수의 학교 활동
```

## 3. 사용된 토큰

### 기존 재사용

- `--color-bg`, `--color-bg-alt`, `--color-surface`, `--color-surface-alt`
- `--color-text`, `--color-text-muted`, `--color-text-faint`
- `--color-accent` (본인 강조 인디케이터, CTA)
- `--color-accent-tinted-bg` (본인 행 hover 배경)
- `--color-border` (카드 보더, 좌우 칼럼 구분)
- `--color-danger` (한도 모달의 "내리기" 강조 X — 일반 accent 색 사용)

### 신규

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-showcase` | `var(--color-vibe-rating)` (#f5a623) | 🌟 자랑해요 배지·하이라이트 strip 헤더 |

> 별도 hex 추가 X — vibe-rating amber 의 "주목/하이라이트" 시맨틱 alias.

### 타이포

기존 시스템 그대로:
- 페이지 제목: `font-size: 1.25rem; font-weight: 600;`
- 학생 이름 (좌측): `font-size: 0.875rem; font-weight: 500;`
- 작품 수 뱃지: `font-size: 0.75rem; color: var(--color-text-faint);`
- 출처 라벨: `font-size: 0.75rem; color: var(--color-text-muted);`

### 간격·치수

- 좌측 행 padding: `8px 12px`, height 44px
- 카드 그리드 gap: `16px`
- highlight chip: `160px × 120px`, gap 12px
- 모달 width: 480px, padding 24px

## 4. 컴포넌트 목록

### 신규 (8)

| 컴포넌트 | 파일 |
|---|---|
| `<PortfolioPage />` | `src/components/portfolio/PortfolioPage.tsx` |
| `<PortfolioRoster />` | `src/components/portfolio/PortfolioRoster.tsx` |
| `<PortfolioStudentView />` | `src/components/portfolio/PortfolioStudentView.tsx` |
| `<PortfolioCardItem />` | `src/components/portfolio/PortfolioCardItem.tsx` |
| `<ShowcaseLimitModal />` | `src/components/portfolio/ShowcaseLimitModal.tsx` |
| `<ShowcaseHighlightStrip />` | `src/components/portfolio/ShowcaseHighlightStrip.tsx` |
| `<ShowcaseCardChip />` | `src/components/portfolio/ShowcaseCardChip.tsx` |
| `<ParentChildSelector />` | `src/components/portfolio/ParentChildSelector.tsx` |

### 기존 재사용 (3)

| 컴포넌트 | 사유 |
|---|---|
| `<CardBody />` | 카드 본문 렌더 |
| `<ContextMenu />` | 카드 우클릭 메뉴 (자랑해요 토글 항목 추가) |
| (학생 layout shell) | 기존 `/student/*` 레이아웃 재활용 |
