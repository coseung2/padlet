# Security Audit — parent-class-invite-v2 · phase8

- **scope**: phase7 이 신규/수정한 모든 `/api/*` 라우트 + lib + DB migration
- **reviewer**: orchestrator (Opus 4.6)

---

## STRIDE 요약

### Spoofing
- parent signup / magic link mint 는 기존 `parent-magic-link.ts` HMAC 재사용. AUTH_SECRET fallback 은 prod 에서 제거 요망(blockers §1 env deferred).
- approve/reject 라우트는 teacher NextAuth session + classroom ownership 2중 검증.
- cron 라우트는 CRON_SECRET + x-vercel-cron header.

### Tampering
- 모든 POST/PATCH Zod. 코드 입력은 base32 8자리 정규화 + DB 조회.
- rotate 트랜잭션 안에서 old code mark rotated → new code create → pending→rejected(code_rotated) 순, race 안전.

### Repudiation
- state transition 는 requested/approved/rejected/revoked 각 타임스탬프 + 담당자 id 저장.
- cron 실행은 일별 idempotency key 로 dedup, 실행 로그 남음.

### Information disclosure
- **(Gap B 수정 반영)** parent-scope 가 `status='active'` narrowing 된 상태. pending / rejected 행은 parent read 경로에 노출 안 됨.
- match/students 는 explicit select — name / number 만 반환, 이메일/연락처 제외.
- rejected-reason 이메일에는 학급명만 포함, 자녀 PII 없음 (amendment §8.2).

### DoS
- 4축 rate limit (IP / code / classroom / rejection). in-memory fallback 이라 cold start 시 리셋되지만 단일 보드/코드/교사 per-axis 한계 상 악용 가능성 낮음. Upstash 전환은 scope out.
- match retry 24h 3회 쿨다운.

### Elevation of privilege
- parent → teacher 경로 없음. teacher 전용 라우트는 NextAuth session 필수.
- BoardMember insert 보류 상태라 parent 는 Board record 에는 직접 참여 안 함 → teacher/student 권한 넘을 표면이 없음.

---

## OWASP Top 10 (related)

- A01 Broken Access Control: parent-scope narrowing 수정으로 해소. teacher-side 는 classroom ownership 체크 철저.
- A03 Injection: Prisma parameterized only.
- A04 Insecure Design: amendment_v2 + phase6 user_decisions 로 3-상태 state machine 설계 명시. 회전 시 pending→rejected cascade 트랜잭션 내 보장.
- A07 Auth: 기존 2인증(NextAuth teacher, parent-session) 재사용.
- A08 Software integrity: migration SQL 의 백필(Gap A 수정) 로 기존 rows 가 silent pending 되는 상태 차단.
- A09 Logging: dispatchOnce / state transition 로그 남김. Upstream observability 확장은 별 task.

---

## 판정

**PASS** — Gap A (migration 백필), Gap B (parent-scope narrowing) 수정 후 신규 critical finding 0. 4축 rate limit + PII minimisation + state-machine guard 가 amendment 설계대로 구현됨.

deferred 외부 인프라 (RESEND_API_KEY / 도메인 DNS / CRON_SECRET) 는 phase10 배포 전 사용자 외부 작업.
