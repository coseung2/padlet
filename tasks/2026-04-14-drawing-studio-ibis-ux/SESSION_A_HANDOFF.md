# Session A → Session B Handoff (drawing-studio-ibis-ux v2)

## Session A 완료 (이 세션)
- phase0 request.json — v1 엔진/저장/Drawpile 분기 불변, UI/UX 만 Ibis 수준으로
- phase1 research_pack + benchmark_index + ux_patterns — Ibis 10개 패턴 식별
- phase2 scope_decision — AC 17개, Variant D(Ibis 정석) 채택, 리스크 9개
- phase3 architecture_delta — 컴포넌트 트리 / 상태 흐름 / 제스처 훅 / 색상 모달 알고리즘
- phase4 design_plan — 픽셀 수치, 토큰, 아이콘, 모션, 브레이크포인트, 키보드
- phase5 design_spec + rejected/ (A/B/C 아카이브) — 최종 레이아웃 확정
- phase6 design_review — 접근성·태블릿·회귀·리스크 리뷰 통과

## Session B 실행 단계 (phase7 Coder)

### 브랜치
```bash
git checkout -b feat/drawing-studio-ibis-ux
```

### 파일 구현 순서 (phase6 §8)

1. **`hooks/useViewportGestures.ts`** (신규)
   - phase3 §4 API: { zoom, pan, setZoom, setPan, onTouchStart/Move/End, onDoubleTap, cancelActiveStroke }
   - 2-finger pinch/pan, 2-finger tap undo, 3-finger tap redo
   - tapStart 판정: <250ms 경과 + 이동 <10px

2. **`hooks/useStabilizer.ts`** (신규)
   - API: { begin(sample), process(sample), reset() }
   - EMA α = max(0.05, 1 - stab/12)

3. **`ui/HSVWheel.tsx`** (신규)
   - 링 외곽 112, 링 두께 22
   - 내부 SV 사각형 80×80 (ImageData 기반, Hue 변경 시만 재생성)
   - Hue 드래그 / SV 드래그 / Hex 입력 / 최근 12 / 팔레트 16
   - modal backdrop 외부 클릭 닫기

4. **`ui/LayerSheet.tsx`** (신규)
   - 기존 `LayerPanel` 을 슬라이드 인 컨테이너로 감쌈
   - width 340, transform transition 220ms
   - backdrop `.ds-sheet-backdrop` + Esc 닫기

5. **`ui/BrushPreviewDot.tsx`** (신규)
   - fixed top-right (RightRail 피함), 현재 색·굵기·opacity 원

6. **`ui/ToolStrip.tsx`** (`Toolbar.tsx` 리네임 + 가로화)
   - 9 도구 가로 배치, overflow-x: auto
   - 활성 탭 accent-tinted

7. **`ui/TopBar.tsx`** (기존 파일, 대폭 축소)
   - 슬라이더 3개 제거
   - 유지: 💾 저장, 🖊 펜only, ⤢ fit, 100% 표시
   - 높이 36px

8. **`ui/BottomBar.tsx`** (신규)
   - grid: 120px 1fr auto
   - 좌: undo/redo/📁 (40×40)
   - 중: ToolStrip (48×48)
   - 우: 현재색 36 + 팔레트 8 × 24 + 최근 6 × 24

9. **`ui/RightRail.tsx`** (신규)
   - flex column, 64px width, 14px gap
   - Vslider × 3 (굵기/투명/보정)
   - 📁 layer-toggle 40×40 하단

10. **`DrawingStudio.tsx`** 전면 재작성
    - v1 state 유지 + zoom/pan state 추가
    - useViewportGestures / useStabilizer 훅 사용
    - 레이아웃: TopBar / (Viewport + RightRail) / BottomBar / Sheet / Modals
    - stroke pipeline: raw → useStabilizer.process → drawSegment

11. **`src/styles/drawing.css`**: `.ds-*` v1 블록 전면 교체
    - 기존 `.ds-root/topbar/workspace/toolbar/tool-btn/toolbar-sep/color-swatch/canvas-host/canvas-frame/layer-panel/layer-head/...` 모두 제거 또는 v2 규격으로 교체
    - design_plan §1/§2 기준 수치

### 검증
- `npm run typecheck` PASS
- `npm run build` PASS
- 로컬 스모크: `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev`
  1. /board/<drawing-layout> 진입 — v2 레이아웃 렌더
  2. 브러시 6종 각각 stroke 시각 차이 확인
  3. 2-finger pinch → zoom 변화
  4. 2-finger tap → undo (콘솔 로그로 확인 가능)
  5. 3-finger tap → redo
  6. 색상 원 클릭 → HSV 모달 open
  7. 📁 → 레이어 시트 슬라이드
  8. Stabilizer 10 → 부드러운 stroke
  9. 저장(학생) → /api/student-assets 201
  10. 저장(교사) → PNG 다운로드

### 커밋 & 배포
- 단일 브랜치 `feat/drawing-studio-ibis-ux` 에 atomic commit (또는 파일 묶음 단위 2~3 commits)
- 메시지 prefix: `feat(drawing-studio-ibis-ux):`
- Main 직머지 + push (solo direct-merge rule)
- Vercel 자동 배포

### 주의 (phase6 review 반영)
- v1 엔진 (BrushPresets/LayerStack/StrokeEngine/HistoryStack/FloodFill/Eyedropper) 코드 수정 금지 — UI 만
- Drawpile 분기 (DrawingBoard.tsx) 건드리지 않음
- StudentAsset 스키마 / API 응답 envelope 불변
- 팔레트 스와치 터치 타겟 36(24 + padding 6) 보장
- 태블릿 엣지 제스처 제약 문서화 — 커밋 메시지에 언급

## 참조
- tasks/2026-04-14-drawing-studio-ibis-ux/phase0~6/
- parent seed: tasks/2026-04-13-drawpile-schema-stub/
- prior feature: tasks/2026-04-14-ibispaint-drawing-studio/
