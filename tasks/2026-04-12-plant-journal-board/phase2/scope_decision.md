# Scope Decision — plant-journal-board

## 1. 선택한 UX 패턴

`ux_patterns.json`에서 다음 6개 패턴을 모두 채택한다. 각 패턴은 서로 다른 뷰에 배정되어 중복이 없다.

| 패턴 ID | 뷰 배정 | 근거 |
|---|---|---|
| `subway_line_progress` | 학생 노선도 메인 | research_pack §"Benchmark 3" — 10단계 선형 성장을 한 화면에 요약하는 가장 직관적 은유 |
| `station_node_tap` | 학생 노선도 상세 시트 | 페이지 전환 없이 학생 컨텍스트 유지 |
| `card_move_declaration` | "다음 단계로" 버튼 | 자기 관찰을 명시적으로 강제 |
| `no_photo_reason_modal` | 사진 없음 예외 흐름 | 교육 목표 — 관찰 부재 원인을 학생이 성찰 |
| `teacher_grid_summary` | 교사 요약 뷰 | 분포 badge + 정체 경고 조합 |
| `thumbnail_matrix` | 교사 매트릭스 뷰 | desktop+owner 전용, 썸네일 밀집 스캔 |

경쟁 패턴(`stage_columns`, `journal_feed`)은 탈락:
- `stage_columns`(Kanban 열)는 되돌리기 은유가 섞여 "자기 선언 일방 진행" 규칙과 충돌
- `journal_feed`(세로 피드)는 단계 구조를 시각화하지 못함

## 2. MVP 범위

### 포함 (IN)
- **PJ-1**: `PlantSpecies`, `PlantStage`, `ClassroomPlantAllow`, `StudentPlant`, `PlantObservation`, `PlantObservationImage` 6개 모델 + Board.layout = "plant-roadmap" 옵션 추가. seed 스크립트로 10종 카탈로그 로드.
- **PJ-2**: 학생 식물 선택(radio) + 별명(≤20자) 저장, 교사 allow-list UI(체크박스 다중 선택).
- **PJ-3**: 학생 노선도 뷰 — SVG 가로 수평 노선, 현재 단계 하이라이트, 노드 tap → 상세 시트(관찰 포인트 질문 + 본인 사진/메모), "다음 단계로" 버튼 + 사진 미첨부 사유 모달.
- **PJ-4**: 관찰 추가/수정 — 다중 사진 업로드(≤10장) + 메모(≤500자) + 선택적 사유. 기존 `/api/upload` 재사용.
- **PJ-5**: 교사 요약 뷰 — 단계별 학생 수 badge 바 + 학생 list(이름/종/현재단계/최근관찰일) + 7일 무활동 경고.
- **PJ-6**: 교사 매트릭스 뷰 — rows=stages, cols=students, cells=썸네일. owner+desktop(viewport≥1024) 전용, 그 외는 403. 칼럼 가상화(window 기반).

### 제외 (OUT)
- **실시간 동기화** (후속 research task — 솔로 MVP에서 과잉)
- **단계 되돌리기** (UX 원칙상 의도적 배제, 필요 시 다음 release)
- **관찰 코멘트/좋아요** (다음 release 검토)
- **수학적 성장 지표** (예: 키, 잎 수 자동 인식) — OUT. 사진 + 메모만.
- **PDF 일괄 출력** (이미 `export/` 라우트 존재 — 이번 feature는 뷰까지만)
- **태블릿용 교사 매트릭스 뷰** — OUT, 의도적(iPad에선 cell이 너무 작음)

## 3. 수용 기준 (Acceptance Criteria)

1. 학생으로 로그인해 `/board/{id}` (layout=plant-roadmap) 접근 시, 아직 식물을 선택하지 않았으면 **식물 선택 화면**이 뜨고, 선택하지 않은 채 노선도로 갈 수 없다.
2. 식물 1종 선택 + 별명 1~20자 입력 후 "시작" 클릭 → DB에 `StudentPlant` 1 row 생성되고 노선도 뷰로 전환된다.
3. 노선도 뷰에서 현재 단계 노드에 active 스타일이 적용되고, 현재 단계 이전 노드는 visited, 이후 노드는 upcoming 스타일이다.
4. 현재 단계 노드 tap → 하단 시트에 관찰 포인트(≥3개) + 본인 사진 썸네일 목록 + 메모 + "관찰 추가" 버튼이 렌더된다.
5. "관찰 추가"에서 사진 ≤10장(11번째는 클라+서버 모두 거부), 메모 ≤500자로 submit → `POST /api/student-plants/{id}/observations`가 201을 반환하고 하단 시트에 즉시 반영된다.
6. "다음 단계로" 버튼 클릭 시: 현재 단계에 관찰 사진이 0이면 **사유 모달**이 떠야 하고, 사유 없이 진행을 거부한다. 사진이 있거나 사유 입력 시 다음 단계로 진입한다.
7. 본인 관찰만 수정/삭제 가능: 타 학생 관찰에 대한 `PATCH/DELETE` 요청은 403.
8. 교사(owner) 요약 뷰에서 반 학생 수(seed = 3명 가정) × 단계별 분포 badge가 정확히 렌더되며, 7일+ 무활동 학생은 "정체" 경고 뱃지가 붙는다.
9. 교사 매트릭스 뷰는 owner + viewport width ≥ 1024px 조건 외에서 HTTP 403 응답을 반환한다 (editor/viewer/student 세션 혹은 viewport<1024).
10. 학생 노선도 뷰의 초기 로드 TTI가 로컬 dev 기준 3초 이하이며, Core Web Vitals Lighthouse(모바일 throttle) LCP ≤ 3.0s.

## 4. 스코프 결정 모드

**Selective Expansion** — PJ-1~6은 큰 묶음이지만 각 phase가 이미 잘 분할돼 있고, 핵심 데이터 모델 + 6개 뷰로 완결된 MVP. Non-MVP(실시간/되돌리기/AI성장분석)는 명시적으로 잘라 다음 릴리즈로 미룸.

## 5. 위험 요소

| 리스크 | 발생 조건 | 완화 |
|---|---|---|
| **iPad 9 성능** | 학생 뷰 초기 렌더 사진 30장+ | 썸네일만 로드(≤200px), IntersectionObserver lazy, 원본은 모달 |
| **동시 편집 충돌** | 학생이 여러 탭에서 같은 단계 편집 | 낙관적 UI + 서버 응답으로 교정, 409는 toast |
| **업로드 실패 롤백** | 10장 중 5장 업로드 후 네트워크 끊김 | observation row 트랜잭션 내 순차 업로드, 실패 시 전체 롤백(already-uploaded 파일은 cleanup cron 외주) |
| **단계 역행 수요** | 학생이 "실수했어요" 요구 | MVP OUT. 교사에게 "재시작" 버튼 OUT; 명시적으로 **재시작 = 별명 변경 + 같은 식물 재선택** 요구로 대체 |
| **매트릭스 뷰 렌더 폭주** | 30명 × 10단계 × 10사진 = 3,000 썸네일 | 학생당 가장 최근 사진 1장만 매트릭스에 표시, 나머지는 모달; 칼럼 가상화 |
| **권한 enforce 누락** | API 레벨에서 student vs user 인증 혼용 | 모든 신규 라우트에서 `getCurrentUser()` + `getCurrentStudent()` 둘 다 검사 + RBAC 결정 순서 명시 |
| **이미지 스토리지 비용** | 로컬 `public/uploads` 계속 누적 | 기존 업로드 경로 재사용, cloud 이전은 후속 research task |
