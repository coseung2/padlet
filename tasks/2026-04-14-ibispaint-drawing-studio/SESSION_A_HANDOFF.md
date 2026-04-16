# Session A → Session B Handoff (ibispaint-drawing-studio)

## Session A (이번) 완료
- phase0 `request.json` — parent seed(`drawpile-schema-stub`) 계약 명시
- phase1 `research_pack.md` + `benchmark_index.json` + `ux_patterns.json` — Ibis/Procreate/Krita/PixiJS/Perfect Freehand 비교, S-Pen Pointer API 조사
- phase2 `scope_decision.md` — Canvas2D + Perfect Freehand 채택, 도구 9종(브러시 6 + 유틸 3), 레이어 10 cap, 블렌드 4종, AC 13개, 리스크 8개. Amendment log + 세션 분할 계획 포함.
- phase3 `architecture_delta.md` — 파일 구조, 데이터 모델, 알고리즘(브러시 프리셋 6종, flood fill, undo), DrawingBoard 분기 계약
- phase5 `design_spec.md` — 레이아웃(landscape/portrait), 토큰 매핑, 접근성, 태블릿 입력

## Session B (다음) 실행 단계

### 1) 브랜치 + 종속성
```bash
git checkout -b feat/drawing-studio
npm install perfect-freehand   # 45KB 경량, 필압 path 스무딩
```

### 2) phase 7 — Coder 순서
1. `src/components/drawing/canvas/BrushPresets.ts` — 6개 프리셋
2. `src/components/drawing/canvas/LayerStack.ts` — 레이어 자료구조 + compose(dirty rect)
3. `src/components/drawing/canvas/StrokeEngine.ts` — PointerEvent → Sample → brush.render
4. `src/components/drawing/canvas/HistoryStack.ts` — 50스텝 undo, before/after ImageData patch
5. `src/components/drawing/canvas/FloodFill.ts` — scanline, tolerance 32
6. `src/components/drawing/canvas/Eyedropper.ts` — 합성 pixel sample
7. `src/components/drawing/hooks/useLayerCompositor.ts` + `usePointerStroke.ts`
8. `src/components/drawing/ui/*` — Toolbar, LayerPanel, TopBar, ColorWheel, BrushSizePopover, SaveDialog
9. `src/components/drawing/DrawingStudio.tsx` — 합성 진입
10. `src/styles/drawing.css` — 토큰 기반 스튜디오 스타일 (기존 drawing.css 확장)
11. `src/components/DrawingBoard.tsx` — 분기 한 줄 추가 (DRAWPILE_URL 우선, 학생 세션 → DrawingStudio)
12. `src/app/api/student-assets/route.ts` — Blob 우선 업로드 + `source` / `isSharedToClass` form 필드 수용

### 3) phase 8-9 — Review + QA
- typecheck / build 통과
- Tab S6 Lite 실기기 또는 chrome devtools mobile emulate(S-Pen 없는 경우 마우스 wheel을 pressure로 대체하는 모드로) 에서 AC 13개 각각 검증
- `/review` + 보안 민감 영역(업로드 경로) `/cso`

### 4) phase 10-11 — Deploy + Doc sync
- feat/drawing-studio → main 머지 + push
- `docs/drawing-studio.md` 신설 (도구별 단축키 / 팁)
- `docs/current-features.md` 업데이트

## 유지할 계약 (변경 금지)
- `StudentAsset` / `AssetAttachment` 스키마
- `Board.layout === "drawing"`
- `NEXT_PUBLIC_DRAWPILE_URL` 설정 시 Drawpile iframe 우선
- `BLOCKERS.md` 의 Drawpile 서버 블로커 그대로 유지
- `/api/student-assets` 응답 envelope

## 주의사항 (Session A에서 관찰)
- Vercel CLI `vercel env add`가 stdin 개행을 literal `\n`으로 저장하는 버그 → env 세팅은 REST API 직접 호출로 우회 (`scripts/` 에 예시 있음)
- Tab S6 Lite `getCoalescedEvents()` 지원 OK (Android Chrome 120+)
- Vercel `BLOB_READ_WRITE_TOKEN` 미설정 상태 — 배포 전 반드시 세팅 필요, 안 그러면 fs fallback으로 저장된 PNG가 람다 재시작 시 증발

## 참조
- Ibis Paint 공식: https://ibispaint.com
- Perfect Freehand: https://github.com/steveruizok/perfect-freehand
- Pointer Events 3: https://www.w3.org/TR/pointerevents3/
