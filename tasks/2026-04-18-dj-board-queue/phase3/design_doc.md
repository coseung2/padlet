# Design Doc — dj-board-queue

## 1. 데이터 모델 변경

### 1.1 신규 테이블 3개

```prisma
// 역할 사전. 키를 코드에 하드코딩하지 않고 row로 취급 → 사서/은행원 추가 = DB 1행.
model ClassroomRoleDef {
  id          String   @id @default(cuid())
  key         String   @unique            // "dj" | "librarian" | "banker"
  labelKo     String                       // "DJ", "사서", "은행원"
  emoji       String?                      // "🎧"
  description String   @default("")
  createdAt   DateTime @default(now())

  grants      BoardLayoutRoleGrant[]
  assignments ClassroomRoleAssignment[]
}

// (classroom-role, board-layout) → board-role 매핑. data-driven.
// ex: (dj, dj-queue) → "owner"
//     (librarian, librarian-shelf) → "editor" (향후)
model BoardLayoutRoleGrant {
  id              String   @id @default(cuid())
  classroomRoleId String
  boardLayout     String                    // "dj-queue" 등 Board.layout 값
  grantedRole     String                    // "owner" | "editor" (Role enum 준수)
  createdAt       DateTime @default(now())

  classroomRole   ClassroomRoleDef @relation(fields: [classroomRoleId], references: [id], onDelete: Cascade)

  @@unique([classroomRoleId, boardLayout])
  @@index([boardLayout])                    // hot path: layout-first lookup
}

// 학급별 학생-역할 할당. classroom-scoped (보드별 아님).
model ClassroomRoleAssignment {
  id              String   @id @default(cuid())
  classroomId     String
  studentId       String
  classroomRoleId String
  assignedById    String                     // teacher User.id (audit)
  assignedAt      DateTime @default(now())

  classroom     Classroom        @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  student       Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classroomRole ClassroomRoleDef @relation(fields: [classroomRoleId], references: [id], onDelete: Restrict)
  assignedBy    User             @relation("ClassroomRoleAssignedBy", fields: [assignedById], references: [id])

  @@unique([classroomId, studentId, classroomRoleId])   // 같은 학생×역할 중복 불가
  @@index([classroomId, classroomRoleId])               // hot path: "학급 X의 DJ들"
  @@index([studentId])
}
```

### 1.2 Card 컬럼 1개 추가

```prisma
model Card {
  // ...기존 필드 유지
  queueStatus String?   // null=비-큐 카드. "pending"|"approved"|"played"|"rejected".
  // 인덱스는 DJ 보드 queryset이 커질 경우만 (MVP는 추가 안 함, phase10 재검토)
}
```

**근거**: QueueEntry 별도 테이블 대신 Card 재사용 (scope §§IN). Card의 SSE/author/attachment 인프라 그대로 승계.

### 1.3 기존 모델 역참조 추가

```prisma
model Classroom {
  // ...기존
  roleAssignments ClassroomRoleAssignment[]   // 역방향
}

model Student {
  // ...기존
  roleAssignments ClassroomRoleAssignment[]   // 역방향
}

model User {
  // ...기존
  roleAssignmentsGranted ClassroomRoleAssignment[] @relation("ClassroomRoleAssignedBy")
}
```

### 1.4 Board.layout 스키마 enum 확장

`src/app/api/boards/route.ts:23-33` 의 `z.enum([...])`에 **`"dj-queue"`** 1개 추가.
DB 스키마상 `Board.layout`은 `String`이라 migration 불필요. zod만 확장.

### 1.5 마이그레이션 + seed 전략

- 단일 Prisma migration: `2026_04_18_dj_board_role_grants`
- 작업: `CREATE TABLE ClassroomRoleDef`, `CREATE TABLE BoardLayoutRoleGrant`, `CREATE TABLE ClassroomRoleAssignment`, `ALTER TABLE Card ADD COLUMN queueStatus TEXT NULL`
- 전부 additive. existing Card row에는 NULL 기본값. 테이블 rewrite/락 없음.
- **Seed**: migration 적용 직후 실행될 idempotent seed (`prisma/seed.ts`에 추가 또는 neutron script).
  - `ClassroomRoleDef.upsert({where:{key:"dj"}, create:{key:"dj", labelKo:"DJ", emoji:"🎧", description:"DJ 큐 보드에서 곡 승인·정렬"}})`
  - 위 row로 `BoardLayoutRoleGrant.upsert({where:{classroomRoleId_boardLayout:{classroomRoleId:dj.id, boardLayout:"dj-queue"}}, create:{grantedRole:"owner"}})`
- seed 실행 시점: Vercel build-phase가 아닌 `prisma migrate deploy` 후 **수동 1회** 또는 `npm run db:seed` (prod는 Vercel의 `postdeploy` 또는 수동 curl).

### 1.6 migration 순서 불변성

phase10 배포 순서 (엄격):
1. PR 머지 → Vercel build
2. Vercel은 build 전 `prisma migrate deploy` 실행 (기존 관행)
3. 신규 테이블 생성 + Card.queueStatus 컬럼 추가
4. 앱 시작 (배포 완료)
5. 수동 또는 자동 후처리: `npx tsx prisma/seed.ts` — dj role + grant row 삽입
6. 교사가 `/classroom/:id`에서 DJ 역할 할당 UI 확인 → 학생 선택 → 할당

---

## 2. API 변경

### 2.1 신규 엔드포인트

모든 엔드포인트는 JSON body. 응답 공통: 성공시 `200` + 리소스 JSON, 실패시 status + `{error: string}`.

#### 2.1.1 큐 CRUD

| Method | Path | 인증 | Req body | Response | 권한 |
|---|---|---|---|---|---|
| `POST` | `/api/boards/:id/queue` | student OR user | `{youtubeUrl: string, note?: string}` | `{card: CardDTO}` (queueStatus="pending") | 학급 소속이면 누구나 |
| `PATCH` | `/api/boards/:id/queue/:cardId` | user/student | `{status: "approved"\|"rejected"\|"played"}` | `{card: CardDTO}` | effectiveRole ∈ {owner,editor} |
| `PATCH` | `/api/boards/:id/queue/:cardId/move` | user/student | `{order: number}` | `{card: CardDTO}` | effectiveRole ∈ {owner,editor} |
| `DELETE` | `/api/boards/:id/queue/:cardId` | user/student | - | `{ok: true}` | DJ/교사 OR (pending + 본인 submission) |

- `POST`: 서버에서 YouTube URL validation (정규식 + oEmbed fetch). 실패 시 400.
  - videoId 추출 → linkUrl에 canonical URL, linkTitle=oEmbed title, linkImage=oEmbed thumbnail_url.
  - `videoUrl` 필드에도 동일 URL 저장 (클라이언트 embed용).
  - `queueStatus="pending"`, `order`=현재 max(order)+1.
  - `authorId`: 요청이 student면 → board.classroom.teacherId (fallback), `studentAuthorId`=student.id, `externalAuthorName`=student.name. 요청이 teacher면 → user.id.

- `PATCH .../:cardId`: status transition validation. `"rejected"`에서 `"pending"`로 돌아가는 역전이는 금지 (400).

- `PATCH .../:cardId/move`: order 재정렬. 동시성은 `normalizeQueueOrder(boardId)` (server-side) 사용 — 현재 ColumnsBoard reorder와 동일 전략.

- `DELETE`: role check OR (queueStatus==="pending" AND card.studentAuthorId === current student id).

#### 2.1.2 역할 할당

| Method | Path | 인증 | Req body | Response |
|---|---|---|---|---|
| `GET` | `/api/classrooms/:id/roles` | teacher | - | `{defs: RoleDef[], assignments: Assignment[]}` |
| `POST` | `/api/classrooms/:id/roles/assign` | teacher | `{studentId: string, roleKey: string}` | `{assignment: Assignment}` |
| `DELETE` | `/api/classrooms/:id/roles/assign/:assignmentId` | teacher | - | `{ok: true}` |

- `GET`: 현재 할당 현황을 교사 UI에 표시. 모든 학생 + DJ 플래그 여부.
- `POST`: 동일 (classroom, student, role) 중복 시 409. student가 해당 classroom 소속이 아닐 시 400.
- `DELETE`: idempotent.

### 2.2 수정 엔드포인트

#### 2.2.1 `POST /api/boards`

- `z.enum`에 `"dj-queue"` 추가.
- `dj-queue` 분기: `classroomId` required (zod refine). null 시 400 `"DJ 큐 보드는 학급에 속해야 합니다."`

#### 2.2.2 `GET /api/boards/:id/stream`

- 현재 line 41-44: `user = getCurrentUser()` 실패 시 401 반환.
- **변경**: `user`가 없으면 `getCurrentStudent()` fallback 시도. 둘 다 없으면 401.
- `getEffectiveBoardRole(boardId, {userId, studentId})`로 권한 체크 (기존 `getBoardRole` 대체).
- `CardWire`에 `queueStatus: string | null` 필드 추가. `findMany`는 Card 전체 select라 이미 fetch됨.

#### 2.2.3 `src/app/board/[id]/page.tsx`

- `case "dj-queue":` 분기 추가 → `<DJBoard {...common} initialCards={cardProps} />`.
- `LAYOUT_LABEL`에 `"dj-queue": "DJ 큐"` 추가.
- `effectiveRole` 계산 부분을 `getEffectiveBoardRole`로 통일 (teacher + student 두 path 모두).

### 2.3 실시간 이벤트

기존 `GET /api/boards/:id/stream`의 `snapshot` 이벤트에 `queueStatus`가 포함되는 것 외에 **별도 이벤트 추가 없음**. 폴링 주기 3초 기존 유지. 승인/재정렬 즉시 SSE diff로 전파 (< 3초).

- delivery 보장: at-least-once. 클라이언트의 `pendingCardIds` set이 in-flight 변경을 덮어쓰지 않게 함 (기존 패턴 재사용).

---

## 3. 컴포넌트 변경

### 3.1 신규 컴포넌트 트리

```
<DJBoard>                              ← src/components/DJBoard.tsx
  ├─ <DJNowPlayingHeader card? />      ← src/components/dj/DJNowPlayingHeader.tsx
  ├─ <DJQueueList cards onReorder />   ← src/components/dj/DJQueueList.tsx
  │    └─ <DJQueueItem card role />    ← src/components/dj/DJQueueItem.tsx
  ├─ <DJSubmitForm onSubmit />         ← src/components/dj/DJSubmitForm.tsx (모달)
  └─ <EmptyState />                    ← 간단 inline (신규 컴포넌트 아님)

<ClassroomDJRolePanel>                 ← src/components/classroom/ClassroomDJRolePanel.tsx
  ├─ <StudentRow student isDJ />
  └─ <AssignToggle />
```

### 3.2 상태 위치

| 상태 | 위치 | 전파 |
|---|---|---|
| `cards` (DJ 큐 전체) | DJBoard `useState` | initial props + SSE merge |
| `sortMode` | — | DJ 큐는 **sortMode 없음** (수동 순서 전용). columns의 sort-select UI는 DJ에 빌드 안 함 |
| `pendingCardIds` | DJBoard `useRef<Set>` | 기존 ColumnsBoard 패턴 |
| `draggingId` | DJQueueList local | CSS state only |
| `submitModalOpen` | DJBoard | 모달 토글 |
| `effectiveRole` | page.tsx 서버 컴포넌트 → prop | stateless |
| `roleAssignments` (ClassroomDJRolePanel) | panel `useState` + fetch | fetch on mount, revalidate on mutate |

### 3.3 재사용 컴포넌트

- `ContextMenu` — row overflow menu (기존)
- `Modal` / `ConfirmDialog` — submit 모달 (기존 inventory 재활용)
- `CardAuthorFooter` — 제출자 표시 (기존, 수정 불필요)

### 3.4 수정 컴포넌트

- `src/components/CreateBoardModal.tsx:LAYOUTS` — `{id:"dj-queue", emoji:"🎧", label:"DJ 큐", desc:"학생들이 YouTube 곡을 신청하고 DJ가 재생 순서를 관리"}` 추가. classroom-required 목록에도 `"dj-queue"` 추가.
- `src/app/board/[id]/page.tsx` — layout switch에 `case "dj-queue"` 추가, `effectiveRole` 계산 rbac 확장.
- `src/app/classroom/[id]/page.tsx` — `<ClassroomDJRolePanel classroomId />` 플러그인 (교사 전용 섹션).

---

## 4. 데이터 흐름 다이어그램

### 4.1 학생 곡 제출 흐름

```
Student (DJSubmitForm)
  └─▶ POST /api/boards/:id/queue
        body: {youtubeUrl, note?}
        └─▶ [server]
              1. getCurrentStudent() → student
              2. board = Board.findUnique + {classroom:true}
              3. student.classroomId === board.classroomId? else 403
              4. validateYouTubeUrl(youtubeUrl) → {videoId, normalized} else 400
              5. oEmbed fetch (https://www.youtube.com/oembed?url=...) → {title, thumbnail_url, author_name} — fail → 400 "재생 불가"
              6. db.card.create({
                   boardId, authorId=classroom.teacherId, studentAuthorId=student.id,
                   externalAuthorName=student.name, title, linkUrl=normalized,
                   linkImage=thumbnail_url, videoUrl=normalized,
                   queueStatus="pending", order=maxOrder+1
                 })
              7. return {card: CardDTO}
  └─◀ optimistic insert in DJQueueList
  └─◀ SSE snapshot (< 3s) — reconciles authoritative data
```

### 4.2 DJ 승인 흐름

```
Student-DJ (DJQueueItem "승인" button)
  └─▶ PATCH /api/boards/:id/queue/:cardId
        body: {status: "approved"}
        └─▶ [server]
              1. getCurrentStudent() or getCurrentUser()
              2. getEffectiveBoardRole(boardId, {userId, studentId})
              3. role ∈ {owner,editor}? else 403
              4. card.queueStatus != status? update, else noop
              5. return {card}
  └─◀ optimistic status update
  └─◀ SSE snapshot propagates to other open browsers
```

### 4.3 권한 해석 흐름 (`getEffectiveBoardRole`)

```
getEffectiveBoardRole(boardId, {userId?, studentId?})
  │
  ├─ if userId:
  │    role = getBoardRole(boardId, userId)
  │    if role in {owner, editor}: return role    ← 교사 항상 승리
  │
  ├─ if studentId:
  │    board = Board.findUnique({id}, select:{classroomId, layout})
  │    if student.classroomId !== board.classroomId: skip
  │    assignments = ClassroomRoleAssignment.findMany({classroomId, studentId})
  │      → classroomRoleIds: string[]
  │    grants = BoardLayoutRoleGrant.findMany({
  │              classroomRoleId: IN roleIds, boardLayout: board.layout
  │           })
  │    if grants.length > 0:
  │      return max(grants.grantedRole by priority owner > editor > viewer)
  │    return "viewer"                             ← 학급 소속 학생 기본
  │
  └─ else: return null
```

쿼리 수: userId 경로 1쿼리(`BoardMember`) / studentId 경로 최대 3쿼리(`Board`, `ClassroomRoleAssignment`, `BoardLayoutRoleGrant`). SSE 60초 permission recheck에서 반복되는데, 단일 요청 메모이제이션은 phase7에서 간단한 request-scoped cache로 처리.

---

## 5. 엣지케이스

1. **비-DJ 학생이 reorder API 직접 curl** → `getEffectiveBoardRole` = "viewer" → 403. 클라이언트 UI는 드래그 핸들 자체 숨김.

2. **DJ 역할 revoke 직후 열려있는 SSE 세션** → SSE recheck 주기(60초) 안에는 권한 유지됨. `PATCH/DELETE` API는 매 요청마다 `getEffectiveBoardRole` 재호출하므로 revoke 즉시 적용. UI-server 일시 lag 발생 (AC-9 "30초 이내" 기준 충족).

3. **classroomId=null 보드에 DJ 레이아웃** → `POST /api/boards`의 zod refine이 창조 자체를 차단 (400). 방어적으로 `getEffectiveBoardRole` studentId 경로도 `board.classroomId`가 없으면 skip.

4. **YouTube URL oEmbed 실패 (private/삭제된 영상)** → 제출 시점 400 "재생 불가". 이미 큐에 있는 항목이 나중에 private 전환되면 썸네일/제목만 stale — 재생 시 YouTube embed가 실패 메시지 표시. 별도 처리 없음 (UX 퇴보 방지만; MVP scope 벗어남).

5. **동시 재정렬 race** — DJ 2명 동시 드래그 → 양쪽 mutation이 order 값을 각자 설정 → 후속 요청이 이전 요청을 덮어씀. SSE 3초 내에 authoritative state 수렴. 기존 ColumnsBoard와 동일 패턴이므로 신규 방어 코드 없음.

6. **큐 무한 확장** — 1학급 학생 30명이 각 5곡 제출 = 150개. Card.findMany + 세로 리스트 렌더 문제 없음. 500곡 이상이 되면 클라이언트 렌더 부담 → 향후 페이지네이션 task.

7. **역할 할당 중복** — 교사가 같은 (student, DJ) 2회 할당 시도 → `@@unique` 제약으로 Prisma P2002 → 서버가 409. UI는 이미 DJ인 학생은 토글 off 상태로 표시.

8. **DJ 학생의 타 레이아웃 보드 접근** — `BoardLayoutRoleGrant`에 `(dj, columns)` 매핑 없음 → `getEffectiveBoardRole` 3단계 fallthrough → "viewer". 드래그/승인 UI 안 보임. AC-8 충족.

9. **role revoke 후 학생이 올렸던 pending 카드** — 자동 삭제 안 함. 카드는 그대로, 그저 해당 학생이 더 이상 승인/재정렬을 못함. 교사가 정리.

10. **`ClassroomRoleDef` seed 누락 (운영자 실수)** — `GET /api/classrooms/:id/roles`가 `defs: []` 반환 → 교사 UI가 "역할이 없습니다" 표시 + re-run seed 안내. 배포 phase10 체크리스트에 `SELECT COUNT(*) FROM "ClassroomRoleDef" WHERE key='dj'` ≥ 1 검증 포함.

---

## 6. DX 영향

### 6.1 타입/린트

- 새 Prisma 모델 3개 → 자동 type generation. 클라이언트 코드에서 `Prisma.ClassroomRoleDef` 등 import.
- `z.enum(["freeform", ..., "dj-queue"])` 확장 — 기존 호출부 3곳 영향 확인 필요.
- `Role` enum 확장 없음 (기존 "owner"|"editor"|"viewer" 그대로 재사용).

### 6.2 테스트

- unit 테스트 관행이 약한 repo 특성상 phase9 e2e에 몰빵. phase7에선 rbac `getEffectiveBoardRole` 순수함수화 (실제 DB 호출은 injected) → 단위 테스트 가능하지만 MVP 제외.

### 6.3 빌드/배포

- Prisma migration 1개 추가 (`prisma/migrations/2026_04_18_dj_board_role_grants/`).
- seed script 업데이트 (`prisma/seed.ts`에 upsert 2문장).
- Vercel build에 별도 환경변수 추가 없음. oEmbed 호출은 공개 엔드포인트 (토큰 없음).

### 6.4 번들 크기

- 신규 컴포넌트 ~6개, 대부분 reactive. react-draggable/기존 drag 인프라 재사용. 추가 npm 없음.
- YouTube 썸네일은 `linkImage` URL 사용 (`img` 엘리먼트) — next/image 최적화는 phase7 결정.

---

## 7. 롤백 계획

### 7.1 롤백 트리거

- Prisma migration 실패 → Vercel build fail → 자동 직전 배포 유지 (코드 배포도 롤백됨)
- 배포 성공 후 P1 버그 (권한 우회, 전체 보드 접근 불가 등) → 다음 절차

### 7.2 롤백 절차

1. **Git**: `git revert <feat-commit>` on main → push → Vercel 재배포.
2. **DB**: 기존 테이블 삭제는 **하지 않음**. 새 테이블과 `Card.queueStatus`는 NULL 그대로 남음 — 기존 레이아웃 코드 경로엔 영향 0.
3. **Classroom role assignment 데이터**: 롤백 이후 재배포 시 다시 살아남 (migration forward 재실행되어도 `IF NOT EXISTS` 등가).

즉 **forward-compatible 롤백**. DB를 건드리지 않고도 기능만 OFF 시킬 수 있음.

### 7.3 DB-only 롤백 스크립트 (유사시)

```sql
-- 완전 제거가 필요한 경우 (권장하지 않음 — data loss)
DROP TABLE IF EXISTS "ClassroomRoleAssignment";
DROP TABLE IF EXISTS "BoardLayoutRoleGrant";
DROP TABLE IF EXISTS "ClassroomRoleDef";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "queueStatus";
```

phase10에 `rollback.sql`로 동반 커밋 (실행 안 하되 보관).

---

## 8. 주요 파일 영향 체크리스트 (phase7 작업 범위)

| 파일 | 변경 | 검증 |
|---|---|---|
| `prisma/schema.prisma` | +3 model, +1 Card 컬럼, 역참조 +4 | `prisma format` + `prisma validate` |
| `prisma/migrations/2026_04_18_dj_board_role_grants/migration.sql` | 신규 | `prisma migrate dev` local 통과 |
| `prisma/seed.ts` | +DJ role upsert | idempotent 실행 확인 |
| `src/lib/rbac.ts` | +getEffectiveBoardRole | 기존 `getBoardRole` 호출부 전부 동작 |
| `src/app/api/boards/route.ts` | z.enum +dj-queue, classroomId refine | zod 통과 |
| `src/app/api/boards/[id]/queue/route.ts` | 신규 POST | 수동 curl 통과 |
| `src/app/api/boards/[id]/queue/[cardId]/route.ts` | 신규 PATCH, DELETE | 동일 |
| `src/app/api/boards/[id]/queue/[cardId]/move/route.ts` | 신규 PATCH | 동일 |
| `src/app/api/classrooms/[id]/roles/route.ts` | 신규 GET | 동일 |
| `src/app/api/classrooms/[id]/roles/assign/route.ts` | 신규 POST | 동일 |
| `src/app/api/classrooms/[id]/roles/assign/[assignmentId]/route.ts` | 신규 DELETE | 동일 |
| `src/app/api/boards/[id]/stream/route.ts` | +getCurrentStudent fallback, +queueStatus wire | AC-4 SSE 전파 확인 |
| `src/app/board/[id]/page.tsx` | +case "dj-queue", effectiveRole swap | 모든 기존 레이아웃 그대로 동작 |
| `src/app/classroom/[id]/page.tsx` | +ClassroomDJRolePanel | 교사만 노출 |
| `src/components/CreateBoardModal.tsx` | LAYOUTS + dj-queue | 생성 플로우 통과 |
| `src/components/DJBoard.tsx` | 신규 | — |
| `src/components/dj/*.tsx` (4 파일) | 신규 | — |
| `src/components/classroom/ClassroomDJRolePanel.tsx` | 신규 | — |
| `src/lib/youtube.ts` (또는 util) | `validateYoutubeUrl` + `extractVideoId` + oEmbed fetch | URL 변형 테이블 대응 |
| `src/styles/boards.css` | `.dj-queue-*` 클래스 | design-system token 준수 |

---

## 9. 보안 민감 영역 (phase8 `/cso` 필수)

- `getEffectiveBoardRole` precedence 테이블
- `/api/boards/:id/queue` POST의 student 인증 우회 가능성
- `/api/classrooms/:id/roles/assign` POST에서 classroom teacher 검증 + student↔classroom 일치 강제
- YouTube URL inject (SSRF 가능성): `oEmbed` fetch 시 hostname 화이트리스트 (youtube.com/youtu.be만) 강제. 그 외 URL로 oEmbed 호출 금지.
