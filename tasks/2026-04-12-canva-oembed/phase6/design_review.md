# Phase 6 — Design Review

task_id: 2026-04-12-canva-oembed
branch: feat/canva-oembed
phase: 6 (reviewer)
selected variant: `phase5/mockups/v1` — thumbnail-first fade-in
inputs: `phase4/design_brief.md`, `phase5/design_spec.md`, `phase5/mockups/v1/index.html`, `phase5/tokens_patch.json`, `src/styles/base.css`, `src/styles/card.css`

---

## 1. Requirement coverage (design_brief.md → status)

| # | design_brief 요구사항 | 위치 | 상태 | 근거 |
|---|---|---|---|---|
| R1 | loading 상태: 썸네일 선 렌더 | §1 | PASS | v1 `<img>` z-index 2, iframe z-index 1 (paint order); design_spec §2 ready-row |
| R2 | ready 상태: iframe 으로 스왑 (opacity fade) | §1 | PASS | `.card-canva-embed[data-loaded="true"] > img { opacity: 0 }` in tokens_patch |
| R3 | error: `.card-link-preview` graceful degrade | §1 | PASS | design_spec §2 error-row reuses existing component path |
| R4 | private / 로그인 요구: scope 수용 한계 | §1 | PASS (OUT-scope 확정) | design_spec §2 private-row, phase2 §2 referenced |
| R5 | 정보 계층: 임베드 → 제목 → 본문 | §2 | PASS | v1 mockup DOM order; attachments 영역이 title 위에 위치 |
| R6 | 썸네일 → iframe 스왑 150ms ease | §3 | PASS | `transition: opacity 150ms ease` in tokens_patch css_rules[2] |
| R7 | iframe 드래그 비전파 | §3 | PASS | wrapper 여백이 카드 드래그 히트존; design_spec §2 레이아웃 note |
| R8 | iframe `title` 속성 | §4-1 | PASS | design_spec §5 체크 + phase3 §3-3 의사코드 참조 |
| R9 | 썸네일 `alt` 속성 | §4-2 | PASS | design_spec §5 체크; v1 mockup 에도 의미 있는 alt |
| R10 | 포커스 가시성 / 기존 토큰 유지 | §4-3 | PASS | 신규 outline 토큰 없음, base.css `:focus-visible` 기본값 상속 |
| R11 | `prefers-reduced-motion` 대응 | §4-4 | PASS | tokens_patch `added_media_queries` |
| R12 | 에러 상태 스크린리더 감지 | §4-5 | PASS | 기존 `.card-link-preview` `aria-label` 유지로 자동 충족 |
| R13 | 신규 규칙 1개만 추가 | §5 | PASS | 단일 `.card-canva-embed` 스코프 (wrapper + descendants) |
| R14 | 기존 토큰 재사용 (bg/radius/shadow) | §5 | PASS | tokens_patch `design_tokens.added = []` |
| R15 | variant A / variant B 중 확정 | §6 | PASS | variant A (v1) 확정, 사유 5개 명시 |

Coverage: 15/15. 모든 brief 요구사항이 design_spec 또는 v1 mockup 또는 tokens_patch 에 반영됨.

---

## 2. 평가 (6 차원) — before fixes

| 차원 | 점수 | 근거 |
|---|---|---|
| 일관성 (Consistency) | 7 | wrapper 가 `--color-bg` / 8px radius 사용해 `.card-attach-image` `.card-attach-video` 와 맞음. **그러나** 사이블링이 모두 가진 `margin-bottom: 8px` 가 없어 Canva 카드의 첨부–본문 간격이 YouTube/이미지 카드와 미세하게 어긋남. 수정 필요. |
| 계층 (Hierarchy) | 9 | 시선 흐름 (임베드 → 제목 → 본문) 이 DOM 순서와 정확히 일치. 임베드의 16:9 질량이 타이틀 font-size 16px 을 자연스럽게 종속시킴. Canva `?meta` 오버레이가 2차 계층을 iframe 내부에 가둬 카드 수준의 시각 노이즈 없음. |
| 접근성 (A11y) | 8 | 5개 brief a11y 요구사항 전부 체크됨 (iframe title, img alt, reduced-motion, focus 유지, error aria-label 상속). 1점 감점: iframe `loading="lazy"` 가 명시 안 됨 — a11y 요구는 아니지만 off-screen 카드의 스크린리더 포커스-전 네트워크 비용을 줄이는 부가 가치 있음. 명시화 권장. |
| 감성/톤 (Tone) | 9 | Inter, warm neutral, 8px 내부 radius, 12px 외곽 radius — Notion 계열 Aura-board 톤 유지. mockup 의 일러스트용 그라디언트(보라→시안→초록)는 production CSS 에 들어가지 않음 (tokens_patch 가 SSOT 이며 그라디언트 미포함). 브랜드 톤 안정. |
| AI slop | 9 | Lorem ipsum 없음. 의미 있는 한국어 카드 카피 ("Q2 Kickoff Deck", "레퍼런스 링크", "컬러 대비"). 무의미한 그라디언트는 mockup 내부 placeholder 에만 존재하며 tokens_patch.json 에 반영 안 됨 — 렌더링 시연용으로 정당화됨. 기계적 반복, 빈 아이콘 나열, 무의미 shadow 스택 없음. |
| 반응형 (Responsive) | 7 | `padding-bottom: 56.25%` 로 16:9 자동 유지 — 대부분의 카드 폭에서 올바르게 확장. **엣지 케이스**: freeform 레이아웃에서 카드 폭 < 120px 로 축소하면 iframe 실제 높이 < 70px 가 되어 인터랙션 불가 상태가 됨. 최소 높이 가드 없음. 수정 필요. |

평균 (before): (7+9+8+9+9+7)/6 = 49/6 = **8.17**

7점 미만 차원 없음 → rule "임의 <7 차원 존재 시 필수 수정" 은 기술적으로 트리거되지 않음. 그러나 `consistency` 와 `responsive` 가 7 에 걸쳐 있어 이 둘을 함께 올리는 저비용 수정이 가능 → 적용.

---

## 3. 적용한 수정

### Fix 1 — `margin-bottom: 8px` on `.card-canva-embed`
`tokens_patch.json` wrapper declarations 에 추가. 사이블링 `.card-attach-image` / `.card-attach-video` 의 수직 리듬과 1:1 동일. consistency 점수 회복.

### Fix 2 — `min-height: 90px` on `.card-canva-embed`
`tokens_patch.json` wrapper declarations 에 추가. freeform 초소형 카드 엣지 케이스 가드. 일반 grid/column 레이아웃에서는 `padding-bottom: 56.25%` 가 지배하므로 시각 변화 없음 (카드 width ≥ 160px 이면 `56.25% * 160 = 90px` 이므로 min-height 와 같아짐 — 그 이상에서는 자연 크기가 더 큼). 즉 regression 없음.

### Fix 3 — iframe `loading="lazy"` mandated in react_contract_notes
`tokens_patch.json` `react_contract_notes.iframe_lazy` 키 신설. phase7 구현자가 누락 못 하도록 계약 고정. 대형 보드 concurrent-iframe 비용 완화. a11y 에도 간접 이득 (스크린리더 focus 전까지 네트워크 행위 없음).

### Fix 4 — design_spec.md §5 체크리스트 3행 추가
`iframe off-screen 로드 비용 완화`, `사이블링 간격 일관`, `초소형 카드 가드` — phase4 → phase5 traceability 유지.

### 수정 대상 외
- `mockups/v1/index.html` — 데모 아티팩트, production CSS SSOT 는 tokens_patch.json 이므로 건드리지 않음.
- production `src/styles/*` — 리뷰어 역할 범위 밖 (phase7 구현자가 적용).
- `mockups/v2 / v3 / v4 / rejected/` — 건드리지 않음.

상세 diff: `phase6/before_after/diff.md`.

---

## 4. 평가 (6 차원) — after fixes

| 차원 | before | after | 변화 사유 |
|---|---|---|---|
| 일관성 | 7 | 9 | `margin-bottom: 8px` 추가로 사이블링 수직 리듬 완전 일치. 나머지 토큰은 이미 `--color-bg`, 8px radius 로 재사용 중. |
| 계층 | 9 | 9 | 변경 없음. 이미 높음. |
| 접근성 | 8 | 9 | `loading="lazy"` 계약화로 off-screen 카드 네트워크 중립. 기존 5개 a11y 요구 + 부가 가드. |
| 감성/톤 | 9 | 9 | 변경 없음. 추가된 규칙 모두 기능성 속성이라 톤에 영향 없음. |
| AI slop | 9 | 9 | 변경 없음. 수정 전후 모두 clean. |
| 반응형 | 7 | 9 | `min-height: 90px` 가드로 초소형 카드 엣지 케이스 해결. `loading="lazy"` 가 대형 보드 concurrent-iframe 비용 완화. 브레이크포인트 처리 건전. |

평균 (after): (9+9+9+9+9+9)/6 = 54/6 = **9.00**

---

## 5. AI slop 감지 섹션 (필수)

4개 mockup 과 최종 spec 을 AI slop heuristic 으로 훑음:

- **Lorem ipsum / placeholder 텍스트**: 없음. mockup 은 의미 있는 카드 카피 ("Q2 Kickoff Deck", "팀 디자인 리뷰", "컬러 대비") 사용. design_spec 은 한국어 설명문 완전 구성.
- **무의미한 그라디언트**: v1 mockup HTML 에 2개 (fake iframe 보라→시안→초록, 썸네일 placeholder 노랑→분홍→파랑) 존재. 그러나 이는 production CSS 에 **반영되지 않음** — tokens_patch.json `css_rules.added` 에 그라디언트 속성 0 개, `design_tokens.added` = []. mockup 은 데모 시연용이고 production SSOT 는 tokens_patch 이므로 slop 판정 해당 없음.
- **기계적 반복**: 4개 변형이 있으나 각자 고유한 trade-off (v1 썸네일 선, v2 스피너, v3 attribution chip, v4 lazy click-to-activate) 를 가지며 기능적으로 서로 다름. 단순 색상 바꾸기 류 아님.
- **무의미 shadow 스택**: `--shadow-card` / `--shadow-card-hover` 는 base.css 에 이미 정의된 Notion 서명 다중 레이어. 신규 shadow 추가 0 개.
- **과잉 토큰**: 신규 토큰 0 개. brief §5 의 "신규 규칙 1 개만" 을 엄격히 준수.
- **빈 아이콘 나열**: 없음. v1 mockup 의 🎨 이모지 하나는 fake iframe placeholder 용.
- **"AI 가 생성한 듯한" 과잉 copy**: 없음. design_spec 본문은 phase4 계약 직계승 + 구현 결정 근거로 구성.

판정: **AI slop 없음.**

---

## 6. 최종 점수 요약

| 차원 | after-fix 점수 |
|---|---|
| 일관성 | 9 |
| 계층 | 9 |
| 접근성 | 9 |
| 감성/톤 | 9 |
| AI slop | 9 |
| 반응형 | 9 |

평균: **9.00 / 10.00**

---

## 7. 판정

**PASS.**

- 평균 9.00 ≥ 8.0 (게이트 임계값)
- 모든 차원 ≥ 9 (7 미만 없음)
- design_brief 요구사항 15/15 반영
- AI slop 섹션 기록됨 (수정 전후 모두 clean 판정)
- phase5/design_spec.md 및 phase5/tokens_patch.json 가 수정 반영됨
- phase6/before_after/diff.md 에 diff 텍스트 기록됨

phase7 (구현 착수) 로 진행 가능.

---

## 8. phase7 구현자에게 넘기는 주의사항

1. `margin-bottom: 8px` 와 `min-height: 90px` 가 `.card-canva-embed` 선언에 들어가야 함 — `tokens_patch.json` 이 SSOT.
2. iframe JSX 요소에 반드시 `loading="lazy"` 속성 포함.
3. `data-loaded` 속성은 React state `iframeLoaded` 의 직접 반영 — class 토글 금지 (memo contract 안전).
4. img 요소가 JSX 에서 iframe **앞** 에 위치해야 paint stacking 이 z-index 없이 자연 동작.
5. mockup HTML 에 있는 그라디언트 시연물은 production 에 **옮기지 말 것** — placeholder 용이며 실제 썸네일은 DB `linkImage` URL.
