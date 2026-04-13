# Phase 1 — Research Pack: Ibis Paint 수준 브라우저 페인팅 스튜디오

## 1. 이비스페인트 기능 스펙트럼 (벤치)

이비스페인트 공식 기능 목록 기반. 우리는 **전체 이식이 목표가 아님** — 학생 수업용으로 꼭 필요한 슬라이스만 MVP로 고른다.

| 카테고리 | 이비스 기능 | MVP 채택 근거 |
|---|---|---|
| 도구 | 연필/펜/에어브러시/마커/지우개/페인트버킷/스포이트/선긋기/도형/문자 | 학교 미술 수업에서 최소 4~5개만 필요 |
| 레이어 | 레이어 50개, 폴더, 블렌드 19종, 마스크, 클리핑 | 블렌드 3~4개(normal/multiply/screen)와 기본 레이어 10개 정도면 초등 수준 커버 |
| 색 | HSV휠, 팔레트, 최근색, 그라데이션, 커스텀 | HSV휠+최근색+기본 팔레트로 충분 |
| 입력 | 필압/기울기/터치/마우스, 팜 레스트 | 필수 — S-Pen 없으면 안 됨 |
| 변형 | 이동/회전/확대, 퀵마스크, 선택영역 | out of MVP (복잡도 대비 수업 빈도 낮음) |
| 필터 | 가우시안/모자이크/색조/효과 | out of MVP |
| 캔버스 관리 | 새문서/크기조정/PSD/PNG | 1200×1600 고정 + PNG 저장만 |
| 부가 | 타임랩스, 튜토리얼, 브러시 다운로드 | out of MVP |

### 핵심 인사이트
- **레이어 + 블렌드 + 필압**이 이비스페인트를 "페인트앱"으로 만드는 3요소
- 나머지(필터/변형/선택)는 고급 사용자용, 수업 현장에서는 드물게 사용
- MVP는 이 3요소 + 도구 5종 + 기본 색상계에 집중

## 2. 웹 네이티브 페인팅 라이브러리 후보

| 라이브러리 | 접근 방식 | 장점 | 단점 | 판정 |
|---|---|---|---|---|
| **Concept Canvas (직접 구현, Canvas2D)** | 레이어별 `<canvas>` + 스트로크를 그 위에 compose | 의존성 0, 코드 소유권 100%, 파일 사이즈 작음 | 브러시 텍스처 직접 구현 필요, 성능 튜닝 직접 | ✅ 채택 후보 |
| **PixiJS** | WebGL 레이어/블렌드 | 60fps 쉬움, 블렌드 모드 19종 내장, 텍스처 브러시 지원 | 번들 +350KB, WebGL 컨텍스트 초기화 비용 | ✅ 채택 후보 |
| **Fabric.js** | 객체 기반 벡터 + 래스터 | 변형/선택이 쉬움 | 페인팅보다는 에디터, 스트로크 필압 지원 약함 | ❌ 부적합 |
| **Konva** | 2D 레이어 캔버스 관리 | 안정적, 레이어 추상화 좋음 | 스트로크 필압 직접 붙여야 함, 블렌드 모드 부족 | ❌ Pixi가 상위호환 |
| **tldraw** | 화이트보드 SDK | 컴포넌트 완성도 | 페인팅이 아닌 다이어그램 | ❌ 목표 불일치 |
| **Perfect Freehand** | 스트로크 → 벡터 path 생성 (라이브러리 아닌 알고리즘) | S-Pen 필압에 맞춰 매끄러운 path, 45KB | 다른 엔진과 조합해야 함 | ⚙ 보조 라이브러리로 적합 |

**추천 스택**: **PixiJS (레이어/블렌드/WebGL) + Perfect Freehand (스트로크 path 생성)**
- Pixi: 레이어 관리, 블렌드 모드 내장, 60fps 보장
- Perfect Freehand: 압력 기반 스무딩 — Pixi로 렌더하되 path 데이터는 Perfect Freehand 가 생성
- 대안: Canvas2D + 직접 스트로크 — 단순하지만 블렌드 모드에서 한계 (multiply/screen 는 `globalCompositeOperation` 으로 가능하나 19종은 어려움). MVP 블렌드 3~4종이면 Canvas2D로도 충분.

### 라이브러리 선택 tradeoff (phase2에서 확정)
- **Canvas2D 루트 (의존성 없음)**: 번들 최소, 코드 명료. 블렌드 3~4종 한정. **MVP 권장**.
- **PixiJS 루트**: 번들 +350KB, 고급 확장 용이. **v2 고려**.

## 3. Pointer Events API — 필압·기울기

### 공식 스펙
- `PointerEvent.pressure` — 0.0~1.0, 필압 값
- `PointerEvent.tangentialPressure` — 펜 배럴 압력(손가락으로 굴리는 힘)
- `PointerEvent.tiltX`, `tiltY` — 기울기(도), ±90
- `PointerEvent.pointerType` — `"pen"` / `"touch"` / `"mouse"`
- `PointerEvent.isPrimary` — 멀티터치 첫 접촉 판정

### 갤럭시 탭 S6 Lite + S-Pen 지원 확인
- Android Chrome 120+ — PointerEvent의 pressure/tilt 모두 지원
- 필압 해상도: Samsung S-Pen 4096단계 → 브라우저에서는 0.0~1.0 float으로 정규화
- tilt는 tiltX/tiltY 둘 다 보고

### 손바닥 인식 (Palm Rejection)
- Android Chrome: `pointerType === "pen"` 만 stroke로 처리, `"touch"` 는 무시하면 간단한 palm rejection 가능
- UI 조작용 터치 / 그림용 펜 분리: 캔버스 영역에서만 pen 필터

## 4. 레이어·합성 설계 (Canvas2D 루트 기준)

### 자료구조
```ts
type Layer = {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;       // 0..1
  blendMode: "normal" | "multiply" | "screen" | "overlay";
  canvas: HTMLCanvasElement;   // 또는 OffscreenCanvas
  locked: boolean;
};
```

### 합성 파이프라인
1. 개별 Layer: 각자 offscreen canvas에 stroke 누적
2. Composer: 표시용 main canvas에 `drawImage(layer.canvas)` + `globalCompositeOperation = layer.blendMode` + `globalAlpha = layer.opacity`
3. Compose는 RAF로 dirty flag 기반 실행 (스트로크 중에는 해당 레이어만 재합성)

### 블렌드 모드 매핑 (Canvas2D → CSS mix-blend-mode 표기)
- normal → `source-over`
- multiply → `multiply`
- screen → `screen`
- overlay → `overlay`
(모두 Canvas2D `globalCompositeOperation` 네이티브 지원)

### 저장 시 합성
- 학생이 저장 → 모든 레이어 순서대로 export canvas에 draw → `toBlob("image/png")`
- 레이어 메타데이터는 v1에서 저장 안 함 (PNG만). v2에서 PSD 스타일 JSON+PNG 번들 검토.

## 5. 성능 가드 (Tab S6 Lite 기준)

### 제약
- Tab S6 Lite = Exynos 9611 (중저가), 4GB RAM, Chrome Android
- 60fps 페인팅 유지하려면 stroke 처리당 ≤ 16ms
- 1200×1600 = 1.92M px per layer; 10 layer = 19M px 메모리 (약 76MB at 4 byte) — 여유 있음

### 최적화 전략
1. **Dirty rect**: 각 stroke의 bounding box만 컴포지터에서 재그림
2. **Layer caching**: 레이어 내부 변경 없을 때 layer.canvas는 그대로 참조, 합성만 재실행
3. **Pointer coalescing**: `event.getCoalescedEvents()` 로 pointermove 이벤트 병합 처리 → 이벤트 손실 방지 + 과도 호출 방지
4. **RAF 스트로크 드로우**: pointermove에서는 좌표만 큐에 쌓고 RAF에서 실제 drawImage
5. **Quadratic curve 스무딩**: 연속 3점 사이 `quadraticCurveTo` 로 꺾임 제거

### 메모리 가드
- 레이어 최대 10개 제한
- undo 히스토리: ImageData 대신 Layer별 patch 기록 (dirty rect + encoded png) — cap 50
- OffscreenCanvas 사용 시 worker로 오프로드 가능 (Android Chrome 지원 확인 필요 — 120+)

## 6. UX 레퍼런스

| 앱 | 채택할 패턴 |
|---|---|
| Ibis Paint X | 좌측 도구 바 / 우측 레이어 패널 / 하단 색상+브러시 프리셋. **MVP 채택** |
| Procreate | 원형 브러시 사이즈 슬라이더 (좌측 긴 바) |
| Krita (웹 데모) | Brush settings 우측 팝업 |
| Adobe Fresco (웹) | 최소주의 — 화면 대부분 캔버스 |

### MVP UI 고정
- 좌측 세로 툴바 (48px 너비): 5개 도구 아이콘 + 색상 현재값 버튼
- 우측 세로 레이어 패널 (200px): 레이어 리스트 + 추가/삭제
- 상단 가로 바 (40px): undo/redo/clear/save + 브러시 굵기/불투명도 슬라이더
- 중앙: 캔버스 (viewport fit)
- 터치 시 손바닥 무시, S-Pen 만 stroke

## 7. 파일 구조 제안 (phase3에서 확정)

```
src/components/drawing/
├── DrawingStudio.tsx          # 엔트리 — 상태 + 레이아웃 컴포지터
├── Canvas/
│   ├── LayerStack.ts          # 레이어 자료구조 + 합성 로직
│   ├── StrokeEngine.ts        # Pointer → path → Canvas draw
│   ├── BrushPresets.ts        # 브러시 프리셋 (연필/펜/에어브러시/마커/지우개)
│   └── HistoryStack.ts        # undo/redo
├── UI/
│   ├── Toolbar.tsx            # 좌측 도구 바
│   ├── LayerPanel.tsx         # 우측 레이어 패널
│   ├── TopBar.tsx             # 상단 undo/save/슬라이더
│   ├── ColorWheel.tsx         # HSV 휠
│   └── BrushSizePopover.tsx
└── index.ts
```

## 8. 데이터 저장 플로우 (parent seed 호환)

1. 학생이 저장 → 모든 레이어 합성 → PNG Blob
2. `POST /api/student-assets` multipart(file) — parent seed의 기존 엔드포인트 재사용
3. 응답의 `asset.id` 를 받아 UI 토스트 표시
4. `isSharedToClass` 토글 체크 시 form에 `isSharedToClass=true` 포함
5. 갤러리 탭은 기존 `/api/student-assets?scope=shared` 그대로 사용

### parent seed 존중 체크
- [x] StudentAsset 스키마 불변
- [x] AssetAttachment 스키마 불변
- [x] 기존 galleryLoad 경로 그대로
- [x] NEXT_PUBLIC_DRAWPILE_URL 설정 시 Drawpile iframe 우선
- [x] BLOCKERS.md 블로커 목록 건드리지 않음

## 9. 오픈 이슈 (phase2 이전 답해야 할 질문)

1. **라이브러리 선택**: Canvas2D 자체 구현 vs PixiJS 도입 → phase2 scope에서 결정 (현재 Canvas2D 권장)
2. **레이어 상한**: 10개 vs 20개 → 10으로 시작
3. **블렌드 모드 수**: 3개(normal/multiply/screen) 또는 4개(+overlay) → 4 권장
4. **저장 포맷**: PNG only vs PSD-like 번들 → PNG만 (v1)
5. **Undo 구현**: ImageData snapshot vs path 저장 → dirty rect patch 권장 (메모리 효율)
6. **멀티플레이어 협업**: out of scope (Drawpile이 담당)
7. **서버 저장**: Blob? DB? → parent seed 따라 Vercel Blob 경유 (fs fallback 유지)
