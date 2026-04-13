# Design Spec — drawing-studio-ibis-ux (v2, winner = Variant D)

> Shotgun 4종 중 Variant D(Ibis 정석) 채택. 변형 A/B/C 는 `rejected/` 에 아카이브.

## 1. 최종 레이아웃 — Variant D

```
┌────────────────────────────────────────────────────────┐
│  TopBar 36px    💾 저장  🖊 펜only  ⤢ fit   120%       │
├────────────────────────────────────────────┬───────────┤
│                                            │   Right   │
│                                            │   Rail    │
│          Viewport (flex: 1)                │   64 px   │
│     paper (shadow + 여백)                  │  [굵기]   │
│                                            │  [투명]   │
│                                            │  [보정]   │
│                                            │  [📁]     │
├────────────────────────────────────────────┴───────────┤
│ BottomBar 56px                                         │
│ ┌─────┬──────────────────────────────────────┬───────┐ │
│ │⟲⟳📁│  ✏️ 🖋 🖍 💨 💧 🖌 🧽 🪣 💉 (scroll) │ 🟢 pal│ │
│ └─────┴──────────────────────────────────────┴───────┘ │
└────────────────────────────────────────────────────────┘
```

### 사유 (vs A/B/C)
- 하단 바 + 우측 세로 슬라이더 = Ibis 표준 → 학생이 Ibis 쓰다 와도 0 학습
- 캔버스 가용 영역 최대 (B 대비 좌측 툴바 제거, A 대비 하단 팔레트 통합)
- 모든 핵심 컨트롤이 1-탭 거리 (C 의 플로팅 도크 대비 발견성 ↑)

## 2. 컴포넌트별 스펙

### 2-1. TopBar (36px)

```
┌─────────────────────────────────────────────────────────┐
│                          [💾 저장] [🖊 펜only] [⤢][120%]│
└─────────────────────────────────────────────────────────┘
```
- 좌측 비움 (v3 에서 보드 제목 표시 가능)
- 우측 정렬 버튼 그룹
- 저장 버튼: accent 1차, 텍스트+아이콘
- 펜only/fit: secondary (tinted 상태 / 기본 ghost)
- 100% 텍스트: `font-size: 11px; color: var(--color-text-muted)`

### 2-2. BottomBar (56px)

```
grid-template-columns: 120px 1fr auto
```

좌 (120px):
- `⟲` undo 40×40, `⟳` redo 40×40, `📁` layer-toggle 40×40
- disabled 시 opacity 0.4

중 (1fr, overflow-x: auto):
- 9 도구 버튼, 각 48×48, gap 6px, padding 4px 8px
- 활성 도구: accent-tinted bg + accent border
- 스크롤 스냅 옵션

우 (auto):
- 현재색 원 36×36 클릭 → HSV 모달
- 구분선 1px 16px
- 팔레트 8색 24×24 스와치
- 구분선
- 최근색 6 (LRU, localStorage) 24×24

### 2-3. RightRail (64px)

```
padding: 12px 0;
display: flex; flex-direction: column; align-items: center; gap: 14px;
```

Vslider block (× 3):
```
<label>
  <span.label> 굵기 </span>
  <input type=range class="ds-vslider" />  ← height 200px, rotated via appearance: slider-vertical
  <span.val> 8 </span>
</label>
```
- label 10px, val 10px, track height 200, thumb 20×20
- track background `var(--color-border)`, thumb `var(--color-accent)`

하단:
- `📁` 레이어 토글 40×40 pill button. `aria-expanded`.

### 2-4. HSVWheel 모달

```
 ┌─────────── backdrop (rgba 0/0/0/0.5) ─────────┐
 │      ┌──────────── card 300×420 ─────────┐    │
 │      │ 색상 선택                    ✕   │    │
 │      │                                   │    │
 │      │     ╭─────── Hue ring ──────╮    │    │
 │      │    │       ╭─────────╮       │    │    │
 │      │    │       │  SV sq  │       │    │    │
 │      │    │       ╰─────────╯       │    │    │
 │      │     ╰────────────────────────╯    │    │
 │      │                                   │    │
 │      │  ● current | #rrggbb [input]      │    │
 │      │                                   │    │
 │      │  최근:  ● ● ● ● ● ●              │    │
 │      │  팔레트: ● ● ● ● ● ● ● ●          │    │
 │      │          ● ● ● ● ● ● ● ●          │    │
 │      └───────────────────────────────────┘    │
 └────────────────────────────────────────────────┘
```

- 링 외곽 반경 112, 링 두께 22
- SV 사각형 80×80 (링 내부 중앙)
- 선택 표시: 링 선택점 7px 흰 테두리 원, SV 선택점 6px 흰 테두리 원
- Hex 입력 monospace
- 팔레트 16색 (4×4 그리드), 최근 6~12 (LRU)

### 2-5. LayerSheet

```
position: fixed; top: 36px; bottom: 56px; right: 0;
width: 340px;
transform: translateX(100%);   /* closed */
transition: transform 220ms cubic-bezier(.2, 0, .2, 1);
&.is-open { transform: translateX(0); }
z-index: 50;
```

backdrop `.ds-sheet-backdrop`:
```
position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 45;
```
외부 클릭 닫기.

내부는 기존 LayerPanel 그대로 마운트.

### 2-6. Paper + Canvas

```
.ds-viewport {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
  touch-action: none;
  background: var(--color-bg);
}
.ds-paper {
  position: absolute;
  left: 50%; top: 50%;
  width: min(90%, calc((100% * 4) / 5));
  aspect-ratio: 3 / 4;   /* 1200:1600 */
  transform: translate(-50%, -50%) scale(1);
  transform-origin: 50% 50%;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
  /* 동적 pan/translate 는 style attr 로 주입 */
}
.ds-canvas {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  touch-action: none;
}
```

### 2-7. BrushPreviewDot

```
position: absolute;
top: 16px; right: 80px;  /* RightRail 피하기 */
pointer-events: none;
border-radius: 50%;
border: 1px solid rgba(0,0,0,0.15);
```
width/height/background/opacity 는 state 주입.

## 3. 모션

| | |
|---|---|
| LayerSheet open/close | transform 220ms cubic-bezier(.2,0,.2,1) |
| HSV modal backdrop | opacity 120ms |
| Button press | transform scale(.96) 80ms |
| Pinch/Pan | GPU transform instant |
| Fit double-tap | transform 180ms ease |

## 4. 반응형

- ≥ 900px 가로: 위 레이아웃
- 600~900px: RightRail → 드로어, 레이어 시트는 하단에서 슬라이드업
- < 600px: 도구 버튼 40×40, 팔레트 축소 (최근 3 만), HSV 모달 풀스크린

## 5. 접근성 최종 체크

- 모든 버튼 `aria-label` 한국어
- 활성 상태 `aria-pressed`
- Vslider 는 native input type range → 스크린 리더 기본 지원
- HSV 링/사각형은 `role="slider"` + `aria-valuenow` 로 최소 지원
- 모든 모달/시트 `role="dialog"` + `aria-modal="true"` + Esc 로 닫힘
- 키보드 포커스 링 보장

## 6. 검증 게이트 체크
- 변형 4개 중 1개 채택, 나머지 rejected/ 아카이브 ✅
- 픽셀 수치 + 토큰 + 모션 + 반응형 ✅
- 접근성 명시 ✅

**→ phase6 design_reviewer 로 진행**
