# Phase 1 — Researcher · role-model-cleanup

## 1. 현재 권한 구조 (snapshot as of 2026-04-15 d954ea3)

### 1.1 핵심 primitive
- **`src/lib/rbac.ts`** — 87 라인(보드 부분). `Role = "owner" | "editor" | "viewer"`, `Action = "view" | "edit" | "delete_any"`. `getBoardRole(boardId, userId)` 이 `BoardMember.role` 읽어서 반환. `requirePermission(boardId, userId, action)` 이 403 던지거나 Role 반환.
- **BoardMember 테이블**: `(boardId, userId, role)` 유니크. `userId` FK → `User`. **Student·Parent 는 User 가 아니므로 BoardMember 에 넣을 수 없다.** 설계상 이미 identity mismatch.

### 1.2 Role enum 사용처 (grep hit 75건)
- **UI props**: `BoardCanvas / ColumnsBoard / GridBoard / StreamBoard / BreakoutBoard / DrawingBoard / AssignmentBoard / PlantRoadmapBoard / EventSignupBoard / BoardHeader` 등. `currentRole: "owner" | "editor" | "viewer"`.
- **조건문 패턴 2종**:
  - `currentRole === "owner" || currentRole === "editor"` → canEdit
  - `currentRole === "owner" || (currentRole === "editor" && card.authorId === currentUserId) || card.studentAuthorId === currentUserId` → canDelete (2026-04-15 student branch 추가분)
- **API 분기**: `role === "owner"`, `role === "editor"`, `requirePermission(..., "edit")` 가 17라우트에 산재.

### 1.3 실제 identity source (현재 병렬 운용 중)
| Identity | 로드 경로 | 실제 있는 필드 |
|---|---|---|
| teacher | `getCurrentUser()` (NextAuth + dev mock) | `User.id`, `User.name` |
| student | `getCurrentStudent()` (HMAC cookie) | `Student.id`, `Student.name`, `Student.classroomId` |
| parent | `parent-scope.ts` (parent-session cookie) | `Parent.id` → `ParentChildLink[]` → `studentId[]` |

현재 UI 는 이 3 identity 를 모두 `currentRole = "owner|editor|viewer"` 로 **억지로 매핑**:
- teacher owner → "owner"
- teacher editor(legacy mock) → "editor"
- 학생 = 같은 학급 → `board/[id]/page.tsx:195` 에서 `effectiveRole = "viewer"` + `studentViewer` 객체 병행
- 학부모 → /parent/* 경로에 한정 (보드 페이지에는 직접 진입 안 함)

### 1.4 2026-04-15 주 땜질 3건 (scope 경계)
1. `DELETE /api/cards/:id` — student-auth 우선, `card.studentAuthorId === student.id` 면 통과. UI 4개 board 에서 `|| card.studentAuthorId === currentUserId` 조건 복제.
2. `POST /api/cards` — student-auth 우선, `board.classroomId === student.classroomId` 면 통과. `authorId = classroom.teacher, studentAuthorId = student.id, externalAuthorName = student.name` 스탬프.
3. `POST /api/external/cards` — columns 보드에서 `sectionId` 없으면 400 (student orphan card 방지).

각 땜질이 **같은 판정 로직(identity × ownership)의 복제**.

## 2. BoardMember 테이블 실제 사용 분석

### 2.1 write 경로
- `POST /api/boards` (모든 layout): `members: { create: { userId: user.id, role: "owner" } }` — **owner 행만 생성**.
- `POST /api/classroom/[id]/invite` → parent v2 approve route: BoardMember insert 는 **보류** (schema FK unfit).

### 2.2 read 경로
- `getBoardRole(boardId, userId)` — `BoardMember.findUnique`. `requirePermission` 내부 호출.
- 그 외 `boardMember.findMany({ where: { boardId }, include: { user } })` 호출 없음 확인 (assignment board phase7 에서 legacy `membersRaw` 제거됨).

### 2.3 결론
**BoardMember 는 실질적으로 "보드 owner 교사 1인 마킹" 용도만**. editor/viewer 값은 mock auth dev 경로(`u_editor`, `u_viewer`)에서만 사용되고, 실 prod flow 에 쓰이지 않음.

## 3. 식별된 정합성 구멍 (이번 task 가 닫을 문제)

1. **학생 add-card**: 최근까지 UI FAB 자체가 숨어 있었음 (`canEdit = role === "editor"`). 2026-04-15 땜질로 `isStudentViewer` prop 추가. 하지만 **add 외 동일 패턴 (상세 모달 편집·카드 이동·링크 수정)** 은 여전히 student 불가.
2. **학생 edit-own-card**: `PATCH /api/cards/:id` 는 `getCurrentUser()` 만 수용. 학생이 자기 카드 title/content 수정 못 함.
3. **PlantRoadmapBoard / EventSignupBoard / 기타 layout** 도 `currentRole` 로 같은 땜질 후보.
4. **parent → 카드 접근** 은 `/parent/(app)/child/[id]/*` 페이지가 parent-scope 경유해서 읽기만 하므로 본 task 영향 최소. 하지만 권한 primitive 가 integrated 되면 parent-scope 도 primitive 의 한 branch 가 되는 게 자연스러움 (scope OUT 권장, 별 task).
5. **assignment board AB-1** 는 이미 identity-based 로 재작성됨 (phase3 §9.1~9.3). 본 task 는 AB-1 을 변경 대상 아닌 **reference pattern** 으로 삼음.

## 4. 설계 후보

### 4.1 권장 primitive
`src/lib/card-permissions.ts` 신규.
```ts
export type Identity =
  | { kind: "teacher"; userId: string; ownsBoardIds: Set<string> }
  | { kind: "student"; studentId: string; classroomId: string }
  | { kind: "parent"; parentId: string; childStudentIds: Set<string> }
  | { kind: "anon" };

export type CardLike = {
  id: string;
  boardId: string;
  authorId: string;       // always the teacher (board owner) per current schema
  studentAuthorId: string | null;
};

export type BoardLike = {
  id: string;
  classroomId: string | null;
  // "teacher who actually owns this board" = classroom.teacherId (or
  // BoardMember.role='owner' userId for boards without classroom).
  ownerUserId: string;
};

export function canAddCardToBoard(id: Identity, board: BoardLike): boolean;
export function canEditCard(id: Identity, board: BoardLike, card: CardLike): boolean;
export function canDeleteCard(id: Identity, board: BoardLike, card: CardLike): boolean;
export function canViewCard(id: Identity, board: BoardLike, card: CardLike): boolean;
```
- teacher owns board → full edit/delete
- student + same-classroom → `canAddCardToBoard` = true
- student + `card.studentAuthorId === id.studentId` → `canEditCard` + `canDeleteCard` = true
- parent + `card.studentAuthorId ∈ id.childStudentIds` → `canViewCard` = true, 편집 불가
- anon → 전부 false (`canViewCard` 는 token 분기 별개 처리 — 기존 viewSection 흐름)

### 4.2 Identity resolver
`src/lib/identity.ts` 또는 기존 `parent-scope`/`student-auth`/`auth` 를 한 래퍼로.
```ts
export async function resolveIdentity(boardId?: string): Promise<Identity>;
```
캐싱: per-request (Next server component 안에서 1회). teacher 판정은 BoardMember.role='owner' 존재 여부로 fallback (classroomId 없는 레거시 보드 커버).

### 4.3 UI 변화
- `board/[id]/page.tsx` — `effectiveRole` 단일 문자열 대신 **identity 객체** 생성 후 props 로 전달.
- 각 board 컴포넌트 — `currentRole: Role` 대신 `identity: Identity` + 서버측 사전계산된 `caps: { canAddCard, canEditOwn, ... }` 조합 권장 (client 은 primitive 재호출로 조건 분기).
- `BoardHeader`, settings panel 등의 "canEdit" 류는 primitive 로 수렴.

### 4.4 BoardMember 테이블 처리
- **이번 task**: 값은 건드리지 않음. `getBoardRole` 은 **deprecated** 로 남기고 호출처 축소.
- **별 task (cleanup)**: BoardMember 테이블에서 role 컬럼을 `BOOLEAN is_owner` 로 축소하거나 `Board.ownerUserId` 직접 컬럼으로 마이그. 본 task 범위 밖.

## 5. phase1 blockers → phase2 scope 결정 필요

| # | 질문 | 권장 답 |
|---|---|---|
| B1 | parent-scope 는 본 task 에서 건드릴까? | **OUT**. parent-v2 가 방금 배포됐고 status='active' narrowing 의 정합성 깨고 싶지 않음. primitive 가 parent branch 노출만 해두고, parent-scope.ts 내부 로직은 그대로 유지. |
| B2 | BoardMember 테이블 drop? | **OUT**. 현 값 유지, read 경로만 축소. DB 변경 없음. |
| B3 | 학생 PATCH /api/cards/:id 허용? | **IN**. 본 task 의 핵심 가치. student-author path 추가. |
| B4 | 학생 카드 이동 (drag) 허용? | **IN (자기 카드만)**. canEditCard 가 true 면 x/y/sectionId PATCH 통과. |
| B5 | AssignmentBoard AB-1 정체성 흐름 변경? | **OUT**. 이미 identity-based. 참조 pattern 으로만 사용. |
| B6 | BreakoutBoard / PlantRoadmap / EventSignup / DrawingBoard identity 흐름 변경? | **IN — 단 최소 수정**. currentRole prop 을 identity 로 바꾸는 건 본 task 에서 하되, 각 layout 의 내부 UX(예: 모둠 visibility) 는 그대로 유지. |
| B7 | `owner/editor/viewer` 3-enum 자체를 완전 제거? | **IN — 타입 alias 로만 남기고 실 호출 0**. rbac.ts 의 Role export 는 deprecated JSDoc + 삭제 warning. |
| B8 | Dev mock auth (`u_editor`, `u_viewer`) 어떻게? | **OUT**. dev-only fallback 이므로 건드림 없이 teacher 분기로 흡수 (editor/viewer 모두 teacher 로 매핑되되 ownsBoardIds 가 비어있는 상태가 됨 → 자연히 "viewer-like" 행동). |

## 6. 영향 예상 파일 (phase3 architect 가 최종 확정)

### high-risk (분기 로직 재작성)
- `src/lib/rbac.ts` — Role 타입 alias 화, getBoardRole deprecated
- `src/lib/card-permissions.ts` — NEW primitive
- `src/lib/identity.ts` — NEW resolver
- `src/app/board/[id]/page.tsx` — identity 생성 + props 분기
- `src/components/{BoardCanvas,ColumnsBoard,GridBoard,StreamBoard}.tsx` — currentRole → identity prop
- `src/components/cards/CardDetailModal.tsx` + inner edit flows — canEditCard 사용
- `src/app/api/cards/route.ts` (POST), `src/app/api/cards/[id]/route.ts` (PATCH, DELETE), `src/app/api/cards/[id]/move/route.ts` — primitive 통합

### med-risk (props 단순 교체)
- BoardHeader, BoardSettingsPanel — canEdit 계산 primitive 호출로 교체
- BreakoutBoard / DrawingBoard / PlantRoadmapBoard / EventSignupBoard — currentRole prop 타입 변경 (호출 path 내부 로직 최소)

### out-of-scope (이번 task 미변경)
- parent-scope.ts (parent v2 방금 배포)
- AssignmentBoard.tsx (AB-1)
- QuizBoard (role 의존도 없음)
- BoardMember 테이블 스키마

## 7. 권장 phase 순서

1. phase2 — 본 research 의 B1~B8 답을 confirmation 으로 채택, 영향 파일 리스트 확정.
2. phase3 — `identity.ts` + `card-permissions.ts` 타입 & 함수 스펙, 각 API 라우트 migration 표.
3. phase4/5/6 — UI 변경이 제한적이라 phase4 design_brief 는 경량 (시각 변경 없음, 권한 변경에 따른 버튼 유무만 명시).
4. phase7 — 실구현, primitive 도입 + 호출처 대체.
5. phase8 — staff-eng review + security audit (권한 primitive 바뀌면 security critical).
6. phase9 — 실 브라우저 e2e 또는 unit tests (canAddCard × canEdit × canDelete × canView × identity 4종 매트릭스 커버).
7. phase10/11 — 배포 + 문서.

## 8. Phase 1 판정

**PASS** — 75 grep hit 의 분포 + 3 identity path 의 실제 resolver + 주간 3건 땜질의 공통 추상화 가능성 모두 확인. phase2 scope 확정 가능.
