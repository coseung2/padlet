# Design Spec — canva-oembed

task_id: 2026-04-12-canva-oembed
branch: feat/canva-oembed
phase: 5 (designer → handoff to phase6 검수)

## 1. 선택된 변형

**`mockups/v1` — thumbnail-first fade-in**

### 선택 사유

1. **Phase4 계약 직계승** — `phase4/design_brief.md` §3 ("썸네일 `<img>` 즉시 표시 → iframe 백그라운드 로드 → 로드 완료 시 썸네일 opacity: 0 전환") 및 §6 Variant A 와 1:1 일치.
2. **UX 패턴 카탈로그 연결** — `phase4/ux_patterns.json#thumbnail-first-iframe-swap` 의 구현. 해당 패턴은 `phase2/scope_decision.md` §1 채택안 중 하나.
3. **LCP 최상** — 썸네일 URL 은 DB 의 `linkImage` 필드로 이미 로드되어 있어 추가 네트워크 왕복 없이 즉시 페인트. iframe 은 background 로드.
4. **Graceful degradation 기존 경로 재사용** — iframe `onError` → phase3 §3-2 분기로 기존 `.card-link-preview` 로 폴백. 이 폴백 경로가 v1 에서만 자연스럽게 설계됨 (v2/v3 는 loading/attribution 화면이 fallback 과 시각 불일치).
5. **디자인 토큰 추가 최소** — 새로운 색·폰트·간격 토큰 없음. `.card-canva-embed` 스코프 내 CSS 규칙 하나만 추가 (§3 참조).

### 타협 노트 (compromise)

**v4 (thumbnail-only lazy embed) 재검토 가치**
- 대형 보드 (≥30 Canva 카드) 에서 concurrent iframe 비용이 체감된다는 phase9 QA 데이터가 나오면, v1 의 iframe-every-card → v4 의 click-to-activate 로 전환 검토. 이는 **본 task 의 scope 밖**이며 별도 research task (`tasks/{date}-big-board-embed-scaling/`) 의 입력이 될 것.
- v4 채택 시 `acceptance §3 "30초 내 반영"` 의 해석을 재정의해야 하므로 scope 변경이 필수 — phase3 재실행이 필요한 사안.

---

## 2. 화면 상태별 최종 디자인

`design_brief.md` §1 표를 구현체 수준으로 고정.

| 상태 | 렌더 구조 | 스타일 토큰 | 비고 |
|---|---|---|---|
| **loading** | `.card-canva-embed > img.card-canva-thumb` 가 painted, `> iframe` 은 로드 중 (hidden via `opacity: 0` ? no — iframe 은 뒤에 깔려 있고 img 가 위에서 덮음) | `--color-bg` 배경, `--radius-card` wrapper, 썸네일 `object-fit: cover` | img 는 `loading="lazy"` 이지만 카드가 viewport 에 들어오면 즉시 fetch — 체감 LCP 와 동일 |
| **ready** | img 가 `opacity: 0 + pointer-events: none` 로 페이드, iframe 이 노출 | `transition: opacity 150ms ease` (기존 `.modal-attach-section` 과 일관) | `iframeLoaded` state 전환이 트리거. `prefers-reduced-motion: reduce` 시 transition 제거 |
| **error / blocked** | `.card-canva-embed` 분기 자체가 제거 → 기존 `.card-link-preview` 가 동일 props 로 렌더 | 기존 토큰 그대로 | `iframeFailed` state → 분기 rerender (phase3 §3-2) |
| **private (로그인 요구)** | iframe 이 Canva 로그인 UI 를 그대로 표시 | — (Canva 내부) | 본 task scope 수용, 비공개 배지 OUT (phase2 §2) |
| **empty** | CardAttachments 자체가 `null` 반환 | — | Canva URL 없으면 분기 미활성 |
| **success** | = ready | — | — |

### 레이아웃 (v1 확정)

```
.padlet-card                              ← 기존
└── .card-attachments                     ← 기존
    └── .card-canva-embed                 ← 신규 wrapper (16:9)
        ├── <img.card-canva-thumb>        ← z-index:2, fade-to-0 on load
        └── <iframe>                      ← z-index:1 (inferred by paint order)
                                            src=".../view?embed&meta"
                                            loading="lazy" (off-screen deferral)
```

- 썸네일과 iframe 모두 `position: absolute; inset: 0` 으로 wrapper 를 가득 채움.
- wrapper 는 `padding-bottom: 56.25%` 로 16:9 유지 (CSS-only, JS 레이아웃 계산 없음).
- 썸네일 transition 은 `opacity` 만 — layout/composite 안전 (기존 `.modal-attach-section` 과 동일 전략).
- **사이블링 간격 일치**: wrapper 는 `margin-bottom: 8px` 을 적용해 기존 `.card-attach-image` / `.card-attach-video` 와 동일한 수직 리듬을 유지. 카드 내 첨부 + 본문 간 여백이 YouTube/이미지 카드와 시각적으로 같아진다.
- **최소 크기 가드**: freeform 보드의 매우 작은 카드(카드 width < 160px)에서도 iframe 이 사용 가능하도록 wrapper 에 `min-height: 90px` 을 둔다. 16:9 비율은 유지하되, 초소형 카드에서 세로가 0 에 가까워지는 엣지 케이스를 차단. 일반 grid/column 레이아웃(기본 카드 width ≥ 240px)에서는 `padding-bottom: 56.25%` 가 지배하므로 시각 변화 없음.

---

## 3. 사용된 토큰

### 기존 토큰 (그대로 재사용, 변경 없음)

| 토큰 | 용도 |
|---|---|
| `--color-bg` | `.card-canva-embed` 배경 (iframe 로드 전 placeholder) |
| `--color-border` | 기존 카드 border (wrapper 자체에는 border 미사용, 카드 레벨만) |
| `--radius-card` | 카드 외곽 (wrapper 는 내부 8px radius — 기존 `.card-attach-image`, `.card-attach-video` 와 통일) |
| `--shadow-card`, `--shadow-card-hover` | 카드 쉐도우 — 변경 없음 |
| `--color-text`, `--color-text-muted` | 카드 제목/본문 — 변경 없음 |
| `--font-display`, `--font-body` | 카드 텍스트 — 변경 없음 |

### 신규 토큰

**없음.** 디자인 브리프 §5 의 "신규 규칙 1 개만 추가" 요구사항을 엄수.

### 신규 CSS 규칙 (토큰 아님, 컴포넌트 스코프)

`.card-canva-embed` — §4 컴포넌트 목록 및 `tokens_patch.json` 참조.

---

## 4. 컴포넌트 목록

### 신규 컴포넌트

**없음 파일.** 신규 컴포넌트 파일 생성 금지 (phase3 §3 의 "최소 변경" 원칙, phase2 OUT 재확인).

### 기존 컴포넌트 수정

| 컴포넌트 | 파일 | 변경 요약 |
|---|---|---|
| `CardAttachments` | `src/components/CardAttachments.tsx` | Canva 분기 추가 (phase3 §3-3 의사코드). 기존 YouTube/video/link-preview 분기 불변. `memo` wrapper 유지. 신규 로컬 state 2개: `iframeLoaded`, `iframeFailed`. 신규 헬퍼: `extractCanvaDesignId(url)` — `getYouTubeId` 옆에 배치 또는 `src/lib/canva.ts` 로 export |

### 신규 CSS 규칙

| 규칙 | 파일 | 내용 |
|---|---|---|
| `.card-canva-embed` (+ descendants) | `src/styles/card.css` (append) | `tokens_patch.json` 참조 |

---

## 5. Phase4 요구사항 체크리스트

| design_brief 요구 | v1 반영 여부 |
|---|---|
| §1 loading 상태: 썸네일 먼저 | ✓ `.card-canva-thumb` z-index 위 |
| §1 ready 상태: iframe 으로 스왑 | ✓ opacity fade |
| §1 error: `.card-link-preview` 로 degrade | ✓ 기존 경로 재사용 (분기) |
| §2 정보 계층: 임베드 → 제목 → 본문 | ✓ 카드 DOM 순서 유지 |
| §3 썸네일 → iframe 스왑 150ms ease | ✓ `transition: opacity 150ms ease` |
| §3 iframe 드래그 비 전파 | ✓ wrapper `.card-canva-embed` 외부 여백이 카드 드래그 히트존 |
| §4 키보드 focus: iframe `title` | ✓ phase3 §3-3 의사코드 `title={linkTitle}` |
| §4 스크린리더: img `alt` | ✓ phase3 §3-3 의사코드 `alt={linkTitle ?? "Canva design"}` |
| §4 `prefers-reduced-motion` | ✓ `tokens_patch.json` media query |
| §5 토큰/컴포넌트 재사용, 신규 1개만 | ✓ `.card-canva-embed` 하나만 (스코프 내 descendants 포함) |
| §3 iframe off-screen 로드 비용 완화 | ✓ `loading="lazy"` 속성 (대형 보드 performance 가드) |
| 사이블링 간격 일관 | ✓ `margin-bottom: 8px` — `.card-attach-image/video` 와 동일 |
| 초소형 카드 가드 | ✓ `min-height: 90px` — freeform 엣지 케이스 |

---

## 6. Phase6 검수 핸드오프

- 입력: `design_spec.md` (이 문서), `tokens_patch.json`, `mockups/v1/index.html`.
- 검수 포인트 (제안):
  - v1 의 썸네일 fade 타이밍이 카드 hover 전환 (180ms) 과 충돌하지 않는지.
  - iframe 로드 실패시 `.card-link-preview` 로의 전환이 시각적으로 명확한지 (brief §3 "즉시 전환").
  - `prefers-reduced-motion` 호환성 실측 (Chrome/Firefox/Safari).
- 미결 사안: v4 lazy-embed 패턴은 본 task 종료 후 metrics 기반 재검토. `mockups/v4/` 는 `rejected/` 가 아닌 `mockups/` 에 보존하여 감사 이력으로 남김.

---

## 부록: 보관 정책

- `mockups/v1/` — 선택된 변형. phase7 구현자가 시각 참조용으로 사용.
- `mockups/v2/`, `mockups/v3/`, `mockups/v4/` — 감사 이력으로 보존. 삭제 금지 (phase5 _index.md 규칙).
- `rejected/` — **비어 있음**. 위 3개 변형 중 `design_brief.md` 필수 요구를 명백히 위반한 안은 없음 (모두 수용 가능한 trade-off 스펙트럼).
