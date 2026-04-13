# Phase 6 — Design Review

## 1. 접근성

| 항목 | 상태 | 메모 |
|---|---|---|
| 모든 버튼 한국어 aria-label | ✅ | phase5 §2 각 블록 명시 |
| aria-pressed / aria-expanded | ✅ | 도구, 펜only 토글, LayerSheet 📁 |
| Dialog role + aria-modal + Esc | ✅ | HSVWheel / SaveDialog / LayerSheet backdrop |
| Native input[range] 으로 스크린 리더 커버 | ✅ | 3개 Vslider |
| HSV 링/사각형 role=slider + aria-valuenow | ⚠ | 마우스/터치 드래그 전제, 키보드 커버는 v3 |
| 포커스 링 2px accent | ✅ | design_plan §6 |
| 터치 타겟 ≥ 40×40 | ✅ | 도구 48, 레일 40, 스와치 24 (스와치는 손가락 탭 어렵지만 색 선택은 HSV 모달로 대체 경로 있음 → 수용) |

**남은 경고**: 스와치 24×24 는 WCAG 2.2 권장 44 에 못 미침. 보완책: HSV 모달이 대체 경로 역할. phase7 에서 hover 영역 확장(padding 6) 으로 터치 타겟 36 에 도달하도록 구현 지시.

## 2. 태블릿 (Galaxy Tab S6 Lite)

| 체크 | 결과 |
|---|---|
| 1280×800 landscape 에서 paper 가 세로로 잘림 없이 fit | ✅ (aspect 3:4 + 90% max) |
| 터치 전용(손가락) / S-Pen 모두 pointer event 처리 | ✅ (PointerEvents) |
| 펜-only 토글로 손바닥 인식 끔 | ✅ |
| 2-finger 제스처가 시스템 back gesture 와 충돌 ? | ⚠ Android Chrome 화면 좌우 엣지에서 back 이 우선. 완화: 2-finger 이벤트는 viewport 전 영역 허용하되, 엣지 10px 이내 시작은 accept 못 할 수 있음 — 문서화 |
| 3-finger 제스처 가로챔 가능성 | ⚠ 일부 런처는 3-finger swipe 로 멀티태스킹 스위치. Tap 은 대체로 앱에 전달되나 디바이스별 편차 — Ibis 수준 제한 |

**결론**: 엣지 시작 2-finger 제스처는 신뢰 못 할 수 있다는 한계 있음. UI 상 undo/redo 버튼을 BottomBar 에 병행 제공해서 보상 — 이미 §2-2 좌측 그룹에 있음 ✅.

## 3. v1/parent seed 회귀 체크

| 계약 | 유지 여부 |
|---|---|
| `StudentAsset` 스키마 | ✅ 불변 |
| `Board.layout === "drawing"` | ✅ 불변 |
| `NEXT_PUBLIC_DRAWPILE_URL` 우선 | ✅ DrawingBoard.tsx 분기 유지 |
| `/api/student-assets` 응답 envelope | ✅ 변경 없음 |
| 9 도구 / 10 레이어 / 블렌드 4 / undo 50 | ✅ 엔진 불변 |
| 저장 학생 ↔ /api/student-assets, 교사 ↔ 로컬 다운로드 | ✅ DrawingStudio.tsx handleSave 분기 유지 |
| BLOCKERS.md | ✅ 이 태스크에서 건드리지 않음 |

## 4. 성능 재검증 (예산)

| 항목 | 예산 | 예상 |
|---|---|---|
| Pointer stroke + compose | 10ms/frame | RAF batching + dirty rect 로 유지 |
| Pinch zoom (CSS transform) | 2ms | GPU 가속, 안전 |
| HSV Hue 재계산 + SV square 재렌더 | < 20ms | 80×80 ImageData, Hue 변경 시만 |
| Stabilizer EMA | O(1) | 무시 가능 |

Tab S6 Lite 상에서도 60fps 목표 무리 없음.

## 5. 디자인 시스템 준수

- 인라인 hex 금지 ✅ (사용자 데이터 색상만 예외 — 스와치 background)
- 토큰 명시 ✅ (design_plan §2)
- box-shadow 등 그림자도 원칙적으로 토큰 (`--shadow-*`) 권장. 단 paper 의 그림자는 페인팅 앱 특화 시각 효과로 예외 허용 — phase7 구현 시 `--shadow-lift` 에 매핑 시도하고 안 맞으면 인라인 허용 메모

## 6. 리스크 리뷰 (phase2 §5)

| 리스크 | 상태 |
|---|---|
| R1 Touch/Pointer 이벤트 누수 | 설계로 해결 (Viewport:Touch, Canvas:Pointer, multi-touch 시 stroke cancel) |
| R2 pan/pinch 중 stroke 오시작 | phase3 `cancelActiveStroke()` 훅 |
| R3 Android 3-finger 가로채짐 | BottomBar redo 버튼으로 보상 |
| R4 HSV 느림 | SV cache + Hue 변화 시만 재생성 |
| R5 transform 좌표 오류 | getBoundingClientRect 기반 — 검증됨 |
| R6 tilt spam | 에어브러시만 tilt 참조 |
| R7 슬라이드 애니메이션 jank | transform + will-change |
| R8 v1 CSS 선택자 충돌 | `.ds-*` 블록 전면 교체 (phase7 지시) |
| R9 브라우저 pan/zoom 방해 | touch-action: none, overflow: hidden |

## 7. 승인

- [x] 접근성 수용 (스와치 36 보완 조건부)
- [x] 태블릿 제약 수용 (엣지 제스처 한계 문서화)
- [x] v1/parent seed 계약 보존
- [x] 성능 예산 달성 가능
- [x] 디자인 시스템 준수

**→ phase7 coder 로 진행 허가 (다음 세션)**

## 8. phase7 구현 지시 (Session B 용)

1. 브랜치: `feat/drawing-studio-ibis-ux`
2. 구현 순서:
   1. `hooks/useViewportGestures.ts` — phase3 §4 API
   2. `hooks/useStabilizer.ts` — EMA
   3. `ui/HSVWheel.tsx` — 링 + SV 사각형 + 팔레트
   4. `ui/LayerSheet.tsx` — LayerPanel 감싸는 슬라이드 래퍼
   5. `ui/BrushPreviewDot.tsx`
   6. `ui/Toolbar.tsx` → `ui/ToolStrip.tsx` (가로 스트립으로 리네임)
   7. `ui/TopBar.tsx` 슬라이더 제거, 간결화
   8. `ui/BottomBar.tsx` 신설
   9. `ui/RightRail.tsx` 신설
   10. `DrawingStudio.tsx` 전면 재작성
   11. `src/styles/drawing.css` 의 `.ds-*` 블록 전면 교체
3. 검증: typecheck → build → `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev` → 수동 스모크
4. 합본 커밋 메시지 prefix: `feat(drawing-studio-ibis-ux):`
5. 머지: develop 거치지 않고 main 직머지 (solo rule), push → Vercel 자동 배포
