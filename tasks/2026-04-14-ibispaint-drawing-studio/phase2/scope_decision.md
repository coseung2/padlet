# Scope Decision — ibispaint-drawing-studio

## 1. 선택한 UX 패턴

| 패턴 ID | 채택 근거 |
|---|---|
| `tool_sidebar_left` | Ibis Paint 스탠다드 — 학생들이 다른 앱에서도 동일 UX 경험 |
| `layer_panel_right` | 레이어 관리 표준 위치 |
| `top_bar_actions` | undo/save 빈번 — 화면 상단 고정 |
| `hsv_color_wheel` | 색상 선택 표준 |
| `pointer_events_stroke` | S-Pen 필압 필수 |
| `coalesced_events` | 60fps 품질 요구 |
| `layer_dirty_rect_undo` | 메모리 효율적 50스텝 undo |
| `seed_compat_save` | parent seed 계약 존중 |
| `drawpile_priority` | parent seed의 협업 경로 보존 |

## 2. 기술 스택 결정

**채택: Canvas2D + Perfect Freehand (v1 MVP)**

| 옵션 | 번들 추가 | 블렌드 모드 | S-Pen 필압 | 판정 |
|---|---|---|---|---|
| Canvas2D 자체 구현 | ~0 | 4개(normal/multiply/screen/overlay, `globalCompositeOperation`) | Pointer API 네이티브 | ✅ MVP 채택 |
| Canvas2D + Perfect Freehand | +45KB | 동일 | 스무딩 품질 상승 | ✅ 보조 라이브러리 |
| PixiJS + Perfect Freehand | +400KB | 19종 | 동일 | ⏸ v2 고려 |

근거: MVP는 블렌드 4종 + 레이어 10개로 충분 → Canvas2D로 이미 요구사항 커버. 번들 경량 + 의존성 최소 + Galaxy Tab S6 Lite WebGL 초기화 오버헤드 회피.

## 3. MVP 범위

### 포함 (IN)

#### 3-1. 도구 (9종 — 브러시 6 + 유틸 3)

**브러시 프리셋 6종** (같은 StrokeEngine 내부에서 profile 교체):
- **연필**: hard round, 필압 → 굵기 + 약한 불투명도(0.4–0.9), 입자감 subtle noise
- **펜**: crisp ink, 필압 무관한 고정 굵기, opacity 1.0, line-cap round
- **마커**: semi-translucent (opacity 0.5 기본) + 겹치면 누적(add), 굵기 넓음
- **에어브러시**: 방사형 gradient spray, 필압 → 밀도, tiltX/Y → 타원형 방향
- **수채**: 매우 낮은 opacity(0.15) + soft edge + 가장자리 번짐 approximation(보조 stroke)
- **크레용**: 필압 → 굵기, 입자 큰 noise 오버레이 (브러시 내부에서 random dot stipple)

**유틸 도구 3종**:
- **지우개**: globalCompositeOperation=destination-out, 필압 → 지우기 강도
- **페인트버킷**: flood fill (4-connected, tolerance 32), 레이어 scope 내
- **스포이트**: 클릭 지점 합성 픽셀 → 현재 색상으로 설정 + 최근색 push

#### 3-2. 레이어
- 최대 10개
- 작업: 추가/삭제/복제/이름변경/순서변경(드래그) /가시성토글/opacity 슬라이더/blend 선택
- 블렌드 모드: normal / multiply / screen / overlay
- 기본 생성 시 2 레이어 (배경 흰색 + 작업 레이어)

#### 3-3. 색상
- HSV 휠 (외곽 Hue 링 + 내부 SV 사각형)
- 최근 사용색 6개 (LRU, localStorage 보존)
- 기본 팔레트 8색 (검/빨/주/노/초/파/보/흰)
- 현재 색상 버튼 탭 → HSV 휠 팝오버

#### 3-4. 입력
- PointerEvent(pressure + tiltX/Y + getCoalescedEvents)
- 입력 모드 토글: **펜만** / **마우스·터치 허용**
- 펜만 모드에서 pointerType !== "pen" 무시 (palm rejection)

#### 3-5. Undo/Redo
- 최대 50 스텝
- 구현: 스트로크 단위로 레이어 dirty rect + 이전 ImageData patch 저장
- 메모리 가드: 단일 스텝 > 2MB 예상 시 전체 레이어 스냅샷으로 승격

#### 3-6. 저장
- 모든 레이어 합성 → PNG (1200×1600)
- multipart POST → `/api/student-assets` (Blob path when BLOB_READ_WRITE_TOKEN set)
- form: `file`, `title`, `source="drawing-studio"`, `isSharedToClass=bool`
- 성공 시 토스트 + 갤러리 탭 갱신

#### 3-7. DrawingBoard 분기
- `NEXT_PUBLIC_DRAWPILE_URL` 설정 → Drawpile iframe 우선 (현행 유지)
- 미설정 + 학생 로그인 → `<DrawingStudio />` 렌더
- 미설정 + 교사/비학생 → 기존 placeholder 유지 (교사가 그림 그릴 필요는 낮음)

### 제외 (OUT)

| 항목 | 사유 | 후속 |
|---|---|---|
| 필터(가우시안/모자이크/색조) | 구현 복잡 + 수업 빈도 낮음 | v2 |
| 선택영역/이동/회전/변형 | 복잡도 높음 | v2 |
| 레이어 폴더/마스크/클리핑 | MVP 10레이어로 충분 | v2 |
| PSD/Aurora 포맷 | PNG만으로 공유 충분 | v3 |
| 실시간 협업 | Drawpile 담당 | parent seed |
| 브러시 텍스처 커스텀 | 이비스 수준 필요할 때 | v2 |
| 문자 도구 | v2 |
| 타임랩스 녹화 | v3 |
| 갤러리 탭에서 PSD import | v3 |

## 4. 수용 기준 (Acceptance Criteria)

1. **진입**: drawing 레이아웃 + 학생 세션 + DRAWPILE_URL 미설정 시 `DrawingStudio` 렌더, 좌측 툴바(9도구: 브러시 6 + 유틸 3) + 우측 레이어 패널(기본 2레이어) + 상단 바(undo/redo/clear/save/size/opacity) 전부 가시
2. **브러시 프리셋 6종**: 연필/펜/마커/에어브러시/수채/크레용 각각 선택 시 stroke 출력이 서로 시각적으로 구분 가능해야 함. 필압에 따라 연필·마커·에어브러시·수채·크레용은 굵기 변화, 펜은 굵기 고정(오직 opacity만 반응)
3. **지우개**: 브러시 도구로 그린 위에 지우개로 덧그리면 흰색이 아닌 **투명**으로 지워지고(destination-out), 밑의 다른 레이어가 비쳐 보임
4. **페인트버킷**: 닫힌 영역에 탭 시 tolerance 32로 flood fill (4-connected), 다른 레이어 영향 없음
5. **스포이트**: 탭 지점의 합성 픽셀 색이 HSV 휠의 현재 색에 반영되고 최근 사용색에 push
6. **레이어**: 추가→최대 10, 삭제→최소 1 유지, 가시성 off→해당 레이어 출력 안 됨, 순서 드래그→합성 순서 반영, blend multiply/screen/overlay 각각 시각적으로 다른 결과
7. **Undo/Redo**: 50스텝까지 유지, 51번째 스트로크 시 가장 오래된 스텝 버림, redo는 새 스트로크 시 소거
8. **Palm Rejection**: 펜 모드에서 손바닥 터치 시 stroke 발생하지 않음 (증거: `pointerType` 로그)
9. **저장**: `저장` 버튼 → 진행 표시 → 성공 응답 `{ asset: { id, fileUrl } }` + 갤러리 탭 새로고침 시 새 자산 표시
10. **공개 공유**: `반 갤러리에 공유` 체크 후 저장 → StudentAsset.isSharedToClass=true → 다른 같은 학급 학생이 갤러리 탭에서 확인 가능
11. **Drawpile 우선순위**: `NEXT_PUBLIC_DRAWPILE_URL` 세팅 상태에서 진입 시 스튜디오 대신 iframe 렌더 (seed 계약)
12. **성능**: Galaxy Tab S6 Lite Chrome Android에서 펜 stroke 60fps 유지 (Chrome DevTools Performance 패널 프레임 드롭 3% 이내)
13. **빌드**: `npm run build` + `tsc --noEmit` 통과

## 5. 스코프 결정 모드

**Selective Expansion** — parent seed가 남긴 placeholder 경로 존중하면서 이비스 수준 핵심 3요소(레이어/블렌드/필압)만 선택적으로 확장.

## 6. 위험 요소

| # | 리스크 | 심각도 | 완화 |
|---|---|---|---|
| R1 | Tab S6 Lite에서 10레이어 합성 시 frame drop | H | dirty rect 기반 부분 재합성 + RAF batching. phase9 QA에서 프레임 모니터링. |
| R2 | Undo ImageData patch 누적으로 메모리 초과 | M | 스텝당 2MB 가드 + 전체 스냅샷 승격 / 10분 후 오래된 패치 drop 옵션 |
| R3 | Palm rejection 실패 — 펜과 손 동시 터치 | M | pointerType 필터 + 첫 pen 접촉 후 touch를 pending-lock 처리 |
| R4 | BLOB_READ_WRITE_TOKEN 미설정 시 대량 PNG가 fs 폴백되며 디스크 차지 | M | 프로덕션에 Blob 토큰 필요성 BLOCKERS.md 업데이트. 임시로 50MB 제한 유지 |
| R5 | Drawpile seed 계약 위반 (ip: layout/스키마 변경) | H | 스키마 변경 금지. 이번 태스크는 컴포넌트/CSS/API input 필드만 터치 |
| R6 | 페인트버킷 flood fill이 큰 영역에서 느림 | M | 스캔라인 flood fill (stack 기반) 구현, tolerance 제한, 1200×1600 전체는 max ~2M px 허용 |
| R7 | 학급 경로: 학생 로그인 없이 접속하면 스튜디오 대신 안내 카드만 | L | 기존 `viewerKind` 분기 유지, phase3에서 명시 |
| R8 | PointerEvent getCoalescedEvents 미지원 구형 브라우저 | L | 폴리필 없이도 동작 (coalesced 없을 때 단일 샘플로 처리), 성능 저하는 수용 |

## 7. 검증 게이트 체크
- 수용 기준 13개 (≥ 3) ✅
- IN/OUT 분리 + 후속 명시 ✅
- 리스크 8개 ✅
- parent seed 계약 보존 명시 (§ 3-7, §6 R5) ✅
- 기술 스택 결정 근거 ✅

**→ 스코프 게이트 PASS, phase3 architect로 진행**

## 8. Amendment log
- 2026-04-14 초안: 도구 5종(브러시 1 + 유틸 4)
- 2026-04-14 amended: 사용자 요청으로 브러시 6종 세분화(연필/펜/마커/에어브러시/수채/크레용) + 유틸 3종 = 총 9도구. StrokeEngine은 단일, profile만 교체해 복잡도 분산.

## 9. 세션 분할 계획
- **Session A (이번)**: phase 3 (architect) + phase 4-6 (design_spec)
- **Session B (다음)**: phase 7 (coder) — 전체 drawing/ 서브시스템
- **Session C (다음)**: phase 8-9 (review + QA), phase 10-11 (deploy + docs)
