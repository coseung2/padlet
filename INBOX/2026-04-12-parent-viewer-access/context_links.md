# Context Links — 2026-04-12-parent-viewer-access

canva project 내 관련 문서의 상대 경로 지도. padlet 소비자는 본 목록을 복사하여 필요 시 `../canva project/{path}` 형태로 직접 참조한다.

## Seed 7 SSOT

- `plans/parent-viewer-roadmap.md` — **본 Seed의 단일 진실 원천(SSOT)**. §0~§11 확정 결정·Prisma 4종 스키마·§5 자녀 범위 cross-cutting 매트릭스·PV-1~PV-12 작업 분할 포함. 다른 feature 로드맵과의 정의 불일치 시 본 문서가 정본.

## Cross-cutting 연관 Seed 로드맵 4종

본 Seed 7은 아래 4개 기존 Seed의 "학부모 열람 범위" 절을 cross-cutting 매트릭스로 통합한다. §5 매트릭스 변경 시 아래 로드맵의 해당 절도 동기화 교정해야 한다 (반대 방향 금지).

- `plans/drawing-board-library-roadmap.md` — **Seed 1 (그림 라이브러리)**. StudentAsset `studentId ∈ parent.children` 필터, presigned 썸네일 URL, isPrivate 무관 전체 열람 원칙.
- `plans/plant-journal-roadmap.md` — **Seed 4 (식물관찰일지)**. §3.4 학부모 뷰 PJ-8이 Seed 7로 이관됨. PlantObservation 행이 §5 매트릭스의 primary entry.
- `plans/event-signup-roadmap.md` — **Seed 3 (행사 신청)**. EventBoard는 classroomId 기준 조회 허용하되 타 학생 EventSignup 레코드는 응답에서 제거. 자녀 본인 Submission·피드백만 표시, 참가자 명단·득점 마스킹.
- `plans/breakout-room-roadmap.md` — **Seed 6 (Breakout)**. §8 학부모 열람 범위: BreakoutMembership 필터, teacher-pool 제외, `session.studentId ∈ parent.children` 검증 후 반환, 자녀 모둠 한정.

## 공통 제약 로드맵

- `plans/tablet-performance-roadmap.md` — **성능 예산 SSOT**. 스마트폰 PWA 320~430px / 갤럭시 탭 S6 Lite 공통 TTI(<2s LTE, <3s 3G), first viewport <500KB, thumbnail <200KB 예산. Seed 7 `/parent/*` 라우트는 본 예산을 무조건 승계.

## 메타 인덱스

- `plans/seeds-index.md` — **Seed 7 등록 및 cross-cutting 의존성 맥락**. Seed 1·3·4·6과의 위치 관계, ambiguity·상태·승계 관계를 한눈에 확인.
- `plans/phase0-requests.md` — **PV-1~PV-12 padlet 진입 JSON 블록 원본**. padlet feature 파이프라인에 투입할 request 블록 12개가 직렬화되어 있음. request.json은 이 중 Seed 7 전체 진입점의 축약본.
- `plans/implementation-roadmap.md` — 전체 implementation 맥락(참조용).

## 작업 산출물 경로 (canva project tasks)

- `tasks/2026-04-12-parent-viewer-access/phase0/request.json` — 최초 ideation request
- `tasks/2026-04-12-parent-viewer-access/phase1/` — exploration (하이브리드 전제 도출)
- `tasks/2026-04-12-parent-viewer-access/phase2/sketch.md` — 7개 미결 질문 원본 및 phase1 확정 전제
- `tasks/2026-04-12-parent-viewer-access/phase3/decisions.md` — 미결 7 + 파생 8 + 보충 2 = 17건 해소 (ambiguity 0.15 통과)
- `tasks/2026-04-12-parent-viewer-access/phase4/seed.yaml` — Seed 7 명세 전문 (seed_id: seed_37b35654542f)
- `tasks/2026-04-12-parent-viewer-access/phase5/updated_docs.md` — 기존 문서 반영 결과
- `tasks/2026-04-12-parent-viewer-access/phase5/new_docs.md` — 신규 생성 문서 (parent-viewer-roadmap.md 등)
- `tasks/2026-04-12-parent-viewer-access/phase6/padlet_phase0_request.json` — padlet feature phase0 포맷 (본 INBOX의 request.json 원본)
- `tasks/2026-04-12-parent-viewer-access/phase6/handoff_note.md` — 핸드오프 가이드 (본 INBOX의 handoff_note.md 원본)

## 보조 참조 (memory)

- `memory/project_matrix_desktop_only.md` — BoardMember.role="parent" 확장 결정 메모 (Seed 7 이전 임시 보관지)
