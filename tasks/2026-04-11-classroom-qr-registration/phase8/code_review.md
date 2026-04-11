# Code Review — classroom-qr-registration

**Reviewer**: Staff Engineer (automated)
**Date**: 2026-04-11
**Verdict**: CONDITIONAL PASS -- 2 MUST-FIX, 3 SHOULD-FIX, 4 observations

---

## MUST-FIX (blocking)

### M1. Timing-safe comparison missing in HMAC verification

**File**: `src/lib/student-auth.ts`, line 27
**Severity**: Security (OWASP A02:2021 - Cryptographic Failures)

```ts
if (sig !== expected) return null;
```

String equality (`!==`) is vulnerable to timing attacks. An attacker can iteratively guess the HMAC signature one character at a time by measuring response latency. Use `crypto.timingSafeEqual` instead.

**Fix**:
```ts
import { createHmac, timingSafeEqual } from "crypto";

// in verify():
const expectedBuf = Buffer.from(expected);
const sigBuf = Buffer.from(sig);
if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
```

### M2. Student session cookie missing `secure` flag in production

**File**: `src/lib/student-auth.ts`, lines 45-50

```ts
cookieStore.set(COOKIE_NAME, token, {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE,
});
```

The `secure: true` flag is not set. In production (HTTPS), the cookie will be sent over plain HTTP connections, allowing session hijacking via MITM. The flag should be conditional on the environment.

**Fix**:
```ts
cookieStore.set(COOKIE_NAME, token, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
});
```

---

## SHOULD-FIX (non-blocking, quality/robustness)

### S1. Modulo bias in `randomAlphanumeric()`

**File**: `src/lib/classroom-utils.ts`, line 8

```ts
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 30 chars
// ...
.map((b) => chars[b % chars.length])
```

The character set has 30 characters. `256 % 30 = 16`, meaning the first 16 characters (`A`-`Q`) have a slightly higher probability (9/256 vs 8/256, ~12.5% bias). For a 6-character code with 30^6 = 729M possibilities this is not a practical security issue, but it is a code quality concern.

**Fix**: Use rejection sampling:
```ts
function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const limit = 256 - (256 % chars.length); // 240
  const result: string[] = [];
  while (result.length < length) {
    const bytes = randomBytes(length - result.length + 10);
    for (const b of bytes) {
      if (b < limit && result.length < length) {
        result.push(chars[b % chars.length]);
      }
    }
  }
  return result.join("");
}
```

### S2. Sequential student creation lacks transactionality

**File**: `src/app/api/classroom/[id]/students/route.ts`, lines 24-37

```ts
const students = [];
for (const name of input.names) {
  const qrToken = generateQrToken();
  const textCode = await generateTextCode();
  const student = await db.student.create({ ... });
  students.push(student);
}
```

If student creation fails mid-loop (e.g., a textCode collision after exhausting retries), earlier students are already persisted, leaving the batch in a partial state. This should use `db.$transaction()`.

**Fix**: Wrap in a Prisma interactive transaction:
```ts
const students = await db.$transaction(async (tx) => {
  const result = [];
  for (const name of input.names) {
    // ... create with tx instead of db
    result.push(student);
  }
  return result;
});
```

### S3. Hardcoded fallback secret `"dev-secret"` is unsafe

**File**: `src/lib/student-auth.ts`, line 6

```ts
const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
```

If `AUTH_SECRET` is accidentally unset in production, all student sessions will be signed with a publicly known key. The fallback should either be removed (fail hard) or restricted to dev-only.

**Fix**:
```ts
const SECRET = process.env.AUTH_SECRET;
if (!SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  // allow fallback only in dev
}
const SIGNING_KEY = SECRET ?? "dev-secret";
```

---

## OBSERVATIONS (informational, no action required)

### O1. QR landing page flow differs from design doc

**File**: `src/app/qr/[token]/page.tsx`

The design doc (phase3) specifies the flow as: `GET /qr/[token]` -> `POST /api/student/auth` -> set cookie -> redirect. The actual implementation queries DB directly in the Server Component and calls `createStudentSession()` inline, bypassing the API route.

**Assessment**: This is a valid and arguably superior approach -- Server Components can set cookies directly, avoiding an unnecessary network round-trip. The API route `/api/student/auth` remains available for the text-code login form (StudentLoginForm.tsx), so both paths are covered. No action needed, but the design doc should be updated to match.

### O2. `getCurrentUser()` mock fallback in production

**File**: `src/lib/auth.ts` (pre-existing, not introduced by this PR)

The `getCurrentUser()` function falls back to a mock user when no NextAuth session exists. This means in production, any unauthenticated request to teacher-only endpoints will succeed as the mock "owner" user. This is a pre-existing architectural concern that should be addressed separately (e.g., behind a `NODE_ENV` guard), but is out of scope for this review.

### O3. Student response includes `qrToken` in auth response

**File**: `src/app/api/student/auth/route.ts`, line 27-30

The POST response returns `{ student: { id, name } }` -- correctly excluding the `qrToken`. Good. The reissue endpoint also correctly limits the returned fields.

### O4. `unused import` check -- all clean

All reviewed files have zero unused imports. The `useEffect` import in `ClassroomDetail.tsx` is used by the `StudentRow` sub-component in the same file. The `randomUUID` import in `classroom-utils.ts` is used by `generateQrToken()`.

---

## CHECKLIST SUMMARY

| Category | Item | Status |
|---|---|---|
| **Security** | HMAC signing algorithm | OK (SHA-256) |
| **Security** | HMAC timing-safe comparison | FAIL (M1) |
| **Security** | Cookie `httpOnly` | OK |
| **Security** | Cookie `secure` | FAIL (M2) |
| **Security** | Cookie `sameSite` | OK (lax) |
| **Security** | Token expiry check | OK (exp field) |
| **Security** | QR token entropy | OK (UUIDv4 = 122 bits) |
| **Security** | Text code entropy | OK (30^6 = ~29 bits, acceptable for classroom use) |
| **Security** | Teacher auth on all endpoints | OK (getCurrentUser + ownership checks) |
| **Security** | Student auth endpoint (public) | OK (no injection vectors, Zod validation) |
| **Security** | Input validation | OK (Zod schemas on all endpoints) |
| **Security** | Secret fallback | WARN (S3) |
| **Correctness** | Prisma schema matches design doc | OK |
| **Correctness** | Relations and cascades | OK |
| **Correctness** | Indexes | OK (qrToken, textCode, classroomId, teacherId, code) |
| **Correctness** | API routes match design doc | OK (minor flow variation in O1, acceptable) |
| **Correctness** | Loading/error/empty states | OK |
| **Correctness** | Transaction safety | WARN (S2) |
| **Quality** | Unused imports | OK |
| **Quality** | Dead code | OK |
| **Quality** | TypeScript types | OK |
| **Quality** | Codebase pattern consistency | OK |
| **Quality** | Modulo bias | WARN (S1) |

---

## FILES REVIEWED

- `src/lib/student-auth.ts` -- student session signing/verification
- `src/lib/classroom-utils.ts` -- code/token generation utilities
- `src/app/api/classroom/route.ts` -- classroom list/create
- `src/app/api/classroom/[id]/route.ts` -- classroom get/update/delete
- `src/app/api/classroom/[id]/students/route.ts` -- bulk student creation
- `src/app/api/classroom/[id]/students/[studentId]/route.ts` -- student deletion
- `src/app/api/classroom/[id]/students/[studentId]/reissue/route.ts` -- QR reissue
- `src/app/api/student/auth/route.ts` -- student auth (public)
- `src/app/api/student/me/route.ts` -- student profile
- `src/app/qr/[token]/page.tsx` -- QR landing page
- `src/components/ClassroomDetail.tsx` -- classroom detail view
- `src/components/QRPrintSheet.tsx` -- PDF generation
- `src/components/StudentLoginForm.tsx` -- text code login
- `src/components/AddStudentsModal.tsx` -- bulk student add modal
- `prisma/schema.prisma` -- Classroom/Student model definitions
- `src/lib/auth.ts` -- existing auth helper (context reference)
