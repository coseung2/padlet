# Architecture — assignment-board

- **task_id**: `2026-04-14-assignment-board-impl`
- **mode**: Selective Expansion (phase2 결정)
- **input**: phase0 seed + request + phase1 research + phase2 scope_decision

> **This is `design_doc.md`의 확장판.** phase3 standard contract(`prompts/feature/phase3_architect.md`)의 7 섹션을 모두 포함하고, 데이터/API 상세는 `data_model.md`·`api_contract.md`로 분리.

---

## 1. 데이터 모델 변경

상세 Prisma DSL은 `data_model.md` 참조. 요약:

| 대상 | 변경 |
|---|---|
| `Board` | **ALTER**: `assignmentGuideText String? @default("")`, `assignmentAllowLate Boolean @default(true)`, `assignmentDeadline DateTime?` 3컬럼 추가 |
| `AssignmentSlot` | **NEW**: 10 필드 + 3 인덱스 |
| `Submission` | **ALTER**: `assignmentSlotId String? @unique` 추가 (nullable FK) |
| `Card` | 변경 없음 — 기존 `studentAuthorId`, `x/y/width/height` 재활용 |

### 1.1 마이그레이션 전략
- 신규 디렉토리: `prisma/migrations/20260414_add_assignment_slot/`
  - `migration.sql` — CREATE TABLE + ALTER TABLE 3건 + CREATE INDEX
  - `rls.sql` — scaffold only (PV-12 패턴; NOT auto-applied)
- 기존 데이터 보전: Board 신규 컬럼 모두 default 있음 → 기존 행 자동 채움. Submission.assignmentSlotId는 nullable 기본 NULL.
- **비파괴 마이그레이션** — `prisma db push --force-reset` 금지 (user memory `feedback_no_destructive_db`). `prisma migrate dev --name add_assignment_slot`만 사용.
- Canva/parent/role-cleanup 동시작업과의 파일 충돌 없음 (신규 마이그레이션 디렉토리만 추가).

### 1.2 AssignmentSlot 엔티티 설계 tradeoff

| 옵션 | 채택 여부 | 사유 |
|---|---|---|
| slot.cardId NOT NULL + 보드 생성 시 빈 Card 프리페칭 | **CHOSEN** | 렌더 시 join 1회(slot→card). UI는 빈 content를 unsubmitted로 인식. B5 결정. |
| slot.cardId NULL + 제출 시 Card 생성 | 거부 | 격자 렌더 시 slot에 null check 분기 증가 + 제출 race 시 동시 2 Card 생성 가능 |
| slot = JSON on Board | 거부 | 제출 상태 실시간 갱신 시 전체 JSON 재작성. 인덱스 불가. |

### 1.3 deterministic slot ordering
- 보드 생성 시: `classroom.students orderBy: [{ number: "asc" }, { createdAt: "asc" }]`로 정렬 후 0..N-1 루프. slot.slotNumber = student.number(snapshot). student.number null이면 400 `student_missing_number` 반환(v1 가드).
- 격자 렌더 시: `slots orderBy: { slotNumber: "asc" }` + CSS grid `grid-area: span 1 / span 1`로 자동 흐름. 5×6 배치는 `grid-template-columns: repeat(5, minmax(0,1fr))` + 30 slot row-fill.
- student.number 변경 시: slot.slotNumber 불변(Q6). 롤 동기화 버튼(phase4 UI)에서 신규 학생 추가 시 `slotNumber = max(existing) + 1` 규칙.

### 1.4 grading status transition machine

정적 표 (API+UI 양쪽에서 참조):

```
submissionStatus:
  assigned  (initial)
  submitted (student action)
  viewed    (teacher modal open — auto)
  returned  (teacher action — requires returnReason)
  reviewed  (teacher action — terminal-ish)
  orphaned  (Student soft-delete)

gradingStatus:
  not_graded (initial)
  graded     (teacher sets grade inside modal)
  released   (teacher explicitly publishes)
```

**Allowed transitions** (enforced server-side `src/lib/assignment-state.ts`, 신규):

| from (submissionStatus) | to | actor | guard |
|---|---|---|---|
| assigned | submitted | student | gradingStatus ∈ {not_graded, returned} AND (deadline OK OR assignmentAllowLate=true) |
| submitted | viewed | teacher | modal open — auto PATCH `viewedAt` |
| viewed | returned | teacher | returnReason 1..200 chars MANDATORY; sets gradingStatus=not_graded |
| returned | submitted | student | AC-7 재제출 경로 |
| viewed | reviewed | teacher | — |
| any | orphaned | system | Student soft-delete cascade |

### 1.5 AC (seed) 14개 → 스키마/API 매핑 격자

| seed AC | 해결 surface |
|---|---|
| AC-1 auto-instantiate N≤30 | `/api/boards` POST trx + `AssignmentSlot` |
| AC-2 visual distinction | `AssignmentSlot.submissionStatus` + Card.imageUrl thumb |
| AC-3 modal-only interaction | `/board/[id]` client component — `AssignmentModal` |
| AC-4 guide top + grid bottom | `Board.assignmentGuideText` + server-rendered sections |
| AC-5 status transitions | `src/lib/assignment-state.ts` state machine |
| AC-6 grading gates re-sub | state machine + `gradingStatus` |
| AC-7 return mandatory + ≤200 | zod `z.string().min(1).max(200)` + `AssignmentSlot.returnReason` |
| AC-8 returnReason banner | client component reads `slot.returnReason` |
| AC-9 "!" badge in grid | CSS attr `[data-status="returned"]::after` |
| AC-10 cross-student blocked | 3-layer: API guard + server-filter + RLS scaffold |
| AC-11 in-app reminder | `POST /api/boards/[id]/reminder` + existing badge system |
| AC-12 160×120 WebP lazy | `src/lib/blob.ts` + sharp + OptimizedImage |
| AC-13 allowLate flag | `Board.assignmentAllowLate` + state guard |
| AC-14 matrix desktop only | server guard + CSS media query |

---

## 2. API 변경

상세 스펙은 `api_contract.md` 참조. 요약 (신규 엔드포인트 ★):

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/boards` | 기존. `layout=assignment` 브랜치 **확장** — classroom roster snapshot + trx. |
| ★ GET | `/api/boards/[id]/assignment-slots` | slot+student+card projection (owner/student/parent scope별 필터) |
| ★ PATCH | `/api/assignment-slots/[id]` | 교사 전이 (viewed/returned/reviewed, gradingStatus) |
| ★ POST | `/api/assignment-slots/[id]/submission` | 학생 제출/재제출 |
| ★ POST | `/api/boards/[id]/reminder` | 미제출 학생 bulk in-app 뱃지 |
| ★ POST | `/api/boards/[id]/roster-sync` | 수동 roster 동기화 (신규 student 추가) |
| PATCH | `/api/parent/children/[id]/assignments` | 기존 확장 — AssignmentSlot 우선 조인 |

### 2.1 WebSocket 채널 계약

- 채널 key: **`board:${boardId}:assignment`** (신규 helper `assignmentChannelKey(boardId)` in `src/lib/realtime.ts`)
- 메시지 타입 (최소 3종):
  ```ts
  type AssignmentRealtimeEvent =
    | { type: "slot.updated"; slotId: string; submissionStatus: string; gradingStatus: string; updatedAt: string }
    | { type: "slot.returned"; slotId: string; returnReason: string; returnedAt: string }
    | { type: "reminder.issued"; boardId: string; studentIds: string[] }
  ```
- **v1 transport**: `publish()` no-op 유지 (`src/lib/realtime.ts:42` 기존 동작). API 라우트는 선언적으로 publish 호출 포함 → 실 engine 도입 시 1-point 교체.
- 수신 측 v1 fallback: 학생은 본인 페이지 `router.refresh()` (submit 직후). 교사는 슬롯 변경 후 `router.refresh()` + optimistic local state. polling 안 함.

### 2.2 Delivery 보장
- v1: **at-most-once, no guarantee.** 메시지 유실은 router.refresh()로 복구. phase9 성능 측정에 반영.

---

## 3. 컴포넌트 변경

### 3.1 컴포넌트 트리 (신규/수정)

```
/board/[id] (server, existing)
└── <AssignmentBoardShell> (server, NEW — replaces current AssignmentBoard flow)
    ├── <AssignmentGuideSection> (server, NEW — owner sees edit button)
    ├── <AssignmentGridView> (client, NEW — 5x6 grid; role=owner)
    │   └── <AssignmentSlotCard> (client, NEW — 30 instances)
    │       └── <SlotThumbnail> (client, NEW — OptimizedImage 160x120)
    └── <AssignmentStudentView> (client, NEW — role=student, 1 slot)
        └── <ReturnReasonBanner> (client, NEW — conditional)

(modal, portaled)
<AssignmentFullscreenModal> (client, NEW — SOLE review+return surface)
├── <SubmissionContent> (client — card content + thumb)
├── <ReturnReasonForm> (client — ≤200 char textarea, required)
├── <GradeControl> (client — grade string + release toggle)
└── <SlotNavigator> (client — "next slot" button for teacher)

(parent)
/parent/child/[id]/assignment (server, NEW)
└── <ParentAssignmentView> (server, NEW — read-only, own slot only)
```

### 3.2 기존 컴포넌트 교체 vs 유지

- `src/components/AssignmentBoard.tsx` (215 lines): **rewrite** (같은 파일명 유지로 import 영향 최소). 현 Submission+BoardMember 기반 로직을 AssignmentSlot 기반으로 전면 교체.
- `src/components/SubmissionModals.tsx` (SubmitModal/ViewModal): event-signup도 사용 중 → **가만 두고** assignment용 신규 `AssignmentFullscreenModal` 추가. submission 경로 분기는 컴포넌트 레벨.
- `src/components/ui/SidePanel.tsx`: 사용 금지(AC-4 위반). fullscreen modal 패턴은 `src/styles/modal.css`의 기존 `.modal-backdrop + .modal-content` 재사용 + 신규 `.assign-modal-fullscreen` 변형.

### 3.3 상태 위치
- **Server**: AssignmentSlot+Card+Student+Classroom 최초 쿼리는 server component에서 수행 → 하이드레이션 비용 감소.
- **Client optimistic**: 상태 전이 직후 UI만 낙관 업데이트(`useOptimistic` React 19) → 서버 응답 후 `router.refresh()`.
- **Realtime**: engine 도입 전까지 client state 구독 없음.

---

## 4. 데이터 흐름 다이어그램

### 4.1 보드 생성 (teacher)

```
[Teacher UI "과제 보드 만들기"]
  │
  ▼ POST /api/boards {layout:"assignment", classroomId, title, assignmentGuideText?, assignmentAllowLate?}
[/api/boards POST]
  │ assertTeacherOwnsClassroom(user.id, classroomId)
  │ students = db.student.findMany({ classroomId, orderBy:[number, createdAt] })
  │ if students.length === 0 → 400 empty_classroom
  │ if students.length > 30 → 400 classroom_too_large
  │ if any student.number == null → 400 student_missing_number
  ▼ db.$transaction([
       Board.create({ layout:"assignment", classroomId, assignmentGuideText, assignmentAllowLate, members:{create:{userId,role:"owner"}} }),
       for each student in students:
         Card.create({ boardId, authorId:user.id, studentAuthorId: student.id, externalAuthorName: student.name,
                       x: col*CARD_W, y: row*CARD_H, width: CARD_W, height: CARD_H }),
         AssignmentSlot.create({ boardId, studentId: student.id, slotNumber: student.number, cardId: card.id,
                                 submissionStatus:"assigned", gradingStatus:"not_graded" })
     ])
  │
  ▼ 200 { board, slots: N }
  ▼ router.push(`/board/${board.slug}`)
```

### 4.2 학생 제출

```
[Student UI "과제 제출" — mySlot modal]
  │ identity: getCurrentStudent() via HMAC cookie
  │
  ▼ POST /api/assignment-slots/[id]/submission { content, linkUrl?, fileUrl?, imageUrl? }
[API]
  │ slot = findUnique({ id })
  │ guard: slot.studentId === currentStudent.id (401/403 otherwise)
  │ guard: canStudentSubmit(slot, board) — state machine:
  │   deadline OK || board.assignmentAllowLate,
  │   gradingStatus ∈ {not_graded, returned} (or after returned)
  │ update Card (slot.cardId) content/linkUrl/fileUrl/imageUrl → updatedAt
  │ update Submission (upsert by assignmentSlotId) status="submitted"
  │ update slot.submissionStatus: assigned|returned → submitted
  │ if slot.submissionStatus was returned: gradingStatus → not_graded
  │ publish({channel: assignmentChannelKey, type:"slot.updated", …}) // no-op v1
  ▼ 200 { slot }
  ▼ student UI: router.refresh() + optimistic set
```

### 4.3 교사 검토 + 반려

```
[Teacher clicks slot card → fullscreen modal opens]
  │ background: PATCH /api/assignment-slots/[id] { transition:"open" }
  │   → slot.submissionStatus: submitted → viewed; viewedAt = now
  │
  ▼ Teacher reads, clicks "반려" button
  ▼ inline textarea 1..200 chars; submit enables when valid
  ▼ PATCH /api/assignment-slots/[id] { transition:"return", returnReason }
[API]
  │ guard: requireTeacherOwnsBoard(boardId, user.id)
  │ zod: returnReason.min(1).max(200)
  │ slot.submissionStatus: viewed → returned; returnedAt = now; gradingStatus reset to not_graded
  ▼ 200 { slot }
  ▼ student UI next visit: banner shows returnReason
```

---

## 5. 엣지케이스 (≥5)

- **E1 네트워크 단절 중 제출**: 학생이 offline → fetch 실패 → optimistic UI revert + "연결 후 다시 시도" 토스트. IndexedDB 캐시는 v1 OUT.
- **E2 동시 제출 race**: 2 탭(태블릿+휴대전화)에서 동시 POST → Submission.@unique(assignmentSlotId) 제약으로 1건 성공, 2번째 409. UI "다른 기기에서 제출됨".
- **E3 Classroom 빈 로스터**: 학생 0명 → 400 empty_classroom.
- **E4 Student.number 중복 불가 검증 실패**: @@unique([classroomId, number]) DB-레벨 보호. 호출 전 guard에서 null 체크만 추가.
- **E5 대용량 파일 업로드**: `/api/upload` 기존 제약 재사용. 썸네일 생성 실패 시 원본만 유지 + `slot.thumbnailStatus="failed"` 로깅 (메타 필드 추가 없이 Card.imageUrl null로 판정).
- **E6 실시간 끊김**: engine 부재 → 불가. router.refresh() 복구.
- **E7 학생 계정 삭제 도중 재제출**: Soft delete로 `submissionStatus="orphaned"`. 교사 UI는 dimmed.
- **E8 교사 reminder 남용**: 5분당 1회 rate limit (기존 `src/lib/rate-limit.ts` 재사용). 초과 시 429.
- **E9 matrix view 모바일 우회**: `User-Agent` 기반 desktop 감지는 우회 가능 → 서버에서 `role=owner` 체크 + 뷰포트 검증은 client only (UX hint만). OWNER는 모바일에서도 접근 가능하게 할지 phase4 확정 필요 — 일단 seed "owner+desktop only"를 문자 그대로 적용.
- **E10 학부모가 다른 자녀 slot 접근**: `/parent/child/[id]/assignment` - parentScopeForStudent → 자녀 linked 아니면 403.

---

## 6. DX 영향

### 6.1 타입/린트
- `src/types/assignment.ts` 신규 — `AssignmentSubmissionStatus`, `AssignmentGradingStatus`, `AssignmentSlotDTO` 타입 export.
- zod 스키마: `src/lib/assignment-schemas.ts` 신규 — Zod enum, transition input schema.
- 기존 submission zod schema 영향 없음.

### 6.2 테스트
- `src/lib/__tests__/assignment-state.test.ts` 신규 — 상태 머신 전이 모든 branch.
- 기존 `card-author.test.ts` 패턴(tsx-runner) 재사용 — jest/vitest 없음.
- phase9 QA는 실제 브라우저 + Galaxy Tab S6 Lite emulation.

### 6.3 빌드/배포
- `sharp` 패키지 신규 의존성 — `package.json` 추가(이미 transitive로 설치되어 있으므로 직접 의존성 명시만). Vercel Functions Node runtime 호환.
- Neon/Supabase PostgreSQL 마이그레이션 단일 트랜잭션 실행. downtime 0(비파괴).

---

## 7. 롤백 계획

### 7.1 단계적 롤백
1. **UI 레벨**: `/board/[id]` 분기에서 `layout="assignment"` 시 이전 AssignmentBoard.tsx 로직으로 복귀 (feature flag `ASSIGNMENT_V2_ENABLED` — env var). feature flag off 시 Submission+BoardMember 경로 복귀.
2. **API 레벨**: 신규 엔드포인트 비활성화 (404). AssignmentSlot 테이블 유지(읽기만 가능).
3. **DB 레벨** (최후 수단, 데이터 손실): 다운 마이그레이션
   ```sql
   DROP TABLE "AssignmentSlot";
   ALTER TABLE "Board" DROP COLUMN "assignmentGuideText", DROP COLUMN "assignmentAllowLate", DROP COLUMN "assignmentDeadline";
   ALTER TABLE "Submission" DROP COLUMN "assignmentSlotId";
   ```
   이 경우 returnReason·viewedAt·returnedAt 메타 데이터 손실. student 제출 Card 본문은 보존(slot.cardId Card는 그대로). 롤백 실행 전 30일 DB backup snapshot 필수.

### 7.2 롤백 트리거 조건 (phase9 결정)
- 태블릿 perf AC-14 실패 (DOM > 180 or TTI > 3s or FPS < 45)
- AC-10 (cross-student read) 실패 (보안 사유)
- DB migration irreversible 오류

### 7.3 데이터 보존 원칙
- "생성됐다가 실패한 보드"의 slot/Card는 Board.deletedAt soft delete로 보관 → 30일 후 cascade 삭제 크론.

---

## 8. 성능 예산 (Galaxy Tab S6 Lite)

| 지표 | budget | 측정 방법 | phase9 수단 |
|---|---|---|---|
| DOM node count | ≤ 180 | DevTools Elements + `document.querySelectorAll('*').length` | Chrome remote debug |
| TTI (First Interactive) | ≤ 3000ms | Lighthouse mobile throttle off | `vercel-plugin:verification` |
| Scroll FPS | ≥ 45 | DevTools Performance 5s scroll trace | chrome-devtools MCP |
| Main thread long tasks | ≤ 2 count / s | Performance Insight | MCP |
| JS heap | ≤ 80 MB | DevTools Memory timeline | MCP |
| First byte of thumb | ≤ 200ms (p50) | network waterfall | MCP |

설계 시 이 예산을 만족시키기 위한 surgical decisions:
- **CSS 상태 토글만** — 상태 변경 시 전체 격자 리렌더 금지. `data-status` attr → CSS pseudo-class.
- **CSS Grid layout** — React re-layout 없이 브라우저가 position 계산.
- **썸네일 160×120 WebP** — origin bytes minimize.
- **`React.memo` on `<AssignmentSlotCard>`** — 30개 카드 중 1개 상태 변경 시 나머지 재렌더 막기.
- **Suspense boundary around modal portal** — 모달 데이터 로드 중에도 격자는 interactive.

---

## 9. 3-레이어 RBAC / RLS 설계

### 9.1 Layer 1 — API guard
- Teacher 경로(`PATCH /api/assignment-slots/[id]` 등): `requireTeacher(classroomId, user.id)` = `classroom.teacherId === user.id`.
- Student 경로(`POST /api/assignment-slots/[id]/submission`): `requireStudentOwnsSlot(slotId, student.id)` = `slot.studentId === currentStudent.id`.
- Parent 경로: 기존 `parentScopeForStudent(studentId)` 재사용.

### 9.2 Layer 2 — DOM filtering (server render)
- 학생 서버 렌더 시 `db.assignmentSlot.findMany({ where:{boardId, studentId: currentStudent.id} })` — 다른 slot 마크업 0.
- 격자 뷰는 `role=owner` 조건부 렌더. 학생이 URL로 직접 접근 시 서버가 student view만 렌더.

### 9.3 Layer 3 — RLS scaffold (PV-12 style, not auto-applied)
`prisma/migrations/20260414_add_assignment_slot/rls.sql`:
```sql
ALTER TABLE "AssignmentSlot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AssignmentSlot_student_self" ON "AssignmentSlot"
  FOR SELECT USING ("studentId" = current_setting('app.student_id', true));
CREATE POLICY "AssignmentSlot_teacher_own_classroom" ON "AssignmentSlot"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "Board" b JOIN "Classroom" c ON c.id = b."classroomId"
            WHERE b.id = "AssignmentSlot"."boardId"
            AND c."teacherId" = current_setting('app.user_id', true))
  );
CREATE POLICY "AssignmentSlot_parent_of_student" ON "AssignmentSlot"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "ParentChildLink" pcl
            WHERE pcl."studentId" = "AssignmentSlot"."studentId"
            AND pcl."parentId" = current_setting('app.parent_id', true)
            AND pcl."deletedAt" IS NULL)
  );
```
- NOT APPLIED in production until ops task. API layer is primary.

---

## 10. 승인 프로세스 / 확정 필요 지점 (phase4 design_planner로)

아래 결정은 설계 관점에서 **defensible default**를 제시했으나, 사용자 UX/시각 결정에 영향 — phase4에서 사용자 리뷰 필요.

1. 격자 카드 크기 (160×120 썸네일 + 레이블 + 뱃지) → 탭 S6 Lite 1200×2000 세로에서 5열이 실질 몇 dp?
2. 풀스크린 모달 "다음 slot" nav UX (연속 모달 vs 닫기 후 열기 vs carousel)
3. 반려 시 UX — confirmation dialog 한 번 더? 아니면 즉시 submit?
4. Matrix view 세부 — 확정 설계 없음. 별도 task로 풀어도 됨.
5. "미제출 필터" 탭 뷰 디자인.
