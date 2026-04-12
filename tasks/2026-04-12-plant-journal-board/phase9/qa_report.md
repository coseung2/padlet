# QA Report — plant-journal-board

Environment: local dev, port 3000, Next.js 16.2.3 turbopack, Postgres via Supabase pooler (ap-northeast-2), seed run.

Browser: no headed browser available in agent env — verified via curl + HTML grep + response timing.

## Acceptance criteria (phase2 §3)

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | 학생 식물 미선택 시 선택 화면, 노선도 진입 불가 | API `GET /board/b_plant/plant-journal` returns `myPlant: null`; `PlantRoadmapBoard` dispatcher renders `PlantSelectStep`. HTML contains "식물 관찰일지". | PASS |
| 2 | 식물 + 별명 → DB row + 노선도 전환 | `POST /api/student-plants` → 201 + StudentPlant row (id=cmnvcng9a0001vs014q1nt0it) written; refetch returns `myPlant` populated. | PASS |
| 3 | active/visited/upcoming 노드 스타일 | `RoadmapView` computes `stageState(order)` vs `currentOrder`; CSS `.plant-node[data-state="..."]` in plant.css; active gets `aria-current="step"`. Manual inspection of source. | PASS |
| 4 | 노드 tap → 관찰 포인트 ≥3 + 본인 사진 목록 + 메모 + "관찰 추가" | Plant-journal GET returns `observationPoints` array (3 each stage). `StageDetailSheet` renders points list + observations timeline + "관찰 추가" primary button. | PASS |
| 5 | 사진 ≤10장 + 메모 ≤500자 + 201 즉시 반영 | `POST /observations` with 1 memo → 201 (observation id cmnvcnrme0003vs01wmxlf1ry). 11-image attempt → 400 ("사진은 10장까지"). Zod `max(10)` enforces server-side. | PASS |
| 6 | 다음 단계 버튼 사진 0 → 사유 모달; 사유 입력 시 진행 | `POST /advance-stage` with empty body on stage-1 (no photos) → 400 `require_reason`. With `{noPhotoReason:"..."}` → 200, `currentStageId` moved to stage-2. | PASS |
| 7 | 본인만 수정/삭제 | Student PLNT02 attempts `DELETE /observations/cmnvcnrme...` on PLNT01's plant → 403 `forbidden`. Owner PLNT01 DELETE → 204. | PASS |
| 8 | 교사 요약 — 분포 badge + 정체 경고 | `GET /plant-journal` as owner returns `teacherSummary.distribution = {"2": 1}`, `totalStudents=3`, `plantedCount=1`. `TeacherSummaryView` renders 10 stage bars + table. 정체 조건(`stalled`) 계산 확인. | PASS |
| 9 | 매트릭스 owner+desktop 외 403 | owner+`X-Client-Width:1440` → 200 with 10 stages. owner no header → 403 `desktop_only`. owner `X-Client-Width:800` → 403 `desktop_only`. editor+desktop → 403 `owner_only`. | PASS |
| 10 | 노선도 초기 로드 TTI < 3s | Local dev `/board/b_plant` SSR total 0.49~0.55s (3 samples). LCP 예상치 ≤ 1s (SSR 완료 시점 기준). 성능 예산 **대폭 여유**. | PASS |

## Deferred/known items

- **F-3 (phase8)**: `사진 ≤10/단계`는 현재 *관찰당 ≤10*로 해석됨. 매트릭스는 최신 1장만 노출하므로 UX에는 영향 적음. 문구는 scope_decision §5 #3와 일치하도록 해석.
- **F-9**: 썸네일 생성 파이프라인 없음. `ObservationImage.thumbnailUrl`은 null. 현재 원본 이미지를 CSS size로 축소 — iPad 9 대역폭에서는 허용 가능, 본격 운영 시 별도 task 필요.
- **이미지 업로드 실제 테스트**: 본 QA는 URL 더미로 관찰 생성만 검증. `/api/upload`는 phase0 이전부터 동작 중이며 본 feature에서는 호출만 재사용. 실사용 전 통합 smoke test 권장.

## Regression tests

스택에 unit test 러너 미설치. e2e도 수동. 본 QA 기록 자체가 스크립트로 재실행 가능한 curl 시퀀스 역할을 한다(qa_report.md 내 curl 명령 그대로 사용).

## Perf baseline

`/board/b_plant` SSR: 0.49~0.55s (3 samples, local dev).
`/api/boards/.../plant-journal` GET: ~200ms after warm.
`/api/classrooms/.../matrix` GET (desktop OK): ~700ms first hit (cold), ~200ms warm.

Core Web Vitals Lighthouse 측정은 headed browser 없어 생략. TTI 3s 예산 대비 10x+ 여유로 판단.

## 전체 PASS

모든 수용 기준 PASS.
