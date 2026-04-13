# Design Spec — ibispaint-drawing-studio (phase 4-6 compressed)

> Solo 프로젝트 + 레퍼런스 명확(Ibis Paint) → shotgun 4~6 variants 생략, 단일 확정안만 기록.

## 1. 레이아웃 (Landscape 기준)

Galaxy Tab S6 Lite 가로모드 1620×1080 기준.

```
┌──────────────────────────────────────────────────┐
│ TopBar 44px : ⟲ ⟳ ✕ 💾  │ ◆ size ▬ │ ◯ opacity │
├────┬─────────────────────────────────┬───────────┤
│    │                                 │ Layers    │
│ T  │                                 │ ┌───────┐ │
│ o  │                                 │ │ 🖼 3   │ │
│ o  │       Canvas viewport           │ │ 🖼 2   │ │
│ l  │       (1200×1600 fit)           │ │ 🖼 1   │ │
│ b  │                                 │ │ 🖼 BG  │ │
│ a  │                                 │ └───────┘ │
│ r  │                                 │ + 새 / 🗑  │
│    │                                 │ opacity ▬ │
│ 56 │                                 │ blend ▾   │
│ px │                                 │           │
└────┴─────────────────────────────────┴───────────┘
```

### Portrait (< 900px 가로): 하단 수평 툴바로 flip
- TopBar → 그대로
- 좌측 툴바 → 하단 56px 수평 바
- 레이어 패널 → 바텀시트 (탭으로 열기)

### Breakpoints
- `landscape` (기본): ≥ 900px wide
- `portrait`: < 900px wide → UI reshuffle

## 2. 컴포넌트 스펙

### 2-1. Toolbar (좌측 세로)

| 영역 | 내용 |
|---|---|
| width | 56px (landscape), height 56px (portrait 하단 바) |
| background | `var(--color-surface)` |
| border-right | `1px solid var(--color-border)` |
| padding | 8px 0 |

**버튼 9개** (아이콘 + 상단 라벨 툴팁):
- 🖊 연필 / 🖋 펜 / 🖍 마커 / 💨 에어브러시 / 💧 수채 / 🎨 크레용 / 🧽 지우개 / 🪣 버킷 / 💉 스포이트

버튼 각: 40×40, `var(--radius-btn)`. 선택 상태 `background: var(--color-accent-tinted-bg)`, `color: var(--color-accent-tinted-text)`.

하단 구분선 후 **색상 스와치**(32×32 원, 현재색 표시). 탭 → ColorWheel 팝오버.

### 2-2. LayerPanel (우측 세로)

| 영역 | 내용 |
|---|---|
| width | 220px (landscape) |
| background | `var(--color-surface)` |
| border-left | `1px solid var(--color-border)` |

헤더: "레이어" 제목 + `+ 추가` 버튼 + `🗑` 삭제 (선택 레이어 1개 이상)

**레이어 카드** (각 56px):
```
[👁 토글] [썸네일 40×40] 레이어 이름 [⋯]
            순서 드래그(leftside handle)
```
- 선택 시 `border: 2px solid var(--color-accent)`
- 썸네일은 레이어 canvas의 40×40 downscale (RAF 1회/초 업데이트)

레이어 리스트 하단:
- Opacity 슬라이더 (0..100%)
- Blend 드롭다운 (normal / multiply / screen / overlay)
- Lock 토글 (v1 disabled — display only)

### 2-3. TopBar

높이 44px. 좌 → 우: `⟲` undo · `⟳` redo · `✕` clear · `💾` save · `🔀` 입력 모드 토글(펜만/허용) · 굵기 슬라이더(1–120px) · opacity 슬라이더(0–100%)

버튼 `var(--radius-pill)`, 32×32. disabled 시 `opacity: 0.4`.

### 2-4. ColorWheel 팝오버

440×320 floating panel:
- 좌측 Hue 링 (반경 80, 외곽)
- 내부 SV 정사각형 (Saturation × Value)
- 하단 최근 사용색 6개 (스와치 24×24 원)
- 기본 팔레트 8색 (한 줄)
- Hex 입력 필드 (# + 6자)

### 2-5. SaveDialog 모달

320×260 centered:
- 제목 input (placeholder "내 그림")
- `반 갤러리에 공유` 체크박스
- 취소 / 저장 버튼

## 3. 토큰 매핑 (`docs/design-system.md` 준수)

| 요소 | 토큰 |
|---|---|
| 패널 배경 | `var(--color-surface)` |
| 앱 배경 (캔버스 뒷면) | `var(--color-bg)` |
| 1차 버튼 | `var(--color-accent)` → white |
| 1차 hover | `var(--color-accent-active)` |
| 1차 탭 pressed (선택) | `var(--color-accent-tinted-bg)` + `var(--color-accent-tinted-text)` |
| 보더 | `var(--color-border)` / hover `var(--color-border-hover)` |
| 텍스트 | `var(--color-text)` / muted `var(--color-text-muted)` / faint `var(--color-text-faint)` |
| 위험 (삭제) | `var(--color-danger)` |
| 반지름 | `var(--radius-btn)` 4px / `var(--radius-card)` 12px / `var(--radius-pill)` |
| 그림자 | 팝오버 `var(--shadow-card-hover)` |

**금지**: 어떤 inline hex 값도 넣지 않음 (docs/design-system.md 원칙). 데이터 driven 색(사용자 팔레트 색 swatch)만 인라인 허용.

## 4. 모션

- Tool button 선택 전환 `background 120ms ease`
- Layer 카드 hover `border-color 120ms ease`
- 팝오버 open `opacity 100ms ease + transform 100ms ease` from scale(0.98)

## 5. 접근성 (phase6 리뷰)

- 모든 도구 버튼 `aria-pressed` + 한국어 aria-label
- 색상 스와치 `role="button"` + aria-label `색상 빨강 #ff0000`
- 레이어 카드 `role="listitem"`, 리스트 `role="list"`
- 슬라이더 `<input type="range">` 기본 사용
- 포커스 링 `outline: 2px solid var(--color-accent)`
- 다크 모드: 토큰이 이미 테마 대응 — 추가 작업 없음

## 6. 태블릿 입력

- 캔버스 영역 `touch-action: none` — 페이지 팬/줌 차단
- UI 영역은 `touch-action: manipulation` — 탭 지연 제거
- 팜 레스트: 펜-only 모드에서 touch pointer 전체 무시

## 7. 변형 rejected (상시 참고용 메모)

Shotgun은 생략했지만 고려했던 대안:
- **Procreate식 좌측 투명 사이드바**: 공간 절약 good, 유지보수 부담 → rejected
- **하단 고정 도구 서랍**: 세로모드엔 적합, 가로모드엔 거슬림 → landscape/portrait 분기로 부분 채택
- **플로팅 브러시 휠 (radial menu)**: 화려하지만 태블릿에서 터치 정확도 낮음 → rejected

## 8. 디자인 리뷰 (phase6) 체크
- 레이아웃 가로/세로 분기 ✅
- 모든 컴포넌트 토큰만 사용 ✅
- 접근성 키보드/스크린리더 고려 ✅
- 태블릿 터치 최적화 (touch-action, palm rejection) ✅
- rejected 대안 메모 ✅

**→ phase7 coder 인풋 준비 완료**
