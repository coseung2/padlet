# Scope Decision — drawing-studio-ibis-ux (v2)

## 1. 선택한 UX 패턴 (phase1 ux_patterns 중 채택 목록)

| # | 패턴 ID | 채택 사유 |
|---|---|---|
| 1 | `bottom_horizontal_toolbar` | Ibis 의 시그니처 — 태블릿 엄지 조작 최적 |
| 2 | `right_vertical_size_slider` | Ibis 핵심 레이아웃 / 우측 엣지 세 슬라이더(굵기/불투명/보정) |
| 3 | `hsv_ring_square_modal` | 공식 전면 색상 모달. 작은 native picker 대체 |
| 4 | `layer_sheet_slide_right` | 태블릿 landscape 에서 오른쪽 슬라이드 인 |
| 5 | `pinch_zoom_pan` | 2-finger 핀치 / 드래그 |
| 6 | `two_three_finger_tap_undo_redo` | Ibis 시그니처 제스처 |
| 7 | `double_tap_fit` | 100% 복원 단축 |
| 8 | `stabilizer_ema` | 손 떨림 보정 (EMA, 0~10) |
| 9 | `brush_preview_indicator` | 현재 도구 피드백 |
| 10 | `paper_metaphor` | 캔버스 여백 + drop shadow |
| 11 | `bottom_palette_row` | 팔레트/최근색 상시 노출 |

## 2. MVP 범위

### 포함 (IN)

**2-1. 레이아웃 재편**
- 하단 가로 툴바 (56px) — 좌 undo/redo/📁, 중 도구 9개 가로 스트립, 우 현재색 원 + 팔레트 8 + 최근 6
- 우측 수직 슬라이더 레일 (64px) — 굵기(1~120), 불투명(0~100), 보정(0~10), + 📁 레이어 버튼
- 상단 얇은 헤더(36px) — 💾 저장, 🖊 펜-only 토글, ⤢ fit 버튼, 100% 텍스트
- 캔버스 paper: 중앙 배치 + `box-shadow`, 주변 배경은 `--color-bg`
- v1 의 좌측 아이콘 툴바 / 우측 고정 레이어 패널 / 상단 긴 슬라이더 바는 **제거**

**2-2. 전면 HSV 색상 모달** (신규 `ui/HSVWheel.tsx`)
- Hue 링 (외곽 240×240 px)
- SV 사각형 (내부, Hue 링 안쪽)
- 드래그로 Hue 링 / SV 사각형 선택
- 하단: 현재색 프리뷰 + Hex 입력 + 최근색 12개 + 기본 팔레트 16색
- 외부 backdrop 클릭 시 닫힘

**2-3. 레이어 슬라이드 시트** (기존 `LayerPanel.tsx` 그대로 사용, 컨테이너만 변경)
- 오른쪽에서 슬라이드 인 (transform: translateX), 340px 너비
- 반투명 backdrop
- `L` 단축키 토글
- 우측 수직 레일의 📁 버튼 또는 하단 툴바 좌측 📁 버튼으로 토글

**2-4. 멀티터치 제스처** (신규 `hooks/useViewportGestures.ts`)
- 2-finger pinch → `zoom` state 0.25~8×
- 2-finger drag → `pan` state (x/y)
- **2-finger tap** (<250ms, 이동 < 10px) → `handleUndo`
- **3-finger tap** → `handleRedo`
- 더블탭 → fit to viewport (zoom=1, pan={0,0})
- CSS transform 으로 paper element 에 `scale` + `translate` 적용

**2-5. Stabilizer** (StrokeEngine 확장)
- 슬라이더 0~10 (우측 레일)
- 각 stroke 샘플에 EMA: `smoothed = prev + α * (raw - prev)`, `α = max(0.05, 1 - stabilizer/12)`
- stroke 시작 시 `smoothed = raw` 초기화

**2-6. 브러시 프리뷰 인디케이터**
- 캔버스 우측 상단에 fixed 위치, 현재 색·굵기(zoom 반영)·opacity 원
- `aria-hidden="true"` (시각 피드백 전용)

**2-7. 접근성 & 반응형**
- 모든 버튼 `aria-pressed` / `aria-label` 한국어
- 터치 타겟 ≥ 40×40 (WCAG 2.2 Enhanced 기준 44 권장, 공간 제약으로 40)
- `@media (max-width: 900px)` 시 우측 슬라이더 레일을 drawer 로 접어 토글, 레이어 시트는 바텀 슬라이드업

### 제외 (OUT)

| 항목 | 사유 | 후속 |
|---|---|---|
| 캔버스 회전 제스처 (2-finger rotate) | 복잡도 > 효용, 초등 수업에서 드묾 | v3 |
| 4-finger tap fullscreen | Android Chrome 4-터치 이벤트 수집이 까다로움 | v3 |
| 레퍼런스 레이어 / 클리핑 마스크 | v1 scope_decision 의 OUT 그대로 | v3 |
| 필터 (블러/모자이크/색조) | v1 OUT | v3 |
| 브러시 advanced settings (flow/density/scatter) | v1 6 프리셋 고정 파라미터 유지 | v3 |
| 대칭/심메트리 도구 | Ibis 핵심이지만 MVP 외 | v3 |
| 타임랩스 녹화 | v1 OUT | v3 |
| 캔버스 회전 | 우선순위 낮음 | v3 |

## 3. 수용 기준 (Acceptance Criteria)

1. **레이아웃**: 스튜디오 진입 시 상단 36px 헤더 + 캔버스 영역(paper + shadow + 주변 여백) + 하단 56px 툴바 + 우측 64px 슬라이더 레일 전부 렌더.
2. **하단 툴바 도구 스트립**: 9 도구(연필/펜/마커/에어/수채/크레용/지우개/버킷/스포이트) 아이콘이 가로 스크롤 가능한 스트립에 표시, 활성 도구 강조.
3. **하단 팔레트**: 하단 툴바 우측에 현재색 원 + 기본 8색 + 최근 6색 가시. 최근 색은 localStorage `drawing-studio-recent-colors`.
4. **HSV 모달**: 현재색 원 클릭 시 전면 모달 오픈. Hue 링을 드래그하면 Hue 업데이트, SV 사각형 드래그하면 채도/명도 업데이트, Hex 입력 정상 반영.
5. **레이어 시트**: 📁 버튼 또는 `L` 키 → 우측 슬라이드 인. 외부 backdrop 클릭 또는 `L` 재시 닫힘. 열려 있을 땐 backdrop(opacity 0.3) 표시.
6. **핀치 줌**: 2 손가락 핀치 → 캔버스 CSS scale 이 0.25~8 사이 반영. 현재 zoom% 가 상단 헤더에 표시.
7. **2-finger pan**: 2 손가락 드래그 → 캔버스 translate 반영. stroke 발생 X.
8. **2-finger tap undo**: 2 손가락 동시 탭(<250ms, 이동<10px) → undo. 이동 발생 시 tap 판정 무효.
9. **3-finger tap redo**: 3 손가락 탭 → redo. 동일 판정 기준.
10. **더블탭 fit**: 캔버스 더블탭 → zoom=1, pan={0,0} 복원.
11. **Stabilizer**: 슬라이더 10 으로 올린 뒤 빠르게 손으로 그려도 stroke 경로가 직선에 가까워짐 (시각 비교).
12. **브러시 프리뷰**: 캔버스 상단/우측에 현재 색·굵기(zoom 반영) 원이 실시간 반영.
13. **Paper 메타포**: 캔버스 외곽에 box-shadow + 주변 배경 `--color-bg`.
14. **v1 엔진 회귀 없음**: 9 도구, 10 레이어, 블렌드 4, undo/redo 50, 저장(학생 → /api/student-assets / 교사 → 로컬 다운로드) 모두 v1 과 동일 동작.
15. **Drawpile 분기 유지**: `NEXT_PUBLIC_DRAWPILE_URL` 설정 시 iframe 우선(DrawingBoard.tsx 분기 그대로).
16. **반응형**: < 900px 가로 시 우측 레일 drawer 토글로 접히고, 레이어 시트는 바텀 슬라이드업.
17. **빌드/타입체크**: `npm run build` / `tsc --noEmit` 통과.

## 4. 스코프 결정 모드

**Selective Expansion** — v1 엔진/API 고정, UI 표면만 Ibis 스타일로 재구성.

## 5. 위험 요소

| # | 리스크 | 심각도 | 완화 |
|---|---|---|---|
| R1 | Touch 이벤트와 Pointer 이벤트 혼재로 이벤트 누수/이중 처리 | H | Canvas 엘리먼트에 PointerEvents, Viewport 래퍼에 TouchEvents 분리. `touch-action: none` 으로 브라우저 기본 팬 비활성 |
| R2 | 2-finger pan/pinch 중 stroke 가 예기치 않게 시작됨 | H | multi-touch 감지 즉시 진행 중 stroke cancel + activePointerId clear |
| R3 | 3-finger tap 을 Android Chrome 일부 환경이 system gesture 로 가로챔 | M | 폴백: 상단 헤더 redo 버튼 유지 |
| R4 | HSV 링 렌더를 RAF 없이 매 드래그마다 하면 느림 | M | SV 사각형은 ImageData 기반 1회 생성 후 캐시, Hue 이동에만 재계산 |
| R5 | CSS transform zoom 시 pointer 좌표 변환 오류 | H | `getBoundingClientRect()` 사용해 이미 변환 후 좌표로 계산 — 기존 toCanvasCoords 로직 그대로 유효 |
| R6 | S-Pen 호버 모드에서 tiltX/tiltY 이벤트 spam | L | 에어브러시 profile 만 tilt 참조, 나머지는 무시 |
| R7 | 레이어 시트 슬라이드 애니메이션이 Tab S6 Lite 에서 jank | L | transform 기반 애니메이션(`will-change: transform`), 300ms |
| R8 | v1 에서 좌측 툴바 참조하던 CSS 선택자 제거 시 스타일 충돌 | M | 기존 drawing.css 의 `.ds-*` 블록을 전면 교체, 구 선택자 명시 삭제 |
| R9 | 멀티터치 사용 중 브라우저 기본 scroll/zoom 이 viewport 밖을 당김 | M | `<div class="ds-viewport">` 에 `touch-action: none` + `overflow: hidden` |

## 6. 검증 게이트 체크

- 수용 기준 17개 (≥ 3) ✅
- IN/OUT 구분 + 후속 명시 ✅
- 리스크 9개 ✅
- parent seed + v1 계약 보존 명시 (§ 2-1/2-5/2-6/§3-AC14~15) ✅
- 기술 결정 근거 (`phase1/research_pack.md` §11 벤치표) ✅

**→ 스코프 게이트 PASS, phase3 architect 로 진행**

## 7. 세션 분할 계획

- **Session A (본 세션)**: phase0~6 (분석 → 리서치 → 스코프 → 아키텍처 → 디자인 플랜 → 디자인 스펙 → 디자인 리뷰). 코드 touch 없음.
- **Session B**: phase7 (coder) — DrawingStudio 전면 재작성 + 신규 컴포넌트 + CSS.
- **Session C**: phase8 (review), phase9 (QA on Tab S6 Lite 또는 Chrome DevTools), phase10-11 (merge+deploy+docs).
