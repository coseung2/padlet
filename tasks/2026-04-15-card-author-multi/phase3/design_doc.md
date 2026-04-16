# Phase 3 — Architecture · card-author-multi

## 1. 데이터 모델

### 1.1 Prisma delta

```prisma
model Card {
  // … existing fields …
  authors CardAuthor[]
}

model Student {
  // … existing relations …
  cardAuthors CardAuthor[] @relation("StudentCardAuthors")
}

model CardAuthor {
  id          String   @id @default(cuid())
  cardId      String
  studentId   String?
  displayName String   // denormalised — survives student rename/delete
  order       Int      @default(0)
  createdAt   DateTime @default(now())

  card    Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  student Student? @relation("StudentCardAuthors", fields: [studentId], references: [id], onDelete: SetNull)

  @@unique([cardId, studentId])
  @@index([cardId, order])
  @@index([studentId])
}
```

### 1.2 Migration `prisma/migrations/20260415_add_card_author/migration.sql`

```sql
-- CardAuthor join table — phase3 design_doc §1.1
CREATE TABLE "CardAuthor" (
  "id"          TEXT PRIMARY KEY,
  "cardId"      TEXT NOT NULL,
  "studentId"   TEXT,
  "displayName" TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CardAuthor_cardId_studentId_key" ON "CardAuthor"("cardId","studentId");
CREATE INDEX "CardAuthor_cardId_order_idx" ON "CardAuthor"("cardId","order");
CREATE INDEX "CardAuthor_studentId_idx" ON "CardAuthor"("studentId");
ALTER TABLE "CardAuthor" ADD CONSTRAINT "CardAuthor_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE;
ALTER TABLE "CardAuthor" ADD CONSTRAINT "CardAuthor_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL;

-- Backfill — existing student-authored cards get a primary CardAuthor row.
-- Idempotent: WHERE NOT EXISTS prevents duplicates on re-run.
INSERT INTO "CardAuthor" ("id", "cardId", "studentId", "displayName", "order", "createdAt")
SELECT
  'caut_' || substr(md5(random()::text || c.id), 1, 20),
  c."id",
  c."studentAuthorId",
  COALESCE(NULLIF(c."externalAuthorName", ''),
           (SELECT s.name FROM "Student" s WHERE s.id = c."studentAuthorId"),
           'Author'),
  0,
  c."createdAt"
FROM "Card" c
WHERE c."studentAuthorId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CardAuthor" ca WHERE ca."cardId" = c."id"
  );
```

## 2. API 계약

### 2.1 `PUT /api/cards/[id]/authors`

**Auth**: teacher + canEditCard(identity, board, card) true (즉 board owner). student/parent → 403.

**Request**:
```ts
{
  authors: Array<{
    studentId?: string | null;   // 학급 학생 FK
    displayName: string;          // 1..60자
  }>;                             // 0..10 items
}
```

**Response 200**: `{ authors: AuthorDTO[], primary: { studentAuthorId, externalAuthorName } }`.

**Errors**:
- 400 `authors_too_many` (>10)
- 400 `duplicate_student` (같은 studentId 2회+)
- 400 `student_not_in_classroom` (studentId 가 board.classroomId 학생이 아님 — 학급 없는 보드는 이 가드 스킵)
- 400 `displayName_required`
- 403 `forbidden`

**Side effect (트랜잭션 내 원자)**:
1. `DELETE FROM CardAuthor WHERE cardId = :id`
2. `INSERT INTO CardAuthor (...)` batch (order 0..N-1 정규화)
3. `UPDATE Card SET studentAuthorId = authors[0].studentId, externalAuthorName = formatAuthorList(authors)` (0명이면 null)

### 2.2 기존 라우트 변경

- `POST /api/cards` — student path 에서 `setCardAuthors(tx, card.id, [{ studentId: student.id, displayName: student.name }])`.
- `POST /api/external/cards` — 동일 (Canva OAuth student 또는 authorName 있을 때).
- `POST /api/boards` assignment branch — per-student Card 생성 후 `setCardAuthors`.

### 2.3 `GET /api/classroom/[id]/students` — NEW

teacher-only. `{ students: Array<{ id, name, number }> }`. CardAuthorEditor 용.

### 2.4 DTO 타입

`src/types/card.ts` (NEW 또는 기존):
```ts
export type AuthorDTO = {
  id: string;
  studentId: string | null;
  displayName: string;
  order: number;
};
```

## 3. 컴포넌트 트리

```
/board/[id] (server)
└── board 컴포넌트 (4종)
    ├── <CardBody> — authors prop 내려줌
    │   └── <CardAuthorFooter authors={[...]} /> — formatAuthorList 사용
    └── <ContextMenu items={[ ..., '작성자 지정', ...]}>
        └── opens <CardAuthorEditor>
```

## 4. CardAuthorEditor UX 상세

### 4.1 상태

| 영역 | 필드 | 제약 |
|---|---|---|
| 학급 학생 multi-select | checkbox list, 번호순 | 학급 없는 보드는 숨김 |
| 선택된 학생 리스트 | order 위/아래 이동 버튼 | 최대 10명 |
| free-form 이름 | text list, + 버튼으로 행 추가 | displayName 60자, 최대 10명-선택된 학생수 |
| "primary" 뱃지 | 최상단 항목 | 자동 계산 (order=0) |

### 4.2 저장

`PUT /api/cards/[id]/authors` → 성공 시 parent 콜백 `onSaved(authors)` → 카드 state 업데이트.

### 4.3 접근성

- 모달 role=dialog + aria-labelledby
- 체크박스 list role=group
- 이동 버튼 aria-label "위로 / 아래로"

## 5. parent-scope 영향

본 phase 는 parent-scope 직접 수정 **없음**. 하지만 미래 `/parent/child/[sid]/cards` 피드를 위한 쿼리 예시 (phase11 docs 에 기록):

```ts
db.card.findMany({
  where: {
    authors: { some: { studentId: { in: childIds } } },
  },
  orderBy: { createdAt: "desc" },
});
```

## 6. 엣지케이스

- **E1** 중복 studentId — PUT 400, UI 클라 가드.
- **E2** Student 삭제 (Restrict 로 차단되는 게 정상, 현재 Student 삭제는 soft delete 만). 만약 hard delete 통과하면 CardAuthor.studentId = null + displayName 유지.
- **E3** 학급 없는 보드 + studentId 강제 시도 — 400 `student_not_in_classroom` (교사의 잘못된 호출 방어).
- **E4** authors=[] (전원 제거) — 허용. Card primary mirror null.
- **E5** order 중복 — server 가 0..N-1 재배치.
- **E6** Canva publish 동시 같은 studentId 두 번 — @@unique 로 두 번째 insert 실패 → 서버가 404/409 반환. 클라가 재시도 안 하면 1행만 생성됨.

## 7. 성능

- `CardAuthor` 는 카드당 평균 1-3 행. @@index([cardId, order]) 로 정렬 o(1).
- `@@index([studentId])` 로 student-centric 쿼리(미래 parent feed) o(log n).
- page.tsx include=authors 는 Prisma JOIN 1회.

## 8. 롤백

1. UI: `CardAuthorEditor` 삭제 → ⋯ 메뉴 항목 제거 → PUT endpoint 404.
2. API: `PUT /api/cards/[id]/authors` 제거 + POST student path 의 setCardAuthors 제거.
3. DB: DROP TABLE CardAuthor (CASCADE). `Card.studentAuthorId` + `externalAuthorName` 은 그대로라 렌더 깨짐 없음.

비파괴 backfill 이라 rollback 시에도 기존 카드 작성자 footer 정상 유지.

## 9. AC → 파일 매핑

| AC | 파일 |
|---|---|
| AC-1 schema+backfill | prisma/schema.prisma, migration.sql |
| AC-2 PUT auth | api/cards/[id]/authors/route.ts |
| AC-3 validation | 동 route |
| AC-4 primary mirror | card-authors-service.ts |
| AC-5 POST student stamp | api/cards/route.ts |
| AC-6 POST external stamp | api/external/cards/route.ts |
| AC-7 boards assignment | api/boards/route.ts |
| AC-8 render | CardAuthorFooter + formatAuthorList |
| AC-9 modal | CardAuthorEditor.tsx |
| AC-10 free-form only | CardAuthorEditor classroomId=null branch |
| AC-11 student delete | CardAuthor onDelete SetNull |
| AC-12 student can't edit | canEditCard (role-cleanup primitive) |
| AC-13 formatAuthorList test | card-author.vitest.ts |
| AC-14 service test | card-authors-service.vitest.ts |
| AC-15 tsc+build+vitest | phase9 |
| AC-16 regression | phase9 |

## 10. Phase 3 판정

**PASS** — 10 섹션 완비, 스키마·API·UI·엣지·rollback 매트릭스 완결. phase4 design brief 경량 + phase5 skip 후 phase7 진입.
