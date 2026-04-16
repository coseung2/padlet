# Phase 8 — Code / Design Review (+ incident reviews)

검수 대상 세션 커밋:
- `260d1a7` docs phase0-6
- `88d4a3f` feat phase7 (Ibis UX 구현)
- `1d16a76` fix QR Route Handler

## 1. 수용 기준 17개 개별 확인 (scope_decision.md § 3)

| AC | 상태 | 근거 |
|---|---|---|
| 1. 레이아웃 3영역 렌더 | ✅ | DrawingStudio.tsx 최상위 JSX: TopBar + .ds-workspace(viewport+RightRail) + BottomBar |
| 2. 도구 스트립 9개 | ✅ | ToolStrip.tsx 의 TOOLS 상수 9종, BottomBar 중앙 영역 배치 |
| 3. 하단 팔레트 | ✅ | BottomBar.tsx 의 ds-bb-colors: current 원 + 8 팔레트 + 최근 6 |
| 4. HSV 모달 | ✅ | HSVWheel.tsx — Hue 링 + SV 사각형 + Hex + 팔레트 16 + 최근 12 |
| 5. LayerSheet 슬라이드 + L 단축키 | ✅ | LayerSheet.tsx + DrawingStudio.tsx keydown `l` 토글 |
| 6. 핀치 줌 0.25~8× | ✅ | useViewportGestures.ts ZOOM_MIN/MAX |
| 7. 2-finger pan | ✅ | 동 훅 onTouchMove midpoint delta |
| 8. 2-finger tap undo | ⚠→✅ | 초안에서 closure 버그(아래 §2-1) — 이 커밋에서 수정 |
| 9. 3-finger tap redo | ⚠→✅ | 동일 수정 |
| 10. 더블탭 fit | ✅ | onDoubleClick={fit} on ds-viewport |
| 11. Stabilizer | ✅ | useStabilizer.ts EMA α=max(0.05,1-stab/12). onPointerDown→begin, Move→process, Up→reset 확인 |
| 12. 브러시 프리뷰 | ✅ | BrushPreviewDot 배치 (top-right), 지우개면 점선 dashed |
| 13. Paper 메타포 | ✅ | drawing.css .ds-paper: box-shadow + aspect-ratio 3:4 + 여백 + transform |
| 14. v1 엔진 회귀 0 | ✅ | canvas/* 6 파일 git diff → 0 줄 변경. SaveDialog/LayerPanel 내용 유지 |
| 15. Drawpile 분기 | ✅ | DrawingBoard.tsx git diff vs main^ → 0 줄 변경 |
| 16. 반응형 <900px | ✅ | drawing.css @media (max-width: 900px) RightRail 가로화, LayerSheet bottom slide |
| 17. build/typecheck | ✅ | npm run typecheck ✓ · npm run build ✓ |

## 2. 발견된 결함

### 2-1. `handleUndo`/`handleRedo` 이중 정의 + 클로저 stale 참조

**문제**: 초기 커밋은 useViewportGestures 에 전달할 `handleUndoDeferred`/`handleRedoDeferred` 와 BottomBar 버튼 용 `handleUndo`/`handleRedo` 를 별도로 정의. Deferred 버전은 `useCallback(…, [])` 로 stale 클로저였고, scheduleCompose 를 선언 이전 참조. 더 큰 문제: `setLayers((curr) => { applyPatch(...); return curr; })` — 동일 참조 반환 → React 18 bail-out → layers re-render 없음 → `useEffect([scheduleCompose, layers])` 도 안 뛰고 scheduleCompose 직접 호출도 stale.

**증상 가설**: 2-finger undo 시 canvas 픽셀은 이전 상태로 돌아갔지만 main 컴포지트가 다시 안 그려져 화면 상 변화 없음 → "gesture 안 먹힌다" 처럼 보임.

**수정**: 단일 정의로 통합 + `return [...curr]` 로 shallow-copy 후 반환하여 `useEffect([layers])` 가 scheduleCompose 를 다시 스케줄. 버튼과 제스처 모두 동일 핸들러 재사용. `scheduleCompose` 직접 호출 제거 (불필요).

### 2-2. (관찰) React touchmove passive 처리

**관찰**: React 의 `onTouchMove` 는 상황에 따라 passive listener 로 바인딩될 수 있고, 그 경우 `e.preventDefault()` 가 사일런트로 무시된다. 단 우리 viewport 는 CSS `touch-action: none` 을 이미 걸어 브라우저 기본 팬/줌이 차단되므로 실제 영향은 없다. 문서화만.

### 2-3. (관찰) scheduleCompose 위치

`handleUndo/Redo` 가 `scheduleCompose` 선언부보다 앞에 있었다 (JS 호이스팅 상 const/let 선언은 TDZ). 수정 후 `scheduleCompose` 참조 제거로 무관해짐.

## 3. 도메인 의도 대비 누락/어긋남 체크

### 3-1. parent seed (drawpile-schema-stub) 계약
| 계약 | 상태 |
|---|---|
| StudentAsset / AssetAttachment 스키마 불변 | ✅ prisma diff 0 |
| Board.layout 'drawing' 유지 | ✅ |
| Drawpile URL 우선 분기 (DrawingBoard) | ✅ 수정 0 |
| /api/student-assets 응답 envelope | ✅ 필드 추가만(source, isSharedToClass) · 기존 필드 유지 |
| BLOCKERS.md | ✅ 건드리지 않음 |

### 3-2. v1 (ibispaint-drawing-studio) 계약
| 계약 | 상태 |
|---|---|
| 9 도구 · 10 레이어 · 블렌드 4 · undo 50 | ✅ 엔진 미변경 |
| 저장 분기: 학생 → /api/student-assets, 교사 → 로컬 PNG | ✅ handleSave 동일 |

### 3-3. Ibis UX 맵 (phase1/ux_patterns.json) 매칭
| 패턴 | 구현 |
|---|---|
| bottom_horizontal_toolbar | ✅ BottomBar |
| right_vertical_size_slider | ✅ RightRail Vslider 3 |
| hsv_ring_square_modal | ✅ HSVWheel |
| layer_sheet_slide_right | ✅ LayerSheet |
| pinch_zoom_pan | ✅ useViewportGestures |
| two_three_finger_tap_undo_redo | ✅ 수정 후 |
| double_tap_fit | ✅ onDoubleClick |
| stabilizer_ema | ✅ useStabilizer |
| brush_preview_indicator | ✅ BrushPreviewDot |
| paper_metaphor | ✅ .ds-paper CSS |
| bottom_palette_row | ✅ BottomBar .ds-bb-colors |

11/11 매칭.

### 3-4. 누락 체크
- Ibis OUT 명시 항목(필터/선택/변형/레이어 폴더/PSD/타임랩스/협업/브러시 텍스처) — MVP 외로 합의 ✅
- `cancelActiveStroke` 가 pen 포인터 capture 해제를 누락 — 단, 포인터 이벤트가 취소되면 브라우저가 자동 해제. 영향 無.

## 4. 보안 / 안전성

- XSS: 모든 사용자 데이터 색상은 swatch background 인라인 style 로만 사용. DOM innerHTML 없음.
- 쿠키: QR route handler 로 전환 후 Next.js 15 정책 준수.
- 파일 업로드: 학생은 /api/student-assets 만 호출, 교사는 로컬 다운로드 — 서버측 StudentAsset 생성 권한 유지.
- `localStorage` 사용(recent colors): 민감 정보 아님, 도메인 격리 됨.

## 5. 접근성 스폿 체크

| 포인트 | 상태 |
|---|---|
| 도구 버튼 aria-pressed + 한국어 label | ✅ |
| 색 스와치 aria-label `색 #xxx` | ✅ |
| HSV 모달 role=dialog aria-modal | ✅ |
| LayerSheet role=dialog aria-hidden | ✅ |
| Vslider native input[range] | ✅ |
| 키보드 L/0/[/]/B/E · Ctrl+Z/Y · Esc | ✅ |
| 포커스 링 | ⚠ 기본 브라우저 ring 유지, 커스텀 outline 명시 없음 → v3 개선 |
| 터치 타겟 ≥ 40 | ✅ 도구 48, 레일 40. 스와치 24 — HSV 모달이 대체 경로로 보상 |

## 6. QR 로그인 핫픽스 (fix/qr-login-cookie)

### 6-1. 진단
- 증상: `aura-board-app.vercel.app/qr/{token}` → HTTP 500 "server error occurred"
- 재현: 로컬 dev + 유효 qrToken → `Error: Cookies can only be modified in a Server Action or Route Handler`
- 원인: `/qr/[token]/page.tsx` Server Component 에서 `createStudentSession()` → `cookies().set()` 호출. Next.js 15 부터 Server Component 쿠키 쓰기 금지.

### 6-2. 수정 (phase7 범위 외 긴급)
- `page.tsx` → `route.ts` (Route Handler)
- GET 핸들러 내에서 쿠키 세팅 + 302 redirect
- 토큰 없으면 `/qr/invalid` 페이지(신규)로 리다이렉트

### 6-3. 검증
- 로컬 smoke: `curl /qr/{valid}` → 302 `/student` + `student_session` 쿠키 세팅 ✓
- typecheck/build ✓

### 6-4. 잔여 리스크
- createStudentSession 내부에서 DB 예외 발생 시 → 500 (catch 없음). v1 page.tsx 와 동일 수준. 별도 hardening 은 v3.

## 7. 종합 판정

- phase7 구현은 scope AC 17 개 모두 통과 (2-1 수정 반영 후).
- parent seed + v1 계약 회귀 0.
- Ibis UX 패턴 11/11 매칭.
- QR 핫픽스는 별도 incident 로 처리되어 원인·수정·검증 라인업 갖춤.

**REVIEW_OK** 발행 가능. 다음: phase9 QA (브라우저/Tab S6 Lite 실제 테스트) → phase10-11 (이미 main 배포됨, 문서 동기화만 남음).
