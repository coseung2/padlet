# Design Spec — breakout-section-isolation

## 1. 선택된 변형

단일 변형. `SKIP_shotgun.md` 사유 참조 — 표면이 기존 토큰/패턴에 자명히 매핑되므로 variant generation SKIP.

## 2. 화면 상태별 최종 디자인

### A. Breakout View `/board/:id/s/:sectionId?token=…`

ASCII 레이아웃(태블릿 기준):

```
┌────────────────────────────────────────────────┐
│ ← 보드 목록                           (header) │  <- 기존 board-header 재사용 (타이틀 없이)
├────────────────────────────────────────────────┤
│  보드명 › 섹션명                               │  <- .breakout-header
│  Section Title                                 │  <- font-size: 20px (Title 토큰)
├────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ card   │ │ card   │ │ card   │              │  <- .breakout-grid  (grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)))
│  │ title  │ │ title  │ │ title  │              │
│  └────────┘ └────────┘ └────────┘              │
│  ┌────────┐                                    │
│  │ ...    │                                    │
│  └────────┘                                    │
└────────────────────────────────────────────────┘
```

- Empty: 그리드 자리에 `.breakout-empty` 안내 텍스트. 색상 `--color-text-faint`.
- Forbidden: 기존 `.forbidden-card` 패턴 유지.
- 카드 마크업: `<article class="column-card">` 재사용(CSS는 기존). attach 우선순위 imageUrl > linkUrl > videoUrl.

### B. Share Page `/board/:id/s/:sectionId/share`

```
┌────────────────────────────────────────────────┐
│ ← 보드로                                       │
├────────────────────────────────────────────────┤
│  공유 관리                                     │  <- h1 Display 26px
│  섹션: Section Title                           │  <- Label 13px muted
│                                                │
│  ┌─── .share-panel ────────────────────────┐   │
│  │ 공유 URL                                │   │  <- Label
│  │ ┌──────────────────────────────────┐ [복사] │
│  │ │ https://…/board/B/s/S?token=… │      │   │  <- .share-url-input (readonly)
│  │ └──────────────────────────────────┘      │   │
│  │                                            │   │
│  │ [새로 생성]     (이전 링크는 즉시 무효)   │   │  <- secondary button
│  └────────────────────────────────────────────┘   │
│                                                │
│  .share-status (aria-live="polite")            │
└────────────────────────────────────────────────┘
```

- 토큰 부재: URL input 자리에 "아직 생성된 공유 링크가 없습니다." 문구 + 생성 버튼 단일.
- 버튼 피드백: 복사 성공 시 하단 `.share-status` 텍스트 "복사됨 ✓" 1.5s.
- Forbidden(owner 아님): `.forbidden-card` 재사용.

## 3. 사용된 토큰

기존 토큰 100%. 신규 토큰 없음.

| 요소 | 토큰 |
|---|---|
| 페이지 배경 | `--color-bg` |
| panel/카드 | `--color-surface` |
| 본문 텍스트 | `--color-text` |
| 라벨 | `--color-text-muted` |
| URL input border | `--color-border` / hover `--color-border-hover` |
| 복사 버튼 | `--color-accent` 배경, `#fff` 텍스트 |
| 재생성 버튼 | transparent 배경, `--color-border`, hover `--color-accent-tinted-bg` |
| forbidden 경고 | Semantic `#c62828` (Returned) |
| radius | `--radius-card` |

## 4. 컴포넌트 목록

| 컴포넌트 | 타입 | 상태 |
|---|---|---|
| `SectionBreakoutView` | server | 신규 |
| `SectionShareClient` | client | 신규 |
| `.forbidden-card`, `.board-header`, `.column-card`, `AuthHeader` | - | 기존 재사용 |

CSS 추가(base.css / board.css 중 적절한 곳):
- `.breakout-header`
- `.breakout-grid`
- `.breakout-empty`
- `.share-panel`
- `.share-url-input`
- `.share-actions`
- `.share-status`
- `.btn-primary`, `.btn-secondary` (이미 있으면 재사용)
