# Data Model — parent-class-invite-v2

Prisma schema diff. Path A 확정 (v1 drop → v2 create, 단일 migration).

---

## 1. enum 정의 (신규 2종 + 기존 1종 확장)

```prisma
enum ParentLinkStatus {
  pending
  active
  rejected
  revoked
}

// UI 드롭다운 = wrong_child | not_parent | other (3종)
// 시스템 자동 거부 = code_rotated | auto_expired (2종, UI 노출 안 함)
// other 계열 = classroom_deleted 는 revokedReason 에 있으므로 중복 금지
enum ParentRejectedReason {
  wrong_child
  not_parent
  other
  code_rotated
  auto_expired
}

// 기존 v1 3종 + v2 신규 4종 = 7종
enum ParentRevokedReason {
  teacher_revoked      // v1
  year_end             // v1 (수동 사유, Cron 없음 — AMENDMENT D-56)
  parent_self_leave    // v1
  rejected_by_teacher  // v2 — (사용상 rejectedReason 로 대체 가능하지만, 전이가 active→revoked 인 경우 기록)
  auto_expired_pending // v2 (pending→rejected 시점에선 rejectedReason 사용; active→revoked 엔 미사용)
  code_rotated         // v2 (동상)
  classroom_deleted    // v2 AMENDMENT
}
```

**판정 (architecture.md §5.4)**: INBOX D-05 은 `revokedReason` 에 `code_rotated`/`auto_expired_pending` 을 넣었으나, 해당 전이는 `pending → rejected` 이므로 **논리적 타겟은 `rejectedReason`**. `revokedReason` enum 에도 값을 유지하는 이유는 AMENDMENT 및 downstream 호환(감사 리포트) 목적.

---

## 2. 모델 diff

### 2.1 신규 — `ClassInviteCode`

```prisma
model ClassInviteCode {
  id             String    @id @default(cuid())
  classroomId    String
  code           String    @unique                // Crockford Base32 8 chars, CSPRNG
  codeHash       String    @unique                // sha256(code), timing-safe verify
  issuedById     String                           // teacher User.id
  expiresAt      DateTime?                        // null = 학기말 수동 만료
  maxUses        Int?                             // null = 무제한 (D-10)
  rotatedAt      DateTime?                        // null = 현재 활성 코드, 값 있으면 과거 히스토리
  createdAt      DateTime  @default(now())

  classroom Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  issuedBy  User      @relation("ClassInviteIssued", fields: [issuedById], references: [id])

  @@index([classroomId])
  @@index([rotatedAt])

  // 활성 코드(rotatedAt=null)는 학급당 1개 강제 — Postgres partial unique
  // migration.sql 에 직접 작성: CREATE UNIQUE INDEX ... ON "ClassInviteCode" ("classroomId") WHERE "rotatedAt" IS NULL;
}
```

### 2.2 수정 — `ParentChildLink`

```prisma
model ParentChildLink {
  id             String                @id @default(cuid())
  parentId       String
  studentId      String

  // 신규 상태 필드
  status         ParentLinkStatus      @default(pending)

  // 감사 필드 (D-07)
  requestedAt    DateTime              @default(now())
  approvedAt     DateTime?
  approvedById   String?                                     // User.id (teacher)
  rejectedAt     DateTime?
  rejectedById   String?
  rejectedReason ParentRejectedReason?

  // 기존 v1 revoke 필드 유지 + reason enum 확장
  revokedAt      DateTime?
  revokedById    String?
  revokedReason  ParentRevokedReason?

  createdAt      DateTime              @default(now())
  deletedAt      DateTime?             // soft delete 유지 (R-07)

  parent     Parent  @relation(fields: [parentId],   references: [id], onDelete: Cascade)
  student    Student @relation(fields: [studentId],  references: [id], onDelete: Cascade)
  approvedBy User?   @relation("LinkApprovedBy", fields: [approvedById], references: [id])
  rejectedBy User?   @relation("LinkRejectedBy", fields: [rejectedById], references: [id])
  revokedBy  User?   @relation("LinkRevokedBy",  fields: [revokedById],  references: [id])

  @@unique([parentId, studentId])       // D-08 유지
  @@index([studentId])
  @@index([parentId])
  @@index([status, requestedAt])        // Cron D+7 스캔 (AC A-1)
  @@index([deletedAt])
}
```

### 2.3 수정 — `Parent`

```prisma
model Parent {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String
  tier             String    @default("free")
  parentDeletedAt  DateTime?
  anonymizedAt     DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  children ParentChildLink[]
  sessions ParentSession[]
  // invites ParentInviteCode[] 관계 제거 (v1 drop)

  @@index([email])
  @@index([parentDeletedAt])
}
```

### 2.4 변경 없음 — `ParentSession`

의미론만 변경:
- signup 시점에 mint (기존과 동일)
- status 무관하게 유지 (scopeMiddleware 가 request 시점 판정)
- classroom cascade 시 `sessionRevokedAt` set

```prisma
// 기존 스키마 그대로 유지 (architecture.md §8.7)
model ParentSession { ... }
```

### 2.5 삭제 — `ParentInviteCode`

- 모델 전체 DROP
- Prisma schema 에서 제거 + migration SQL 에 `DROP TABLE "ParentInviteCode" CASCADE;`

### 2.6 추가 관계 — `Classroom` / `User`

```prisma
model Classroom {
  // ... 기존 필드 유지
  inviteCodes  ClassInviteCode[]    // NEW
  // 기존 boards, students 관계 유지
}

model User {
  // ... 기존 필드 유지
  classInvitesIssued  ClassInviteCode[]     @relation("ClassInviteIssued")
  approvedLinks       ParentChildLink[]     @relation("LinkApprovedBy")
  rejectedLinks       ParentChildLink[]     @relation("LinkRejectedBy")
  revokedLinks        ParentChildLink[]     @relation("LinkRevokedBy")
}
```

### 2.7 `BoardMember` (재확인 — R-7 해소)

R-7 구현 리스크: `BoardMember.role` 이 parent 를 수용하는지. 현재 프로젝트 `BoardMember` 스키마를 phase7 coder 가 확인하여:
- role enum/string 에 `parent` 포함 없으면 **migration 추가** (enum 확장 또는 string 그대로 두고 seed 값만 확장)
- phase7 착수 첫 10분 내 확인 후 schema patch

본 phase3 는 **`BoardMember.role` 이 string(자유) 형 또는 `parent` 를 포함하는 enum** 으로 전제하고 설계. string 형이면 추가 migration 없이 가능, enum 형이면 ParentRevokedReason 과 동일한 패턴으로 ADD VALUE.

---

## 3. state 전이 제약

`src/lib/parent-link-state.ts` (신규) 에서 상수 맵으로 enforcement:

```
ALLOWED_TRANSITIONS = {
  pending:  ['active', 'rejected'],        // approve / reject / auto_expire / code_rotated
  active:   ['revoked'],                    // teacher_revoked / year_end / parent_self_leave / classroom_deleted
  rejected: [],                              // dead-end
  revoked:  [],                              // dead-end
}
```

위반 시 API 가 409 `STATE_CONFLICT` 반환 (AC A-3).

---

## 4. 마스킹 함수 contract (phase7 참조용, lib 별도)

```
maskName(fullName: string): string
  - NFC 정규화
  - 복성 whitelist: ["남궁","황보","선우","제갈","독고","동방","사공","서문"] → 성 2자
  - 그 외 성 1자
  - 나머지 문자를 '○' 로 치환
  - edge:
    - 1자 이름 → 원본 반환 (성 1자만)
    - 빈 문자열 → "○" 반환 (panic-free)
```

unit test 케이스 ≥ 10개 (phase9 QA).

---

## 5. AC 교차표 (data-level)

| AC | 컬럼/제약 |
|---|---|
| A-1 | 본 문서 전체 |
| A-2 | `ClassInviteCode.code @unique` + CSPRNG lib |
| A-3 | state 전이 enforcement (§3) |
| A-4 | `ParentChildLink @@unique([parentId,studentId])` |
| A-8 | 앱단 count query `WHERE parentId=… AND status='pending'` < 3 |
| A-11 | 회전 시 `ParentChildLink` 건드리지 않음 (active 유지) |
| A-12 | Prisma select projection + zod response schema |
| A-17 | `@@index([status, requestedAt])` |
| A-24 | `revokedReason = classroom_deleted` |
