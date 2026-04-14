# Phase 1 — Researcher Pack

**Scope**: padlet(Aura-board) 레포 내부 조사. 외부 UX 벤치마크는 ideation 단계(`../ideation/tasks/2026-04-14-assignment-board-impl/phase1/exploration.md`)에서 이미 완료 — 본 문서는 **구현 레이어 현황(데이터 모델·API·권한·실시간·썸네일·RLS)** 에 초점.

---

## 1. Board 스키마 현황

- 파일: `prisma/schema.prisma:163-208`
- 주석(line 163) 기준 `layout` 허용값: `freeform | grid | stream | columns | assignment | quiz | plant-roadmap | event-signup | drawing | breakout`. **`"assignment"` 값 이미 존재.**
- 관련 필드(모두 존재):
  - `layout String @default("freeform")` (line 169)
  - `description String @default("")` (line 170) — 현재 `/api/boards` 생성 시 description으로 과제 설명을 보관. seed의 `assignmentGuideText`는 별도 필드로 추가 필요(일반 description과 역할 분리).
  - `classroomId String?` (line 171) — FK to Classroom, 과제 보드 생성 시 필수.
- zod enum: `src/app/api/boards/route.ts:14-23` — `"assignment"` 포함돼 있어 API 경로 활성.
- 현재 `assignmentGuideText`, `assignmentAllowLate` 필드는 **부재** → 신규 컬럼 2개.
- index: `Board` 레벨에는 `slug` unique만. `classroomId`에 인덱스 없음 (classroomId로 필터링하는 질의는 드문 듯).

## 2. Card 스키마 + studentAuthorId

- `prisma/schema.prisma:244-288`
- 관련 필드:
  - `studentAuthorId String?` (line 262) + `@relation("StudentCardAuthor") studentAuthor Student?` (line 281) + `@@index([studentAuthorId])` (line 287). Canva publisher 경로에서 이미 사용.
  - `externalAuthorName String?` (line 264) — 비정규화된 표시명.
  - `x/y/width/height` Float 기본값 `(0,0,240,160)` (line 270-273) — 5×6 격자에서 결정적 배치 시 `(col*W, row*H)` 계산값 주입.
- `src/app/api/external/cards/route.ts:182,187,194,254` — Canva app OAuth 경로가 student 토큰에서 `studentAuthorId`를 채워넣는 기존 패턴. assignment v1은 보드 생성 시점에 **slot별 빈 Card를 프리페칭**하면서 `studentAuthorId = slot.studentId`로 고정할 수 있음. Student 제출(업데이트) 시 권한 체크는 `card.studentAuthorId === currentStudent.id`로 1-라인.
- `src/lib/card-author.ts:5` `pickAuthorName(external, student, author)` — UI 표시명 helper 재사용.

## 3. Submission 스키마 + 기존 assignment 경로

- `prisma/schema.prisma:290-330`
- `userId String?` (line 293) — NextAuth User FK. **학생(Student)은 NextAuth 외부**이므로 현 Submission은 assignment 시나리오에서 teacher-owned account 또는 legacy mock role 기반으로 동작 중.
- `status` enum 주석(line 297-298): `"submitted" | "reviewed" | "returned"` (assignment) + event-signup 4값 공유.
- 기존 구현:
  - `POST /api/submissions` (`src/app/api/submissions/route.ts:14-61`): `requirePermission(boardId, user.id, "edit")` → BoardMember.role=editor/owner만 통과. **학생 편집 경로가 Student identity가 아닌 User identity라는 것이 현재 아키텍처의 fossil**.
  - `PATCH /api/submissions/[id]` (`src/app/api/submissions/[id]/route.ts:7-46`): status enum `["submitted","reviewed","returned"]` — `reviewed`/`returned` 전용 교사 액션 경로.
- **gap**: seed가 요구하는 `assignmentStatus = assigned/viewed/submitted/returned/reviewed/orphaned` 중 `assigned`와 `viewed`는 현 Submission.status에 없음. Submission.status를 확장하지 말고 `AssignmentSlot.submissionStatus`로 분리하는 게 event-signup 충돌을 피함 (handoff_note.md §5 합의와 일치).

## 4. Classroom / Student / number

- `prisma/schema.prisma:118-161`
- `Classroom.teacherId` (line 121): 생성 권한 체크 — `/api/boards` POST에서 `classroom.teacherId === user.id` 패턴 기 구현 (`src/app/api/boards/route.ts:161`).
- `Student.number Int?` (line 138): **Optional**. Student가 number null이면 5×6 격자 배치 불가 → v1에서 **생성 시점 guard**로 classroom 전원의 number 채움 여부 검증 필요.
- `@@unique([classroomId, number])` (line 157): 같은 classroom 내 번호 중복 금지 — slotNumber snapshot 안정성 근거.

## 5. Realtime 인프라

- `src/lib/realtime.ts:1-45`
- 채널 key helper만 존재 (`boardChannelKey`, `sectionChannelKey`). `publish()` **no-op**.
- 실 pub/sub 엔진 미선택 — `docs/architecture.md:12` 기록. 별도 research task 예정.
- 본 task가 도입해야 할 것:
  - `assignmentChannelKey(boardId) → board:${boardId}:assignment` helper 추가 (line 30 이하 스타일 승계).
  - `publish()` 호출은 선언적으로 적어두되 no-op 유지 (transport 도입 시 전환).
- **blocker**: 시드 AC "상태 전이 실시간 동기화"는 현재 engine 부재로 **v1 fallback = 페이지 router.refresh() + SWR 폴링**로 다운그레이드해도 수용될지 phase2 strategist 결정 필요.

## 6. 썸네일 / 이미지 파이프라인

- `src/app/api/upload/route.ts:5,47`: `@vercel/blob` `put(pathname, buffer)` — raw 저장, 리사이즈 없음.
- `src/app/api/canva/thumbnail/route.ts:1-101`: Canva CDN 패스스루. `w ∈ {160,320,640}` 검증만, 실 리사이즈는 next/image(`/_next/image`) 위임. WebP 강제 아님 (Accept header 제안만).
- `src/components/ui/OptimizedImage.tsx:34`: `DEFAULT_SIZES = "(max-width: 768px) 100vw, 480px"` — 태블릿 모드에서 500px급 이미지 요청. **160×120 썸네일** 렌더 시 sizes 재지정 + `next/image` + `loading="lazy"` 조합으로 충족 가능.
- `package-lock.json` grep: `sharp` 엔트리 존재 (next 16 내부 의존성). 직접 사용 코드는 없음.
- **결론**: "서버 리사이즈 160×120 WebP"는 **새 upload 시점에 sharp 리사이즈해서 `_thumb_160x120.webp` 파일을 blob에 함께 저장**하는 방식이 가장 직관적. phase3에서 `src/lib/blob.ts` 확장 설계. 대안(`next/image`만 사용)은 WebP 변환을 CDN에 의존 — 갤럭시 탭 S6 Lite의 낮은 네트워크에서 initial byte가 클 수 있어 서버 리사이즈 선호.

## 7. RBAC / RLS 현황

### 7.1 BoardMember.role (legacy)
- `src/lib/rbac.ts:14-59`: `Role = owner | editor | viewer`. `requirePermission(boardId, userId, action)` → 멤버 없으면 Forbidden.
- `src/lib/roles.ts:7`: `MOCK_ROLE_KEYS = ["owner","editor","viewer"]` — MOCK 라는 접두가 "legacy·mock" 신호. `feat/role-cleanup-research`가 이 테이블 제거를 제안 중.
- `prisma/schema.prisma:231-242` `BoardMember`: 여전히 FK 제약. teacher/student/parent로 완전 전환은 미완.

### 7.2 Identity-based (현재)
- `src/lib/student-auth.ts`, `src/lib/parent-scope.ts` (91 lines): 별도 인증 레이어.
- Parent viewer (PV-7)는 BoardMember를 통하지 않고 `studentId ∈ parent.children` 필터만 사용 (`src/app/api/parent/children/[id]/assignments/route.ts:43-51`). **assignment task가 따라야 할 레퍼런스 패턴**.

### 7.3 RLS
- `prisma/migrations/20260412_add_parent_viewer/rls.sql:1-49`: Parent/ParentChildLink/ParentSession에만 scaffold. **NOT auto-applied** (line 3-7 "NOT AUTO-APPLIED. … deferred until PV-12"). Prisma SET LOCAL GUC 패턴 사용법 기술됨.
- assignment task에서 **AssignmentSlot / Card (studentAuthorId)** RLS를 PV-12 스타일 scaffold-only로 작성 → 활성화는 별도 운영 task.

### 7.4 role-cleanup 정렬 노트
- `feat/role-cleanup-research` (phase1 only, 아직 drop 안 됨)가 BoardMember.role 제거를 **제안만** 한 상태. 본 assignment-board-impl task는 BoardMember를 **owner=teacher 1행만** 생성 (legacy 호환). editor=student 행은 **신규로 생성하지 않음** — 권한은 AssignmentSlot.studentId + student-auth 조합으로 결정. role-cleanup이 먼저 merge되더라도 본 task가 owner 1행 방식을 유지하면 충돌 없음.

## 8. 기존 AssignmentBoard 컴포넌트

- `src/components/AssignmentBoard.tsx:1-215` + `src/app/board/[id]/page.tsx:11,64,476-488`.
- 현 구현은 **Submission+BoardMember 기반 단순 격자** + `SubmissionModals.tsx` 재사용.
- 격자: `.assign-grid` (CSS class, 반응형 unspecified), `students = members.filter((m) => m.role !== "owner")`.
- 상태 뱃지: submitted/reviewed/returned 3값만. Seed가 요구하는 `assigned/viewed/orphaned` 미구현.
- 반려 사유 강제 UI 없음 (단순 feedback 텍스트). returnReason banner 없음.
- **v1 작업**: 본 컴포넌트를 교체(`AssignmentBoard` 리네임 유지, 구현 rewrite). `SubmissionModals.tsx`의 SubmitModal/ViewModal은 풀스크린 모달 요구와 호환 여부 phase4에서 재검토(사이드 패널 형태면 교체).

## 9. board/[id] 라우트 데이터 로딩 전략

- `src/app/board/[id]/page.tsx:60-156`: Promise.all fan-out 패턴. `needsAssignmentData = board.layout === "assignment"` (line 64) — 현재 assignment는 `submissionsPromise` + `membersPromise`만 집어옴 (cards/sections skip).
- v1에서 추가로 필요한 것:
  - `slotsPromise = db.assignmentSlot.findMany({ where: { boardId }, include: { student, card } })`
  - board.assignmentGuideText(이미 `board.*`로 로드됨, 컬럼만 추가되면 자동)
  - classroom 관련 필드 (roster 동기화 버튼용)

## 10. Breakout 패턴 선례 (유사 feature)

- `prisma/schema.prisma:608-645` BreakoutAssignment + BreakoutMembership 패턴은 "classroom 기반 studentId 연결 + 보드별 추가 메타데이터"로 AssignmentSlot과 유사.
- `/api/boards` POST breakout 브랜치(`src/app/api/boards/route.ts:42-149`)는 **단일 트랜잭션 안에서 Board + Assignment + Section + Card 전부 생성**하는 패턴. AssignmentSlot 생성도 동일 패턴(db.$transaction) 채택 권장. classroom.students가 N>30이면 400 반환하는 guard 위치 참조.

## 11. 학부모 뷰 (parent-viewer PV-7) 통합 지점

- `src/app/api/parent/children/[id]/assignments/route.ts:43-65`: Submission을 `applicantName + applicantNumber` 매칭으로 조회 중(row 50). 이 heuristic은 approximate — AssignmentSlot 도입 시 **자녀 studentId로 직접 조인**하면 정확도·성능 모두 개선. v1 범위 안에서 같이 리팩토 가능 (surgical — AssignmentSlot 존재 시 그 경로, 없으면 현 heuristic fallback).

## 12. 태블릿 성능 예산 baseline 확인

- `src/hooks/useIframeBudget.ts` 존재 — iframe 카운트 제한 훅 있음.
- DOM 예산 ≤180 = 30 카드 × 6 자식 노드. 현재 `AssignmentBoard.tsx:124-138` 카드당 자식 노드 수: avatar(1) + name(1) + status(1) + grade(1, optional) = **≤4**. 여유 있음.
- `loading="lazy"` + `IntersectionObserver`는 `OptimizedImage` 기본 제공.
- 45fps 스크롤은 CSS `will-change: transform` + virtualization 필요 여부 논의(phase4). 30카드는 virtualization 없이도 가능할 것으로 예상.

---

## Blockers / Ambiguities (phase3에서 해소)

| # | 항목 | 가장 방어 가능한 해석 (continue 기본값) |
|---|---|---|
| B1 | `orphaned` enum 값 — seed ontology 없음, decisions §3만 있음 | **포함** (decisions를 SSoT로 인정). Student soft-delete 시 slot 미삭제+`orphaned` 마킹. |
| B2 | `returnReason` 저장처 (`AssignmentSlot.returnReason` vs `Submission.feedback`) | **`AssignmentSlot.returnReason` 신규 컬럼**. Submission.feedback은 event-signup와 공유 중이라 의미 오염. |
| B3 | 실시간 transport 미선택 | **v1 router.refresh() + optimistic local state**. 채널 key만 선언, `publish()`는 no-op 유지. 사용자 UX 체감 지연 시 phase9에서 재측정. |
| B4 | "서버 리사이즈 160×120 WebP" 구현 방식 | **sharp를 `src/lib/blob.ts`에 추가**. 업로드 시 원본 + `_thumb_160x120.webp` 이중 저장. 신규 의존성이나 `sharp`는 package-lock에 이미 존재. |
| B5 | `AssignmentSlot.cardId` 프리페칭 vs lazy | **프리페칭**. 보드 생성 시 `(student, empty Card)` pair를 트랜잭션 내 일괄 생성. 초기 제출 전 Card.content=""로 표시, 격자에 join 없이 `studentAuthorId`로 직접 조회. |
| B6 | BoardMember.role=editor 행을 학생별로 생성할지 | **생성하지 않음**. owner(teacher) 1행만 생성. 학생 권한은 `card.studentAuthorId === currentStudent.id` AND `slot.studentId === currentStudent.id` 2단계 조인. |
| B7 | Submission 엔티티 AssignmentSlot 연결 | **`Submission.assignmentSlotId String? @unique`** nullable FK 추가 (v1 후방호환). 현 submission 경로가 AssignmentSlot 있으면 slot→student 역조회. 기존 event-signup submission은 null 유지. |
| B8 | 30명 초과 Classroom → 생성 차단 UX | **400 "classroom_too_large" + 교사에게 분반 안내 문구.** |

## In-flight work overlap check

- `feat/parent-class-invite-v2-design` (parent v2, phase7 블록): 학부모 UI 터치. **겹침 적음** — `/parent/child/[id]/assignment` 라우트는 본 task에서 신설하지만 PV 권한 체계(`parent-scope.ts`)를 read-only로 사용하므로 v2 변경과 orthogonal.
- `feat/canva-link-thumbnail-fallback`: `src/lib/canva.ts`, `src/lib/blob.ts` 터치 예정. **blob.ts 동시 편집 가능성**. 본 task의 B4 (sharp 추가)는 canva 작업이 merge된 후 진행하거나, 마이그레이션 파일만 먼저 끊어놓고 blob.ts는 phase7에서 rebase 기반 편집.
- `feat/role-cleanup-research`: BoardMember.role drop 제안 단계. 본 task가 BoardMember.role=owner 1행만 생성 → drop 이후엔 BoardMember 자체 미생성으로 1-line 변경. **충돌 소형**.
- `fix/link-preview-thumbnail`: 무관.

## Identity-based permission model alignment

사용자 메모리 `project_permission_model.md` 준수:
- **Teacher** = `User + Classroom.teacherId` — 기존 assignment 경로 유지.
- **Student** = `Student` identity (student-auth.ts) — AssignmentSlot.studentId 조인으로 권한 결정. BoardMember.role=editor 미생성.
- **Parent** = `Parent` identity + ParentChildLink.studentId — parent-scope.ts 기존 미들웨어 재사용.

Seed의 "editor=학생" 표현은 phase3 design_doc에서 "Student identity"로 번역.
