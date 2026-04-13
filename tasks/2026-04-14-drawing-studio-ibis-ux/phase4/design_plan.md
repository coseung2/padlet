# Phase 4 — Design Planner: 비주얼 레퍼런스 매핑

## 1. 픽셀 레이아웃 (landscape ≥ 900px wide)

```
╔═════════════════════════════════════════════════════════╗
║  TopBar                                          36 px  ║
╠═════════════════════════════════════════════╦═══════════╣
║                                             ║           ║
║                                             ║           ║
║                                             ║           ║
║       Viewport (flex: 1)                    ║ RightRail ║
║       paper + canvas 가 중앙 배치              ║  64 px    ║
║       main 배경 = var(--color-bg)            ║           ║
║                                             ║           ║
║                                             ║           ║
║                                             ║           ║
╠═════════════════════════════════════════════╩═══════════╣
║  BottomBar                                       56 px  ║
╚═════════════════════════════════════════════════════════╝
```

### TopBar (36px)
- padding 0 12px, background `var(--color-surface)`, border-bottom `1px var(--color-border)`
- 좌: (비워둠 / 혹은 보드 제목)
- 우: [💾 저장] [🖊 펜only] [⤢ fit] [100%]

### BottomBar (56px)
- background `var(--color-surface)`, border-top `1px var(--color-border)`
- 내부 3 컬럼 `grid-template-columns: auto 1fr auto`:
  - 좌: `⟲` `⟳` `📁` — 각 40×40 padding-pill
  - 중: 도구 스트립, `overflow-x: auto`, 각 버튼 48×48
  - 우: 현재색 원 32px + 팔레트 8 + 최근 6 (탭식)

### RightRail (64px)
- background `var(--color-surface)`, border-left `1px var(--color-border)`
- `display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 16px`
- 각 Vslider 블록: 라벨 10px + 세로 트랙 240px + 값 10px

### Viewport
- `position: relative; overflow: hidden; touch-action: none`
- 내부 `.ds-paper` centered via absolute-positioning + CSS transform

### Paper
- 실제 render 크기: `min(1200, 100% * 0.9) × min(1600, 100% * 0.9)` — aspect-ratio 3:4 유지
- box-shadow: `0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`
- border-radius: 2px (종이 느낌)
- background-color: `#ffffff` (canvas 자체)
- transform origin: `50% 50%`

## 2. 토큰 매핑

| 요소 | 토큰 |
|---|---|
| 앱 배경 (viewport) | `var(--color-bg)` |
| 바 배경 | `var(--color-surface)` |
| 구분선 | `var(--color-border)` |
| hover 구분선 | `var(--color-border-hover)` |
| 활성 도구 bg | `var(--color-accent-tinted-bg)` |
| 활성 도구 text | `var(--color-accent-tinted-text)` |
| 1차 버튼 (저장) | `var(--color-accent)` + white |
| 1차 hover | `var(--color-accent-active)` |
| 위험 (삭제) | `var(--color-danger)` |
| 텍스트 기본 | `var(--color-text)` |
| 텍스트 보조 | `var(--color-text-muted)` |
| 텍스트 작은 | `var(--color-text-faint)` |
| 버튼 radius | `var(--radius-btn)` 4px |
| 카드 radius | `var(--radius-card)` 12px |
| 원형 | `var(--radius-pill)` |
| 모달 그림자 | `var(--shadow-card-hover)` |

금지: inline hex. 단 사용자 데이터(현재 색 / 스와치 색)는 인라인 허용.

## 3. 아이콘 세트 (unicode emoji 유지)

| 기능 | 아이콘 |
|---|---|
| 연필 | ✏️ |
| 펜 | 🖋 |
| 마커 | 🖍 |
| 에어브러시 | 💨 |
| 수채 | 💧 |
| 크레용 | 🖌 |
| 지우개 | 🧽 |
| 버킷 | 🪣 |
| 스포이트 | 💉 |
| undo | ⟲ |
| redo | ⟳ |
| clear | ✕ |
| save | 💾 |
| layers | 📁 |
| fit | ⤢ |
| pen-only | 🖊 / 👆 |

v3 에서 SVG 로 통일 검토.

## 4. 모션 스펙

| 요소 | 속도/이징 |
|---|---|
| 도구 버튼 활성 전환 | background 120ms ease |
| 레이어 시트 open/close | transform 220ms cubic-bezier(0.2, 0, 0.2, 1) |
| 모달 open | opacity 120ms / transform scale(0.97→1) 120ms |
| Hue 선택 원 drag | instant (no transition) |
| Paper zoom (핀치 중) | instant (transform 은 CSS 가 GPU 처리) |
| Paper fit (더블탭) | transform 180ms ease |

## 5. 브레이크포인트

| breakpoint | layout |
|---|---|
| ≥ 900px 가로 | 상단+하단 바 + 우측 레일 |
| < 900px 가로 | 우측 레일 → drawer (우측에서 슬라이드), 레이어 시트 → 바텀 슬라이드업 |
| < 600px | 도구 스트립 아이콘 40×40 로 축소, 팔레트는 최근 3개만 |

## 6. 키보드 / 접근성

| 키 | 동작 |
|---|---|
| Ctrl/Cmd+Z | undo |
| Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z | redo |
| E | 지우개 |
| B | 연필 |
| [ / ] | 굵기 -2 / +2 |
| L | 레이어 시트 토글 |
| 0 | fit to viewport |
| Esc | 모달 닫기 |

포커스 링: `outline: 2px solid var(--color-accent); outline-offset: 2px`.

## 7. 상태 별 시각 명세

| 요소 | 기본 | hover | active | disabled |
|---|---|---|---|---|
| 도구 버튼 | transparent bg | surface-alt bg | accent-tinted-bg + accent border | opacity 0.4 |
| 팔레트 스와치 | border 1 border | border 2 accent | ring 2 accent | — |
| Vslider thumb | border var(--color-accent) | scale 1.1 | — | — |
| 저장 버튼 | accent bg | accent-active bg | — | opacity 0.5 |

## 8. Canvas cursor

- 브러시/지우개/버킷/스포이트 중 어느 도구든 `cursor: crosshair`
- 펜-only 모드 OFF + touch 포인터 입력이 UI 영역일 때 기본 cursor

## 9. 검증 게이트 체크
- 픽셀 수치 명시 ✅
- 토큰 매핑 표 ✅
- 아이콘 세트 ✅
- 모션/브레이크포인트/키보드/상태 별 ✅
- 금지(inline hex) 명시 ✅

**→ phase5 designer shotgun 4종 후 최종 spec 확정**
