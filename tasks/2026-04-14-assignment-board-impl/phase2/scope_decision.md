# Scope Decision — assignment-board

- **task_id**: `2026-04-14-assignment-board-impl`
- **parent seed**: `seed_38c34e91bf28` (ambiguity 0.083)
- **mode**: **Selective Expansion** — seed는 14 AC + 18 constraints를 이미 합의. phase2는 seed 범위 안에서 **v1 필수 vs 후속**을 재확인하고, phase1에서 flag된 B1~B8 blocker에 defensible 결정을 주입한다. 범위 확장 없음.

---

## 1. 선택한 UX 패턴

### 1.1 핵심 패턴 (고정 — seed §north_star + decisions §1)
Ideation phase1(`../ideation/tasks/.../phase1/exploration.md`) 6종 벤치마크(Classroom · Teams · Seesaw · Canvas · Moodle · Padlet)에서 도출된 **5 primitive** 채택:

| # | 패턴 | 채택 이유 (출처) |
|---|---|---|
| 1 | 로스터 기반 자동 카드 인스턴스화 | Seesaw "Activity" 자동 배포 레퍼런스. Padlet 기본 post 방식은 교사 수동 대조 필요 → 본 요구의 페인포인트 직접 해결 (MANIFEST.md §Motivation). |
| 2 | Seesaw 썸네일 + Moodle 이진 뱃지 하이브리드 | 썸네일 = 제출 내용 즉시 판별 / 뱃지 = 제출 여부 bulk scan 동시 충족. |
| 3 | 풀스크린 모달(사이드 패널 없음) | 태블릿 세로폭 제약 (galaxy tab S6 Lite 1200×2000 세로). decisions §Q7 근거. |
| 4 | owner-top 가이드 + 하단 격자 2섹션 | Classroom 투페인 레이아웃 단순화 버전. |
| 5 | Student.number 5×6 결정적 격자 | decisions §Q3(N≤30) + Q6(snapshot). 자리 기억 인지모델 보전. |

### 1.2 UX 패턴 매칭 (phase1 research.md §10)
기존 Breakout(`src/app/api/boards/route.ts:42-149`) 단일 트랜잭션 보드+엔티티 생성 패턴을 **AssignmentSlot 대량 INSERT**에 준용. UX 연속성 확보.

---

## 2. MVP 범위

### 2.1 IN (v1 필수)

**데이터 모델**
- [IN-D1] `AssignmentSlot` 신규 엔티티 (id, boardId, studentId, slotNumber, cardId, submissionStatus, gradingStatus, viewedAt, returnedAt, returnReason).
- [IN-D2] `Board` 필드 추가: `assignmentGuideText String? @default("")`, `assignmentAllowLate Boolean @default(true)`.
- [IN-D3] `Submission.assignmentSlotId String? @unique` nullable FK (Blocker B7 해소).
- [IN-D4] Prisma migration (신규) + AssignmentSlot 인덱스 `@@unique([boardId, studentId])`, `@@unique([boardId, slotNumber])`, `@@index([studentId])`.

**API**
- [IN-A1] `POST /api/boards` `layout="assignment"` 브랜치 확장: classroom 전원(N≤30) AssignmentSlot + 빈 Card 자동 생성 트랜잭션.
- [IN-A2] `GET /api/boards/[id]/assignment-slots` — slots+student+card projection.
- [IN-A3] `PATCH /api/assignment-slots/[id]` — 교사 전이: `viewed`(auto on modal open), `returned`(with returnReason ≤200), `reviewed`.
- [IN-A4] `POST /api/assignment-slots/[id]/submission` — 학생 제출/재제출: gradingStatus gating 포함.
- [IN-A5] `POST /api/boards/[id]/reminder` — 미제출 학생 in-app 뱃지 bulk 발급 (무-이메일).
- [IN-A6] `/api/parent/children/[id]/assignments` 기존 라우트를 AssignmentSlot-aware하게 확장 (own student scope).

**UI / 라우트**
- [IN-U1] `/board/[id]` layout=assignment 분기: 상단 `assignmentGuideText` 표시(owner only) + 하단 5×6 격자.
- [IN-U2] 풀스크린 모달 — 제출 검토·반려·returnReason 입력 유일 surface.
- [IN-U3] 학생 화면 = 자기 slot 1개만 + 반려 배너.
- [IN-U4] `/parent/child/[id]/assignment` — 자녀 slot 1개만 read-only.
- [IN-U5] 썸네일 160×120 WebP + lazy + IntersectionObserver (next/image + sharp preprocess).

**권한 / 보안**
- [IN-S1] Teacher = Classroom.teacherId 조인. Student = student-auth + AssignmentSlot.studentId 조인. Parent = parent-scope.ts 재사용. **BoardMember.role=editor 학생용 행 생성 금지** (identity-based).
- [IN-S2] 3-레이어 격리: API guard(requirePermission 변형 + student-auth) + DOM filtering(학생은 자기 slot만 서버 렌더) + RLS scaffold-only (PV-12 패턴).
- [IN-S3] AssignmentSlot.studentId 기반 cross-student read 거부 (403).

**실시간**
- [IN-R1] `assignmentChannelKey(boardId)` helper 추가. `publish()` 호출부 선언은 작성하되 engine-미정으로 no-op. v1 UX = `router.refresh()` + optimistic local state. (Blocker B3 결정)

**성능 (Galaxy Tab S6 Lite)**
- [IN-P1] DOM ≤180 (30 카드 × 6 자식), 썸네일 160×120 WebP, `loading="lazy"`, CSS 상태 토글.
- [IN-P2] S-Pen: 카드 표면 터치 비활성(CSS `touch-action: none` + onClick만). 모달 내부는 정상.
- [IN-P3] Matrix/grid 뷰 owner+desktop 전용(media query `(min-width:1024px)` + role guard).

### 2.2 OUT (후속 task)

| # | 항목 | 제외 사유 | 후속 task 예정 |
|---|---|---|---|
| OUT-1 | SubmissionHistory 엔티티 | overwrite + updatedAt으로 v1 충분 (decisions §Q2) | v2 research 선행 |
| OUT-2 | 5×8 / N>40 격자 | 자리기억 UX 파괴 + 스키마 가변화 비용 (decisions §Q3) | v2 |
| OUT-3 | 갤러리 모드 (학생 간 열람) | 아동보호·RLS 4중화 리스크 (decisions §Q5) | v2 research 선행 필수 |
| OUT-4 | 풀 코멘트 시스템 (스레드·멘션) | 1줄 returnReason으로 하한선 확보 | v2 |
| OUT-5 | Roster 자동 동기화 (Student CRUD 트리거) | 수동 버튼으로 v1 진행, Q6 근거 | v2 |
| OUT-6 | 학부모 이메일 리마인더 | 기존 parent-viewer-roadmap §1.3 분리된 컨텍스트 (decisions §Q4) | parent-viewer 내부 별도 task |
| OUT-7 | **Canva 통합 (과제 PDF 병합, 과제 카드 in Canva publish)** | MANIFEST §canva-assignment-pdf-merge 참조. v1은 Canva 시너지 **opt-in 보드(일반 assignment)만 지원**하고 Canva 디자인 publish 연동은 후속. | `canva-assignment-pdf-merge` 별 task |
| OUT-8 | Matrix 뷰 모바일·태블릿 개방 | 영구 금지 (메모리 `project_matrix_view_desktop_only`) | 영구 OUT |
| OUT-9 | 실시간 engine 도입 | `docs/architecture.md` §Realtime 별 research task | `research/realtime-engine` task |
| OUT-10 | Return action bulk | 건별 판단 UX + Q4 reminder와 분리 (decisions §Q7) | v2 |

---

## 3. 수용 기준 (Acceptance Criteria)

Seed `acceptance_criteria` 14개를 자동 검증 가능한 형태로 구체화. phase9 QA가 전수 PASS 확인.

- **AC-1** 교사가 `POST /api/boards {layout:"assignment", classroomId}`로 N≤30 학생 classroom에 대해 호출 시, 응답 200에 AssignmentSlot 개수 = N이고 `slotNumber`가 `Student.number ASC`로 고정.
- **AC-2** N>30인 classroom은 400 `{"error":"classroom_too_large","max":30}` 반환 — 보드·슬롯 미생성.
- **AC-3** 교사 `/board/[id]` 화면: 상단 `assignmentGuideText` 섹션 + 하단 `grid-template-columns: repeat(5, minmax(0,1fr))` 격자(6행). 각 slot은 submitted/unsubmitted CSS 구분(썸네일 유무 + 뱃지 색).
- **AC-4** 카드 클릭 → 풀스크린 모달(`position:fixed; inset:0`) 1종만 오픈. 사이드 패널 DOM 미존재. `role="dialog"` + ESC 닫기.
- **AC-5** 교사 `returned` 액션은 모달 내부 버튼 클릭 + `returnReason` 입력(1~200자) 후에만 가능. 격자 뷰 우클릭/롱탭 컨텍스트 메뉴 없음.
- **AC-6** `submissionStatus` 전이 표 100% 일치:
  - `assigned → submitted` (학생 제출)
  - `submitted → viewed` (교사 모달 첫 오픈, viewedAt stamp)
  - `viewed → returned` (`returnReason` 필수)
  - `returned → submitted` (학생 재제출)
  - `viewed → reviewed` (교사 완료)
  - 학생 삭제 시 `orphaned` (single shot)
- **AC-7** `gradingStatus` 게이팅:
  - `not_graded` + deadline 이전 → 학생 편집 허용 (in-place overwrite, Submission.updatedAt 갱신)
  - `not_graded` + deadline 이후 + `assignmentAllowLate=true` → 허용
  - `not_graded` + deadline 이후 + `assignmentAllowLate=false` → 학생 편집 버튼 `disabled`
  - `graded` | `released` → 편집 버튼 `disabled`
  - `returned` → 재개방
- **AC-8** 학생 재진입 시 `returnReason`이 모달 상단 고정 배너(`.assign-return-banner`)로 표시. 빈 배너 금지 (returnReason null 상태로는 `returned` 진입 불가, AC-5와 일관).
- **AC-9** 격자 뷰의 `returned` 상태 slot은 "!" 뱃지 표시(`.assign-card-badge--returned`).
- **AC-10** 학생 A가 학생 B의 `/api/assignment-slots/[B-slot-id]` 또는 렌더 HTML을 요청하면 403. DOM 레벨에서 학생 화면에 B의 slot 마크업 0개.
- **AC-11** 미제출 reminder: `POST /api/boards/[id]/reminder` → 대상 학생 N명에 in-app 뱃지 생성. 이메일 outbound 0회.
- **AC-12** 썸네일 응답 `Content-Type: image/webp`, 해상도 `160×120`, `<img>` 또는 `next/image` `loading="lazy"` attribute 존재.
- **AC-13** Matrix/grid 뷰는 `/board/[id]` 쿼리 `?view=matrix` (owner + desktop only). 학생/학부모/태블릿(<1024px) 접근 시 403 또는 default grid로 리다이렉트.
- **AC-14** **Galaxy Tab S6 Lite 성능 예산**: 30-slot 보드에서 DOM node count ≤ 180(phase9 DevTools Elements count), 초기 TTI ≤ 3000ms(Lighthouse mobile · 3G throttle 없음), 스크롤 프레임레이트 ≥ 45fps(DevTools Performance trace 5초 스크롤).

---

## 4. 스코프 결정 모드

**Selective Expansion** — seed가 이미 14 AC를 합의했으므로 새로운 범위 증가는 금지. 본 phase는 phase1 blocker B1~B8에 defensible default를 확정하고, 위 AC 14를 QA-검증 가능한 형태로 재-표현한다.

### 4.1 Blocker → Decision 확정

| # | Blocker | 결정 |
|---|---|---|
| B1 | `orphaned` enum | **포함**. `AssignmentSlot.submissionStatus` 6값 final: `assigned/submitted/viewed/returned/reviewed/orphaned`. |
| B2 | returnReason 저장처 | **`AssignmentSlot.returnReason String?`** 신규 컬럼. Submission.feedback은 event-signup과 공유하므로 침범 안 함. |
| B3 | realtime transport | **v1 no-op + router.refresh()**. channel key만 helper 추가. |
| B4 | 썸네일 파이프라인 | **sharp in `src/lib/blob.ts`** — 업로드 시점 `_thumb_160x120.webp` 이중 저장. 기존 `@vercel/blob.put` 호출 주변에 sharp 리사이즈 추가. |
| B5 | AssignmentSlot.cardId | **프리페칭**. 보드 생성 트랜잭션이 빈 Card 동시 생성. |
| B6 | BoardMember.role=editor 학생 행 | **생성 금지**. owner=teacher 1행만. |
| B7 | Submission↔Slot 연결 | **`Submission.assignmentSlotId` nullable FK**. |
| B8 | N>30 UX | **400 classroom_too_large**. 프론트에서 "분반 또는 학생 수 줄이기" 안내. |

---

## 5. 위험 요소

### 5.1 성능 리스크
- **R1 DOM 초과**: 현 assign-card 내부 자식 4개 + 썸네일 추가 → 6개 근접. "피드백 코멘트 소수", "하단 미니 meta" 등 추가 금지 (CSS attribute로 해결). 초과 시 phase9 재설계.
- **R2 이미지 메모리 피크**: 30 × 160×120 WebP ≈ 600KB decode. 탭 S6 Lite 500MB 예산 내. 단 전면 렌더 시 initial paint 지연 가능 → IntersectionObserver 필수(`OptimizedImage` 기본).
- **R3 sharp cold start**: Vercel Function cold start 시 sharp 로드 ~200ms. 업로드 경로에만 있으므로 초기 보드 렌더와 독립.

### 5.2 데이터 무결성 리스크
- **R4 Student 삭제 race**: 학생이 제출 직후 교사가 delete → AssignmentSlot FK `onDelete: SetNull` 대신 `Restrict` 선택 후 soft delete(`submissionStatus="orphaned"`)로 처리. 하드 삭제 금지 마이그레이션 정책.
- **R5 slotNumber snapshot 붕괴**: Q6 결정에 따라 slot.slotNumber는 생성 시점 값 고정. Student.number 변경은 slot에 반영 안 됨 — UI에 "번호 snapshot — 현재 번호와 다를 수 있음" 툴팁 고려(phase4).
- **R6 재제출 중 교사가 `returned`**: 학생이 편집 중일 때 교사가 먼저 `returned` → optimistic UI 충돌. 서버는 `If-Match: gradingStatus=not_graded` 낙관잠금 대신 **마지막 기록 수용** 정책 + UI 토스트 "방금 반려된 과제입니다. 반려 사유를 확인하세요"로 해결(v1 단순화).

### 5.3 보안 리스크
- **R7 학생 cross-read**: `/api/assignment-slots/[id]`를 다른 학생 slot-id로 호출. 3-레이어 중 API 층에서 `slot.studentId === currentStudent.id` 강제. RLS scaffold는 보조.
- **R8 `returnReason` XSS**: 200자 텍스트. 렌더 시 React 기본 escape로 충분. 링크화 금지.
- **R9 Matrix 뷰 권한 우회**: `?view=matrix` 쿼리 스트링만 체크하면 우회 쉬움. 서버 guard에서 `role=owner && userAgent desktop` 2중 체크.

### 5.4 동시성 리스크
- **R10 보드 생성 중 roster 변경**: `POST /api/boards` 트랜잭션 내 `SELECT … FOR UPDATE` 불가(Prisma) → Classroom→Student snapshot을 트랜잭션 시작 시 1회 읽고, 생성 후 classroom에 학생 추가되면 별도 "roster 동기화" 버튼(수동) 사용. decisions §Q6.

### 5.5 UX 리스크
- **R11 "assigned" vs "unsubmitted" 용어 혼동**: 초기 상태 = `assigned`는 "교사가 배포함" 의미이고 학생 입장에선 "아직 제출 안 함"과 혼동 가능. UI 레이블은 `assigned`를 `"미제출"` 한국어로, submitted → "제출됨", reviewed → "확인됨", returned → "반려" (기존 AssignmentBoard.tsx:92-96 레이블 재사용).
- **R12 educator cognitive load**: 30개 slot 전체 모달 순회 피로 → "다음 slot" 버튼을 모달에 배치 (phase4 design_planner).

### 5.6 롤백 리스크
- **R13 마이그레이션 되돌리기**: AssignmentSlot drop + Board.assignmentGuideText/AllowLate drop + Submission.assignmentSlotId drop 필요. 운영 중 롤백 시 slot별 저장된 returnReason·viewedAt·returnedAt 유실. 완전 롤백은 데이터 손실 감수 — phase3 롤백 계획에 명기.

---

## 6. 산출

- `phase2/scope_decision.md` (이 문서)
- 다음 phase 입력: phase0/seed.yaml + phase0/request.json + phase1/research.md + phase2/scope_decision.md

## 7. Phase 2 판정

**PASS** — AC 14개(≥3 기준 초과) + IN/OUT 명시(총 19 IN + 10 OUT) + 6영역 리스크 분석(R1~R13) + phase1 B1~B8 blocker 결정 주입. 재실행 불필요.
