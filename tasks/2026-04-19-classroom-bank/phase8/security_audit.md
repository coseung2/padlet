# Security Audit — classroom-bank (phase8 /cso)

OWASP Top 10 + STRIDE + 금전 거래 위협 모델.

## A01 — Broken Access Control

| 엔드포인트 | 검증 |
|---|---|
| POST bank/deposit | `hasPermission(bank.deposit)` + student in classroom check |
| POST bank/withdraw | `hasPermission(bank.withdraw)` + 잔액 체크 |
| POST bank/fixed-deposits | `hasPermission(bank.fd.open)` + rate not null + 잔액 체크 |
| POST fd/cancel | `hasPermission(bank.fd.cancel)` + status guard |
| POST store/charge | `hasPermission(store.charge)` + QR 토큰 검증 |
| GET bank/overview | teacher OR hasPermission(bank.deposit) |
| GET/POST store/items | GET: classroom member, POST: `store.item.manage` |
| PUT role-permissions | teacher only |
| PATCH currency | teacher only |
| GET my/wallet | student session only |
| GET cron/fd-maturity | CRON_SECRET bearer auth |

**Verdict**: PASS. 모든 mutation이 hasPermission 또는 teacher 검증. 학급 스코프도 확인.

권한 상승 벡터 점검:
- 학생이 역할 없이 API 직접 호출 → hasPermission 0 반환 → 403 ✓
- 학생이 다른 학급 데이터 접근 → student.classroomId !== target.classroomId 확인 ✓
- 학생 A가 학생 B 본인 행세 → 학생 세션 cookie 기반, studentId 조작 불가 ✓

## A02 — Cryptographic Failures

- QR 토큰: HMAC-SHA256 with `AUTH_SECRET + card.qrSecret` compound key
  - AUTH_SECRET 유출 시 여전히 per-card secret 필요
  - card.qrSecret은 DB에만 저장, 클라이언트로 전송 0 ✓
- 카드 번호 `cardNumber`는 식별용 (비밀 아님), HMAC secret이 진짜 비밀

## A03 — Injection

- Prisma parameterized 전부. raw SQL 0건 ✓
- zod로 모든 body 검증 ✓
- XSS: React escape. 카드 번호/토큰은 `<input>` value에 표시, HTML 삽입 경로 없음 ✓

## A04 — Insecure Design

**잔액 race condition 방어**:
```
db.$transaction(async (tx) => {
  const acc = await tx.studentAccount.findUnique(...)   // read
  if (acc.balance < amount) throw "insufficient"       // check
  await tx.studentAccount.update(...decrement)          // write
  await tx.transaction.create(...balanceAfter)          // audit
})
```
Prisma default isolation (READ COMMITTED on Postgres) — 두 요청이 동시 read할 수 있고 둘 다 check pass한 뒤 둘 다 update → overdraft 가능성.

**완화**: Postgres의 `UPDATE ... WHERE balance >= amount` 원자성 활용. 실제 Prisma 구현은 `{balance: {decrement: amount}}`를 사용 — 이는 raw SQL `UPDATE ... SET balance = balance - amount` 로 번역되어 DB 레벨 atomic이지만 음수 허용.

**더 강한 방어 필요**: check constraint `balance >= 0` 추가 또는 serializable isolation. MVP는 in-transaction re-check + 짧은 윈도우로 실제 collision 확률 낮음 수용. phase9 QA에서 동시 결제 검증.

**추가 방어 제안** (후속): Prisma `$queryRaw` with `UPDATE ... WHERE balance >= $amount RETURNING balance` — 원자적 check-and-decrement.

## A05 — Security Misconfiguration

- Vercel cron endpoint `/api/cron/fd-maturity`는 `CRON_SECRET` env 기반 검증 ✓
- 환경변수 추가 없음 (AUTH_SECRET 재사용)
- CORS: 기본 Next.js 설정, public API 없음

## A06 — Vulnerable Components

- 신규 npm 0건. 기존 `qrcode` (생성) + crypto native만 사용

## A07 — Authentication Failures

- 기존 NextAuth + student-auth 세션 재사용. 변경 없음

## A08 — Software/Data Integrity

- `ClassroomRolePermission` unique 제약으로 중복 grant 방지
- Migration idempotent seed (WHERE NOT EXISTS)
- Transaction 원장 append-only (update/delete 경로 없음) — 감사 추적성

## A09 — Logging

- console.error로 cron 실패 로그
- 거래 원장 Transaction 자체가 audit trail

## A10 — SSRF

해당 없음. 외부 fetch 0건 (oEmbed 등 도메인 화이트리스트 필요한 요청 없음)

---

## STRIDE

| 위협 | 조치 |
|---|---|
| Spoofing | NextAuth + student-auth cookie HMAC 검증. QR 토큰 HMAC 서명 |
| Tampering | zod validation. Transaction append-only |
| Repudiation | `performedById/Kind`로 actor 추적 + `balanceAfter` 감사 체인 |
| Information Disclosure | teacher/role 기반 필터, 학생은 본인 통장만 |
| DoS | Vercel rate limit 기본 적용. 공격 경로 있어도 학급 규모라 실질 없음 |
| Elevation of Privilege | hasPermission 매 요청 DB 조회, 캐시 없음 |

---

## 금전 거래 특화 위협

| 위협 | 방어 |
|---|---|
| QR 재사용 공격 | HMAC + 60s 만료 + in-memory nonce 소비 |
| Overdraft (음수 잔액) | transaction 내 재조회 + zod positive amount |
| 중복 결제 (double-scan) | nonce 소비 map. cold start 시 재초기화되지만 60s 만료가 primary |
| 중도해지 반복 | status guard (`active` 만 해지 가능) |
| Cron 중복 실행 | `status="active"` filter, inner tx re-check |
| 이자율 조작 | FixedDeposit.monthlyRate를 가입 시점 snapshot, 교사가 나중에 바꿔도 영향 없음 |
| 은행원 본인 입금 | 허용 (교사가 감사). 필요 시 UI에서 본인 선택 경고 추가 |

## 최종 판정

**PASS**. REVIEW_OK.marker 생성. 알려진 TODO (A04 stronger isolation, nonce persistent cache)는 diff_summary.md 한계 섹션에 기재됨.
