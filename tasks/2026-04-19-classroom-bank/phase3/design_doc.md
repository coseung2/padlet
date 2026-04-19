# Design Doc — classroom-bank

## 1. 데이터 모델 변경

### 1.1 신규 테이블 7개

```prisma
// 학급 단위 화폐 설정. 학급 생성 시 lazy create (교사 첫 접근 시 upsert).
model ClassroomCurrency {
  classroomId         String   @id
  unitLabel           String   @default("원")
  monthlyInterestRate Float?                         // 교사 입력 필수. null = 적금 상품 비활성
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  classroom           Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
}

// 학생 통장. 학생 생성 시 auto-create (Student 삽입 후 Account 자동 insert via Prisma or app-layer).
model StudentAccount {
  id            String   @id @default(cuid())
  classroomId   String                               // 비정규화 (JOIN 회피)
  studentId     String   @unique                     // 1학생 1통장 strict
  balance       Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  student       Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classroom     Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  cards         StudentCard[]
  transactions  Transaction[]
  fixedDeposits FixedDeposit[]
  @@index([classroomId])
}

// 체크카드. account당 1장 자동 발급 (MVP). 분실/재발급 고려는 phase 2+.
model StudentCard {
  id         String   @id @default(cuid())
  accountId  String   @unique                        // MVP: 1 account = 1 card
  cardNumber String   @unique                        // 표시용 "5501-1234"
  qrSecret   String                                  // HMAC secret for token rotation
  status     String   @default("active")             // active | frozen | revoked
  issuedAt   DateTime @default(now())
  account    StudentAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
}

// 매점 상품. stock null = 무제한.
model StoreItem {
  id          String   @id @default(cuid())
  classroomId String
  name        String
  price       Int
  stock       Int?
  imageUrl    String?
  archived    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  @@index([classroomId, archived])
}

// 한달만기 적금.
model FixedDeposit {
  id             String    @id @default(cuid())
  accountId      String
  principal      Int
  monthlyRate    Float                              // 가입 시점 snapshot (학급 rate 복사)
  startDate      DateTime  @default(now())
  maturityDate   DateTime
  status         String    @default("active")       // active | matured | early_withdrawn
  maturedAt      DateTime?
  openedById     String                             // User.id 또는 Student.id (audit)
  openedByKind   String                             // "teacher" | "banker"
  account        StudentAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  @@index([accountId, status])
  @@index([maturityDate, status])                   // cron 만기 스캔용
}

// 거래 원장. type별 의미:
//   deposit        — 학생 저축 입금
//   withdraw       — 학생 인출
//   purchase       — 매점 카드 결제
//   refund         — 환불 (MVP out, 필드만 준비)
//   fd_open        — 적금 가입 (통장 차감)
//   fd_matured     — 적금 만기 (통장 입금)
//   fd_cancelled   — 적금 중도해지 (통장 입금, 원금만)
model Transaction {
  id              String    @id @default(cuid())
  accountId       String
  type            String
  amount          Int                                // 항상 양수. 방향은 type으로 결정
  balanceAfter    Int                                // 거래 직후 잔액 (감사)
  note            String?
  storeItemId     String?
  fixedDepositId  String?
  performedById   String                             // User.id 또는 Student.id
  performedByKind String                             // "teacher" | "banker" | "store-clerk" | "system"
  createdAt       DateTime  @default(now())
  account         StudentAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  storeItem       StoreItem?     @relation(fields: [storeItemId], references: [id], onDelete: SetNull)
  fixedDeposit    FixedDeposit?  @relation(fields: [fixedDepositId], references: [id], onDelete: SetNull)
  @@index([accountId, createdAt])
  @@index([fixedDepositId])
}

// 학급별 역할 권한 오버라이드. 없으면 default permission set 적용 (phase7 constants 정의).
model ClassroomRolePermission {
  id          String  @id @default(cuid())
  classroomId String
  roleKey     String                                 // "banker" | "store-clerk" | ...
  permission  String                                 // "bank.deposit" 등 PERMISSION_CATALOG 키
  granted     Boolean @default(true)
  @@unique([classroomId, roleKey, permission])
  @@index([classroomId, roleKey])
}
```

### 1.2 기존 모델 역참조 추가

```prisma
model Classroom {
  // ...기존
  currency        ClassroomCurrency?
  studentAccounts StudentAccount[]
  storeItems      StoreItem[]
}

model Student {
  // ...기존
  account         StudentAccount?
}
```

### 1.3 Seed 데이터 (migration 내부 idempotent INSERT)

```sql
-- 새 역할 2종 추가 (DJ는 이미 존재)
INSERT INTO "ClassroomRoleDef" (id, key, labelKo, emoji, description)
SELECT 'banker_seed_id', 'banker', '은행원', '💰', '학급 은행 입출금·적금 처리'
WHERE NOT EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE key='banker');

INSERT INTO "ClassroomRoleDef" (id, key, labelKo, emoji, description)
SELECT 'store_clerk_seed_id', 'store-clerk', '매점원', '🏪', '학급 매점 상품 관리 및 결제'
WHERE NOT EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE key='store-clerk');

-- default permissions (ClassroomRolePermission)는 학급별 lazy seed (첫 접근 시).
-- Migration 시점엔 학급 수를 몰라 seed 못 함.
```

### 1.4 Migration 전략

- 단일 migration `20260419_classroom_bank`
- 7개 CREATE TABLE + 3 ALTER TABLE (Classroom/Student 역참조) + 2 INSERT
- 모두 additive. 기존 데이터 영향 0
- Rollback: DROP TABLE reverse order (상세는 phase7에 rollback.sql)

---

## 2. API 변경

### 2.1 신규 엔드포인트

모든 응답: 성공 `200` + JSON, 실패 status + `{error: string}`.

#### 2.1.1 은행

| Method | Path | Body | Guard |
|---|---|---|---|
| `POST` | `/api/classrooms/:id/bank/deposit` | `{studentId, amount, note?}` | `bank.deposit` |
| `POST` | `/api/classrooms/:id/bank/withdraw` | `{studentId, amount, note?}` | `bank.withdraw` |
| `POST` | `/api/classrooms/:id/bank/fixed-deposits` | `{studentId, principal}` | `bank.fd.open` |
| `POST` | `/api/classrooms/:id/bank/fixed-deposits/:fdId/cancel` | — | `bank.fd.cancel` |

**공통 validation**:
- amount/principal > 0
- `studentId`가 해당 classroom 소속
- withdraw/fd_open: account.balance >= amount (DB transaction에서 재검증)

#### 2.1.2 매점

| Method | Path | Body | Guard |
|---|---|---|---|
| `GET` | `/api/classrooms/:id/store/items` | — | teacher OR classroom member |
| `POST` | `/api/classrooms/:id/store/items` | `{name, price, stock?, imageUrl?}` | `store.item.manage` |
| `PATCH` | `/api/classrooms/:id/store/items/:itemId` | partial | `store.item.manage` |
| `DELETE` | `/api/classrooms/:id/store/items/:itemId` | — | `store.item.manage` (soft delete → archived=true) |
| `POST` | `/api/classrooms/:id/store/charge` | `{cardQrToken, items: [{itemId, qty}]}` | `store.charge` |

#### 2.1.3 학생용

| Method | Path | 반환 | Guard |
|---|---|---|---|
| `GET` | `/api/my/wallet` | `{balance, card: {cardNumber, ...}, recentTxns: [...], activeFds: [...]}` | student session |
| `GET` | `/api/my/wallet/card-qr` | `{token, expiresAt}` | student session (본인 카드) |

**QR 토큰 발급 로직**:
- HMAC(cardSecret, `${cardId}:${epochMinute}:${nonce}`)
- `expiresAt` = 현재 시각 + 60초
- 서버가 발급한 nonce는 `QRConsumedNonce` 테이블 (또는 in-memory) 에 저장, 결제 성공 시 소비 표시

...실제 캐시는 구현 시 Upstash Redis 또는 in-memory Map (Vercel serverless 특성상 Upstash가 안전). phase7 결정.

#### 2.1.4 권한/화폐 설정

| Method | Path | Body | Guard |
|---|---|---|---|
| `GET` | `/api/classrooms/:id/role-permissions` | — | classroom teacher |
| `PUT` | `/api/classrooms/:id/role-permissions/:roleKey` | `{permissions: {[key]: boolean}}` | classroom teacher |
| `PATCH` | `/api/classrooms/:id/currency` | `{unitLabel?, monthlyInterestRate?}` | classroom teacher |

#### 2.1.5 Cron

- `POST /api/cron/fd-maturity` — Vercel cron, 매일 00:05 KST (`5 15 * * *` UTC)
- 작업: `FixedDeposit.findMany {status:"active", maturityDate: {lte: now}}` 루프:
  - `db.$transaction`:
    - `balance += principal × (1 + monthlyRate/100)` (소수점 버림, Math.floor)
    - `FixedDeposit.status="matured", maturedAt=now()`
    - `Transaction.create(type="fd_matured", amount=interest+principal, balanceAfter=new balance, performedByKind="system")`

### 2.2 PERMISSION_CATALOG

`src/lib/bank-permissions.ts`에 상수 정의:

```ts
export const PERMISSION_CATALOG = {
  "bank.deposit": { label: "통장 입금", defaultRoles: ["banker"], category: "bank" },
  "bank.withdraw": { label: "통장 출금", defaultRoles: ["banker"], category: "bank" },
  "bank.fd.open": { label: "적금 가입", defaultRoles: ["banker"], category: "bank" },
  "bank.fd.cancel": { label: "적금 중도해지", defaultRoles: ["banker"], category: "bank" },
  "store.item.manage": { label: "매점 상품 관리", defaultRoles: ["store-clerk"], category: "store" },
  "store.charge": { label: "매점 카드 결제", defaultRoles: ["store-clerk"], category: "store" },
} as const;
```

### 2.3 hasPermission 함수 (신규 `src/lib/bank-permissions.ts`)

```ts
export async function hasPermission(
  classroomId: string,
  identity: { userId?: string; studentId?: string },
  permission: string
): Promise<boolean> {
  // 1) 교사는 언제나 true
  if (identity.userId) {
    const c = await db.classroom.findUnique({ where: {id: classroomId}, select: {teacherId: true} });
    if (c?.teacherId === identity.userId) return true;
  }
  // 2) 학생은 역할 + 권한 체크
  if (!identity.studentId) return false;
  const assignments = await db.classroomRoleAssignment.findMany({
    where: { classroomId, studentId: identity.studentId },
    include: { classroomRole: { select: { key: true } } },
  });
  if (assignments.length === 0) return false;
  const roleKeys = assignments.map(a => a.classroomRole.key);

  // 3) 학급 오버라이드 먼저 조회
  const grant = await db.classroomRolePermission.findFirst({
    where: { classroomId, roleKey: { in: roleKeys }, permission, granted: true },
  });
  if (grant) return true;

  // 4) default catalog fallback (학급에 override row가 없으면 default 적용)
  const catalogEntry = PERMISSION_CATALOG[permission];
  if (!catalogEntry) return false;
  // override가 1개라도 있으면 default 무시 (teacher가 명시 편집했다는 뜻)
  const hasAnyOverride = await db.classroomRolePermission.count({
    where: { classroomId, permission },
  });
  if (hasAnyOverride > 0) return false; // override 있고 grant=true 없음 → 거부
  // override 없음 → default catalog 기준
  return catalogEntry.defaultRoles.some(r => roleKeys.includes(r));
}
```

### 2.4 실시간 이벤트

MVP는 SSE 없음. 학생 폰은 fetch polling (예: 결제 직후 `/my/wallet` refetch). 향후 SSE 확장 고려.

대안: 결제 시 서버가 즉시 새 잔액을 응답에 포함 → 학생이 매점원 기기 옆에서 본인 기기도 수동 새로고침 하거나 결제 완료 모달을 매점원 기기가 보여줌. 학급 시나리오에 충분.

---

## 3. 컴포넌트 변경

### 3.1 신규 컴포넌트 트리

```
src/components/classroom/
  ClassroomNav.tsx              ← 상단 탭 (학생명부/학급보드/학급역할/은행/매점)
  ClassroomStudentsTab.tsx      ← /students page content (기존 ClassroomDetail에서 학생 테이블 부분)
  ClassroomBoardsTab.tsx        ← /boards page content (기존 ClassroomDetail에서 보드 섹션)
  ClassroomRolesTab.tsx         ← /roles page content (역할 카드 + 모달)
  RolePermissionModal.tsx       ← 체크박스 권한 편집
  ClassroomBankTab.tsx          ← /bank page (입출금/적금/거래 감사)
  ClassroomStoreTab.tsx         ← /store page (상품 CRUD)
  ClassroomPayTab.tsx           ← /pay page (결제 스캐너)

src/components/wallet/
  WalletHome.tsx                ← /my/wallet 루트 (잔액 + 카드 + 거래)
  WalletCardQR.tsx              ← QR 로테이트 + 타이머
  WalletTransactionList.tsx     ← 거래 내역

src/lib/
  bank-permissions.ts           ← PERMISSION_CATALOG + hasPermission
  qr-token.ts                   ← HMAC 카드 토큰 sign/verify + 60s 로테이트
```

### 3.2 수정 컴포넌트

- `src/components/ClassroomDetail.tsx` — **분해**. 학생 테이블/보드 목록은 각자의 Tab 컴포넌트로 이관. 기존 ClassroomDetail 파일은 삭제 (or thin shell로 축소).
- `src/app/classroom/[id]/page.tsx` — `/students`로 redirect
- `src/app/classroom/[id]/students/page.tsx` — 신규, ClassroomStudentsTab 렌더
- `src/app/classroom/[id]/boards/page.tsx` — 신규
- `src/app/classroom/[id]/roles/page.tsx` — 신규
- `src/app/classroom/[id]/bank/page.tsx` — 신규
- `src/app/classroom/[id]/store/page.tsx` — 신규
- `src/app/classroom/[id]/pay/page.tsx` — 신규
- `src/app/my/wallet/page.tsx` — 신규
- `src/app/api/cron/fd-maturity/route.ts` — 신규

### 3.3 상태 위치

| 상태 | 위치 |
|---|---|
| 잔액 | DB (`StudentAccount.balance`). API 응답에 포함. |
| 거래 내역 | DB (`Transaction`). 페이지 로드 시 fetch, 결제 후 refetch. |
| 카드 QR | 클라이언트 로컬 (`useState` + interval 60s). 서버 fetch. |
| 역할 권한 | DB (`ClassroomRolePermission`). 권한 모달 열 때 fetch, PUT 저장 |
| 결제 카트 | `/pay` 페이지 로컬 state. 결제 후 clear. |

---

## 4. 데이터 흐름

### 4.1 결제 흐름 (AC-6, AC-9, AC-10)

```
매점원 기기 (/classroom/:id/pay):
  1. 상품 검색 → 카트 추가 (로컬 state)
  2. "결제" 버튼 → QR 스캐너 모달
  3. 학생 카드 QR 스캔 (학생 폰 화면)
  4. POST /api/classrooms/:id/store/charge
     body: { cardQrToken, items: [{itemId, qty}, ...] }

서버 처리 (atomic):
  db.$transaction(async (tx) => {
    // A) QR 토큰 검증 + 소비 (nonce)
    const parsed = verifyCardToken(cardQrToken);          // HMAC 검증, expiresAt 체크
    if (!parsed || consumedNonces.has(parsed.nonce))
      throw "invalid_or_reused_token";
    consumedNonces.add(parsed.nonce);                     // 15분 TTL
    
    // B) permission 체크
    if (!await hasPermission(classroomId, caller, "store.charge"))
      throw "forbidden";
    
    // C) 카드 → account 조회 (lock)
    const account = await tx.studentAccount.findUnique({
      where: { studentId: parsed.studentId },
      // Postgres: SELECT ... FOR UPDATE via raw query 또는 Prisma interactive transaction
    });
    
    // D) 상품 조회 + 재고 lock
    const items = await tx.storeItem.findMany({ where: { id: { in: itemIds } } });
    const total = items.reduce((sum, it) => sum + it.price * qty[it.id], 0);
    
    // E) 잔액 체크
    if (account.balance < total) throw "insufficient_balance";
    
    // F) mutation
    await tx.studentAccount.update({
      where: { id: account.id },
      data: { balance: { decrement: total } },
    });
    for (const it of items) {
      if (it.stock !== null) {
        await tx.storeItem.update({
          where: { id: it.id },
          data: { stock: { decrement: qty[it.id] } },
        });
      }
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "purchase",
          amount: it.price * qty[it.id],
          balanceAfter: account.balance - total,  // 마지막 거래 기준 (per-item 기록 복잡 → 단일 결제 1 transaction로 단순화)
          storeItemId: it.id,
          performedById: cashier.id,
          performedByKind: "store-clerk",
        },
      });
    }
    return { ok: true, newBalance: account.balance - total };
  });
```

**단순화 결정**: per-item Transaction 대신 **결제당 1개 Transaction** (type="purchase", amount=총액, note=아이템 리스트 JSON). 감사 추적성과 모델 단순성 balance.

### 4.2 적금 만기 cron (AC-4, AC-11)

```
Vercel cron (/api/cron/fd-maturity) — 매일 00:05 KST:
  const now = new Date();
  const mature = await db.fixedDeposit.findMany({
    where: { status: "active", maturityDate: { lte: now } },
  });
  for (const fd of mature) {
    await db.$transaction(async (tx) => {
      const interest = Math.floor(fd.principal * (fd.monthlyRate / 100));
      const payout = fd.principal + interest;
      const account = await tx.studentAccount.update({
        where: { id: fd.accountId },
        data: { balance: { increment: payout } },
        select: { balance: true, id: true },
      });
      await tx.fixedDeposit.update({
        where: { id: fd.id },
        data: { status: "matured", maturedAt: now },
      });
      await tx.transaction.create({
        data: {
          accountId: account.id,
          type: "fd_matured",
          amount: payout,
          balanceAfter: account.balance,
          fixedDepositId: fd.id,
          performedById: "system",
          performedByKind: "system",
        },
      });
    });
  }
```

**Idempotent**: `status="active"` 필터로 이미 처리된 건 재처리 안 됨. cron이 여러 번 fire해도 안전.

### 4.3 권한 토글 흐름 (AC-7, AC-8)

```
교사 /classroom/:id/roles:
  1. 역할 카드 리스트 (은행원/매점원) fetch
  2. "은행원" 카드 클릭 → 모달 오픈, GET /role-permissions
  3. 체크박스 토글 (bank.deposit 해제)
  4. "저장" → PUT /role-permissions/banker body: {permissions: {...}}
  5. 서버: ClassroomRolePermission 레코드 upsert (granted: boolean)
  6. 이후 hasPermission 요청은 override DB 조회 → default 무시 → 거부
```

---

## 5. 엣지 케이스

1. **동일 카드 QR을 두 결제에서 동시 사용** (AC-9) — nonce consumed 체크로 두 번째 거부. 401/400 반환.
2. **잔액 초과 결제** (AC-10) — transaction 내부에서 다시 잔액 조회 후 차감. 동시 2건 시도 → Prisma serializable isolation 또는 낙관적 체크. Postgres의 `UPDATE WHERE balance >= amount` 원자성 활용 (`{balance: {decrement: amount}}` with pre-check).
3. **중도해지 시 이미 만기 처리된 FixedDeposit** — status guard → 400 "이미 만기되었습니다".
4. **학생 재배정 권한 삭제** (AC-7) — 다음 요청부터 403. 현재 열려있는 UI는 403 후 리다이렉트 또는 에러 모달.
5. **Cron 중복 실행** (AC-11) — status filter로 자연 idempotent.
6. **학생 생성 직후 Account 없음** — student 생성 시 auto-create or 첫 은행 접근 시 lazy create. 결정: 첫 접근 lazy (student insert 경로 건드리지 않음).
7. **ClassroomCurrency 미설정** — 교사가 이자율 설정 전엔 `monthlyInterestRate=null` → 적금 가입 API 400 "적금 상품이 아직 활성화되지 않았습니다".
8. **오래된 카드 QR (60초 경과)** — HMAC expiresAt 검증 실패 → 400 "QR 만료".
9. **학생이 본인 QR을 본인 기기로 자주 새로고침** — 60초 내 여러 토큰 발급 허용, 각각 고유 nonce. 결제 시 1개 소비.
10. **매점 상품 삭제(archived=true) 후 결제 시도** — `store.charge` 엔드포인트에서 `archived=false` 필터 필수. 400 "판매 종료 상품".
11. **적금 가입 중 통장 잔액 부족** (race) — `balance: {decrement: principal}`가 음수 방지 조건 없으므로 DB 체크 필요. Prisma는 자동 checkConstraint 없음 → transaction 내부에서 명시적 `if (balance < principal) throw`.
12. **IA 분리 후 기존 /classroom/:id 접근** (AC-bit) — redirect 307 → /students로.

---

## 6. DX 영향

### 6.1 타입/린트
- 새 Prisma 모델 7개 → 자동 타입 생성
- `Permission` string union 타입 — catalog에서 추출
- `hasPermission` helper 전역 사용 (import하는 위치 많아짐)

### 6.2 테스트
- MVP는 phase9 e2e 중심. 단위 테스트 여력 없음.
- 단, **잔액 mutation 경로**는 phase8 `/cso` 감사에서 엄격 검증

### 6.3 빌드/배포
- Prisma migration 1개 추가 (7 CREATE + 2 ALTER + 2 INSERT)
- `vercel.json` crons 추가 1건 (`/api/cron/fd-maturity`)
- 환경변수 추가 없음 (카드 HMAC secret은 `AUTH_SECRET` 재사용)

### 6.4 번들 영향
- 신규 클라이언트 컴포넌트 ~10개. QR 생성/스캐너 라이브러리 필요 가능성 (예: `qrcode` 이미 사용 중)
- 스캐너는 신규 라이브러리 (`html5-qrcode` 또는 `@zxing/browser`) → phase7 결정. 추가 ~50KB 

---

## 7. 롤백 계획

### 7.1 코드 롤백
```bash
git revert <merge-commit>
git push origin main
# Vercel 재배포, 기능 OFF
```

### 7.2 DB 롤백 (권장 안 함 — 데이터 보존)
```sql
-- 필요시 순서 중요 (FK 고려)
DROP TABLE IF EXISTS "Transaction";
DROP TABLE IF EXISTS "FixedDeposit";
DROP TABLE IF EXISTS "StudentCard";
DROP TABLE IF EXISTS "StoreItem";
DROP TABLE IF EXISTS "StudentAccount";
DROP TABLE IF EXISTS "ClassroomCurrency";
DROP TABLE IF EXISTS "ClassroomRolePermission";
DELETE FROM "ClassroomRoleDef" WHERE key IN ('banker', 'store-clerk');
```

코드 revert만으로 기능 OFF, DB는 남겨도 무해 (다른 경로에서 참조 안 함).

---

## 8. 주요 파일 영향 체크리스트 (phase7)

| 파일 | 변경 |
|---|---|
| `prisma/schema.prisma` | +7 model + 역참조 |
| `prisma/migrations/20260419_classroom_bank/migration.sql` | 신규 |
| `src/lib/bank-permissions.ts` | 신규 (PERMISSION_CATALOG + hasPermission) |
| `src/lib/qr-token.ts` | 신규 (HMAC sign/verify, nonce consume) |
| `src/app/api/classrooms/[id]/bank/**` | 4 route 신규 |
| `src/app/api/classrooms/[id]/store/**` | CRUD + charge 신규 |
| `src/app/api/classrooms/[id]/role-permissions/**` | 2 route 신규 |
| `src/app/api/classrooms/[id]/currency/route.ts` | 신규 |
| `src/app/api/my/wallet/**` | 2 route 신규 |
| `src/app/api/cron/fd-maturity/route.ts` | 신규 |
| `src/app/classroom/[id]/page.tsx` | redirect로 축소 |
| `src/app/classroom/[id]/students/page.tsx` | 신규 (ClassroomStudentsTab) |
| `src/app/classroom/[id]/boards/page.tsx` | 신규 |
| `src/app/classroom/[id]/roles/page.tsx` | 신규 |
| `src/app/classroom/[id]/bank/page.tsx` | 신규 |
| `src/app/classroom/[id]/store/page.tsx` | 신규 |
| `src/app/classroom/[id]/pay/page.tsx` | 신규 |
| `src/app/my/wallet/page.tsx` | 신규 |
| `src/components/classroom/ClassroomNav.tsx` | 신규 |
| `src/components/classroom/ClassroomStudentsTab.tsx` | 신규 (기존 ClassroomDetail 학생 테이블 이관) |
| `src/components/classroom/ClassroomBoardsTab.tsx` | 신규 |
| `src/components/classroom/ClassroomRolesTab.tsx` | 신규 |
| `src/components/classroom/RolePermissionModal.tsx` | 신규 |
| `src/components/classroom/ClassroomBankTab.tsx` | 신규 |
| `src/components/classroom/ClassroomStoreTab.tsx` | 신규 |
| `src/components/classroom/ClassroomPayTab.tsx` | 신규 (QR 스캐너) |
| `src/components/wallet/*` | 3 컴포넌트 신규 |
| `src/components/ClassroomDetail.tsx` | 삭제 (or thin re-export) |
| `src/app/classroom/[id]/page.tsx` | redirect 307 |
| `vercel.json` | +cron 1건 |

**추정 규모**: ~25-30 파일, ~3000 라인. DJ 보드의 ~1.5배.

---

## 9. 보안 민감 영역 (phase8 `/cso` 필수)

- `hasPermission` 우회 가능성 — 모든 API 가드 실제 호출 검증
- QR 토큰 HMAC 구현 — `timingSafeEqual` 사용, nonce 재사용 방어
- 잔액 race condition — `db.$transaction` + 명시 잔액 재조회
- store-clerk 권한 해제 즉시 반영 — 캐시 없이 DB 조회
- Cron 엔드포인트 인증 — Vercel cron signature 검증 (`CRON_SECRET` or `x-vercel-cron` header)
- Transaction `balanceAfter` 정합성 — 모든 거래 경로가 이 필드 정확히 기록
