# Phase 3 — Architecture · role-model-cleanup

- **task_id**: `2026-04-15-role-model-cleanup`
- **mode**: Selective Expansion (phase2)

## 1. 데이터 모델 변경

**없음.** 본 task 는 권한 primitive 재설계만. BoardMember / Card / Student / Parent 테이블 전부 미변경 (phase2 OUT-1, B2).

## 2. API 변경

### 2.1 라이브러리 신규

#### `src/lib/identity.ts`
```ts
import "server-only";

export type Identity =
  | { kind: "teacher"; userId: string; name: string; ownsBoardIds: Set<string> }
  | { kind: "student"; studentId: string; name: string; classroomId: string }
  | { kind: "parent"; parentId: string; childStudentIds: Set<string> }
  | { kind: "anon" };

/**
 * Single request-scoped identity resolver.
 * Precedence: NextAuth teacher → student_session → parent_session → anon.
 * `ownsBoardIds` is intentionally derived from BoardMember.role="owner" at
 * resolve time to keep the legacy DB path honoured (boards without
 * classroomId still work).
 */
export async function resolveIdentity(): Promise<Identity>;
```

#### `src/lib/card-permissions.ts`
```ts
// Pure predicates — no I/O. Safe to import on client (though typically
// used in server components + API routes).

export type BoardLike = {
  id: string;
  classroomId: string | null;
  ownerUserId: string | null; // classroom.teacherId || BoardMember.role='owner'
};

export type CardLike = {
  id: string;
  boardId: string;
  authorId: string;          // always teacher
  studentAuthorId: string | null;
};

export function canViewCard(id: Identity, b: BoardLike, c: CardLike): boolean;
export function canEditCard(id: Identity, b: BoardLike, c: CardLike): boolean;
export function canDeleteCard(id: Identity, b: BoardLike, c: CardLike): boolean;
export function canAddCardToBoard(id: Identity, b: BoardLike): boolean;
```

**판정 매트릭스**:

| identity | canView | canEdit | canDelete | canAdd |
|---|---|---|---|---|
| teacher + ownsBoard | ✅ | ✅ | ✅ | ✅ |
| teacher + !ownsBoard | ✅ (read) | ❌ | ❌ | ❌ |
| student + same classroom | ✅ | card.studentAuthorId === studentId | 동일 | ✅ |
| student + different classroom | ❌ | ❌ | ❌ | ❌ |
| parent + child.id === studentAuthorId | ✅ (read) | ❌ | ❌ | ❌ |
| parent + 그 외 | ❌ | ❌ | ❌ | ❌ |
| anon | ❌ | ❌ | ❌ | ❌ |

### 2.2 API 라우트 변경

| 라우트 | 변경 | 정합 방식 |
|---|---|---|
| `POST /api/cards` | primitive 호출로 통합 | `resolveIdentity` → `canAddCardToBoard(id, board)`. 학생 경로의 studentAuthorId/externalAuthorName stamping 은 함수 내부 로직 유지 |
| `PATCH /api/cards/[id]` | **NEW student path** | `canEditCard(id, board, card)` true 면 허용. 학생 경로에서 허용되는 필드는 `title/content/linkUrl/imageUrl/color` — 좌표/크기는 move 엔드포인트 경유 |
| `POST /api/cards/[id]/move` | student path | `canEditCard` true 면 허용 |
| `DELETE /api/cards/[id]` | student path primitive | 기존 student-author 분기를 primitive 호출로 정리 |
| 그 외 17 requirePermission 호출 | **미변경** | teacher-only 경로이므로 그대로 |

### 2.3 rbac.ts 변경

```ts
/** @deprecated use src/lib/card-permissions.ts — this type is kept for
 *  legacy `currentRole` props on layouts not yet migrated (Quiz,
 *  PlantRoadmap, EventSignup, Drawing). Do NOT add new call sites. */
export type Role = "owner" | "editor" | "viewer";
```

`getBoardRole` / `requirePermission` 함수 내부 로직 변경 없음. teacher-only API 들이 계속 호출.

## 3. 컴포넌트 변경

### 3.1 `src/app/board/[id]/page.tsx`
- `resolveIdentity()` 1회 호출 후 props 전달.
- 기존 `effectiveRole` + `studentViewer` 병렬 유지 (여전히 참조하는 컴포넌트 있음).
- 신규 prop `identity: Identity` 를 4개 카드 보드에 전달.

### 3.2 4개 카드 보드 (`BoardCanvas/ColumnsBoard/GridBoard/StreamBoard`)
- 신규 prop `identity: Identity` 수용.
- 기존 `currentRole` prop 유지 (다른 경로 호환).
- 조건 계산: `const caps = useMemo(() => ({ canAdd: canAddCardToBoard(identity, board), ... }), [identity, board])`.
- 카드별 `canEditCard(identity, board, card)` / `canDeleteCard(...)` 를 렌더 내부에서 호출.
- 기존 `isStudentViewer` prop 은 **제거** (primitive 가 대체).

### 3.3 `CardDetailModal`
- 편집 버튼·textarea 가 `canEditCard(identity, board, card)` 로 gating.
- 삭제 버튼도 `canDeleteCard` 로.
- 학생이 자기 카드 열면 편집 UI 노출.

### 3.4 `DraggableCard`
- `canDelete` prop 은 상위에서 primitive 호출한 결과 전달. prop signature 미변경.

## 4. 데이터 흐름 다이어그램

### 4.1 교사 카드 생성
```
Teacher → UI FAB → POST /api/cards
  resolveIdentity() → { kind:"teacher", ownsBoardIds:{boardId} }
  canAddCardToBoard → true
  db.card.create { authorId: user.id, studentAuthorId: null }
```

### 4.2 학생 카드 생성
```
Student → UI FAB → POST /api/cards
  resolveIdentity() → { kind:"student", classroomId }
  board.classroomId === student.classroomId → canAddCardToBoard true
  db.card.create { authorId: classroom.teacherId, studentAuthorId: student.id, externalAuthorName: student.name }
```

### 4.3 학생 자기 카드 편집
```
Student → CardDetailModal 편집 → PATCH /api/cards/{id}
  resolveIdentity() → { kind:"student", studentId }
  canEditCard(id, board, card) — card.studentAuthorId === student.id → true
  db.card.update { ...input } — allowed fields only (title/content/linkUrl/imageUrl/color)
```

### 4.4 학부모 열람
```
Parent → /parent/(app)/child/[sid]/assignments
  existing parent-scope.ts → links.status='active' → childStudentIds
  canViewCard(id, board, card) — card.studentAuthorId ∈ childStudentIds → true
  UI is read-only (canEditCard/canDeleteCard/canAddCardToBoard all false)
```

## 5. 엣지케이스

- **E1 학생이 자기 classroomId 가 변경된 뒤 편집 시도** — student_session 의 classroomId 스냅샷이 stale. `resolveIdentity` 가 DB fresh read 를 하면 방어됨 (기존 `getCurrentStudent` 이 Student row 재조회).
- **E2 교사 mock (`u_editor`) 로 접속** — BoardMember.role="editor" 있어도 `ownsBoardIds` 에 포함 안 됨 (owner만). 결과 read-only teacher → 자연스러움.
- **E3 parent 가 자녀 없는 상태 (ParentChildLink.status='active' 없음)** — `childStudentIds` 빈 세트. 모든 canView/canEdit false.
- **E4 card.studentAuthorId=null + canva 앱 pub 없이 교사 manual 추가** — 학생 식별 불가. 학생이 자기 카드로 인식 못 함. 예상 동작.
- **E5 classroomId 없는 legacy board** — board.ownerUserId 는 BoardMember.role='owner' 에서 resolve. 기존 교사 flow 유지.
- **E6 AB-1 assignment board** — primitive 호출 안 함 (phase2 OUT-5). AssignmentBoard 자체 identity 흐름 유지.

## 6. DX 영향

- 신규 파일: `src/lib/identity.ts`, `src/lib/card-permissions.ts`, `src/lib/__tests__/card-permissions.test.ts`.
- 타입 확장: `Card` 에 `authorId`·`studentAuthorId` 이미 있음, 추가 prop 없음.
- `resolveIdentity` 는 per-request server-side 전용 (student_session cookie 등 접근).
- Vitest 은 이미 parent-v2 에서 도입됨 → 본 task 테스트도 vitest pattern 사용 (`*.vitest.ts`).

## 7. 롤백 계획

- UI: `identity` prop 무시하고 기존 `currentRole` 경로 복원 (복원 시 학생 FAB 다시 숨김).
- API: `PATCH /api/cards/[id]` student path 제거 → 학생 편집 불가 복귀. 기존 teacher flow 보존.
- DB 변경 없어서 migration 롤백 불필요.

## 8. 성능 예산

- `resolveIdentity` 최대 3 쿼리 (NextAuth session lookup + student fetch + parent fetch) — 실제로는 identity 확정되면 이른 return. per-request 1회, 캐싱 불필요.
- `canAddCardToBoard / canEditCard` 등은 순수 함수 — 비용 무시 가능.

## 9. AC → 파일 매핑

| AC | 파일 |
|---|---|
| AC-1 primitive purity | `src/lib/card-permissions.ts` |
| AC-2~5 매트릭스 | `src/lib/__tests__/card-permissions.test.ts` |
| AC-6 POST | `src/app/api/cards/route.ts` |
| AC-7 PATCH | `src/app/api/cards/[id]/route.ts` (신규 student path) |
| AC-8 DELETE | `src/app/api/cards/[id]/route.ts` (기존 primitive 통합) |
| AC-9 move | `src/app/api/cards/[id]/move/route.ts` |
| AC-10 UI | `BoardCanvas/ColumnsBoard/GridBoard/StreamBoard` |
| AC-11 CardDetailModal | `src/components/cards/CardDetailModal.tsx` |
| AC-12 tests | `src/lib/__tests__/card-permissions.test.ts` |
| AC-13 teacher regression | manual smoke + build |
| AC-14 parent regression | parent-scope unchanged by design |
| AC-15 AB-1 regression | `src/lib/__tests__/assignment-state.test.ts` (기존 24 tests) |

## 10. Phase 3 판정

**PASS** — 10 섹션 모두 완비. phase4 design_planner 는 시각 변경 미미 (버튼 노출/숨김만)이라 **phase4 경량 design_brief** 로 진입. phase5 mockup 은 **skip 가능** (scope_decision §1.3 에 UI 변경 명세 충분).
