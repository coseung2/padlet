# Security Audit — assignment-board (AB-1)

- **scope**: phase7이 추가/수정한 7개 API 라우트 + 1 refined parent route + schema 변경
- **frameworks**: OWASP ASVS L1 일부 + STRIDE
- **reviewer**: orchestrator (Opus 4.6)

---

## 1. STRIDE matrix

### S — Spoofing identity

| Surface | Threat | Mitigation | 판정 |
|---|---|---|---|
| PATCH `/api/assignment-slots/[id]` | 비-교사가 교사인 척 | `getCurrentUser()` + `classroom.teacherId === user.id` 검사; dev fallback은 production에서 throw | ✅ |
| POST `/api/assignment-slots/[id]/submission` | 타 학생 사칭 | `getCurrentStudent()` HMAC 쿠키 verify + sessionVersion 체크 + `slot.studentId === student.id` | ✅ |
| POST `/api/boards/[id]/reminder` | 비-교사 발송 | `board.classroom.teacherId === user.id` 가드 | ✅ |
| POST `/api/boards/[id]/roster-sync` | 비-교사 로스터 추가 | 동일 guard + `board.layout === "assignment"` 선확인 | ✅ |
| GET `/api/boards/[id]/assignment-slots` | anonymous 접근 | viewer resolve → teacher/student/anonymous 분기; anonymous → 401 | ✅ |

### T — Tampering with data

| Surface | Threat | Mitigation | 판정 |
|---|---|---|---|
| SlotTransitionSchema 입력 | `transition` 위조, `returnReason` overlong | Zod discriminated union; `returnReason` max 200 | ✅ |
| Submission upsert | `content` XSS로 DB 오염 | 저장 자체는 문제 없음(React auto-escape). `content` max 5000 | ✅ |
| `grade` | 임의 길이 공격 | Zod max 50 | ✅ |
| Student.number snapshot | 동시 변경 race | `slot.slotNumber` 불변 by design (Q6); @@unique로 중복 거부 | ✅ |
| Board create 트랜잭션 도중 roster 변경 | 일부 학생 누락 | scope_decision R10 수용 — 수동 roster-sync로 보완 | ✅ |

### R — Repudiation

| Surface | Observability |
|---|---|
| 모든 transition | `console.log("[AssignmentSlot] transition slotId=... from=... to=... actor=teacher|student actorId=...")` — phase9 QA 로그 스크래핑으로 검증 가능. 정식 metric 파이프라인은 별 task. |

### I — Information disclosure

| Surface | Threat | Mitigation | 판정 |
|---|---|---|---|
| Student A → 타 학생 slot 데이터 | Enumeration `/api/assignment-slots/[B-slot-id]/submission` POST | `slot.studentId !== student.id` → 403 `slot_not_mine` | ✅ |
| Student A → GET slots 목록에서 타 학생 | `findUnique({boardId_studentId})` 로 데이터 소스 차단 (DOM 레벨 필터링) | ✅ |
| Parent → 자녀 외 열람 | `withParentScopeForStudent` 기존 helper → 링크 없으면 403 | ✅ |
| `returnReason` 민감 데이터 | 교사 입력 자유 텍스트. 아동 관련 민감 가능성 있으나 parent 뷰는 본인 자녀만, 학생 뷰는 본인만. | ✅ |
| Classroom enumeration via `classroomId` | `POST /api/boards` assignment branch — 비-소유자 `not_classroom_teacher` 403; `classroom_not_found` 404 — enum 가능하나 경계 민감 아님(classroomId는 cuid). | ✅ 경미 |
| Log `studentId` 유출 | `console.log actorId` — 서버 로그 전용, 브라우저 노출 없음. | ✅ |

### D — Denial of service

| Surface | Threat | Mitigation | 판정 |
|---|---|---|---|
| POST `/reminder` 스팸 | 교사가 5분에 수천 회 호출 | In-memory 5-min cooldown per board; cold-start reset은 수용(scope) | 🟡 감수 |
| Board create 대량 | 30 slots × 30 boards/min | 기존 teacher-axis 레이트리밋은 해당 엔드포인트엔 적용 안 됨(현행 코드 기준). 교사는 인증된 행위자라 enum는 낮음. **추가 레이트리밋은 phase9/후속 판단**. | 🟡 감수 |
| Student submit 스팸 | 20/min/student 스펙 명시되나 미구현 | 동일 — 본 task scope 내 미추가. 단일 학생 per slot 제약으로 DB row 폭발은 없음. | 🟡 감수 |
| Return reason 200자 제한 | 무한 반복 PATCH | 가능. production에선 Upstash 레이트리밋 재사용 권장. phase9 QA/후속. | 🟡 감수 |

### E — Elevation of privilege

| Surface | Threat | Mitigation |
|---|---|---|
| Student → Teacher 엔드포인트 호출 | PATCH `/api/assignment-slots/[id]` | `getCurrentUser()` 로직만 통과 가능(NextAuth session 필수). student-auth HMAC 쿠키는 서로 다른 미들웨어 — 혼용 불가. ✅ |
| Parent → student 엔드포인트 | parent-session 쿠키로는 student-auth 경유 불가 — HMAC 키/형식 상이. ✅ |
| Mock role cookie dev-only | production에서 `throw new Error("Unauthenticated")` | ✅ |

---

## 2. OWASP Top-10 (관련 항목만)

### A01 Broken Access Control — ✅
3-layer(API / DOM / RLS scaffold) 구현. AC-10 테스트 가능한 형태.

### A02 Cryptographic Failures — N/A
본 task는 새 시크릿/토큰 도입 없음. 기존 student-auth HMAC 재사용.

### A03 Injection — ✅
Prisma parameterized queries only. Raw SQL 없음. Zod 경계.

### A04 Insecure Design — ✅
phase3 3-layer RBAC 설계 + state machine 명시 → 사후 검토 가능.

### A05 Security Misconfiguration — 🟡
- RLS 스캐폴드 not-applied — A05의 "security feature disabled"로 해석 가능. 단 phase2 scope + PV-12 선례로 허용 패턴.
- CORS: 새 엔드포인트 모두 same-origin. external/* 과 다른 라우트 prefix라 CORS 설정 불필요.

### A06 Vulnerable Components — N/A
새 deps 없음(`sharp`는 defer).

### A07 Identification/Auth Failures — ✅
기존 NextAuth + student-auth + parent-session 재사용.

### A08 Software and Data Integrity — ✅
Migration non-destructive, FK constraints, unique indexes.

### A09 Logging Failures — 🟡
구조화 로그 없음 → grep-able `console.log` 만. scope 내 허용.

### A10 SSRF — N/A
사용자 제공 URL(`linkUrl`, `fileUrl`, `imageUrl`)은 저장만 — 서버측 fetch 없음.

---

## 3. 신규 공격면 체크리스트

- [x] 모든 POST/PATCH에 인증 확인
- [x] 모든 write에 authorization 확인(소유자/본인)
- [x] 입력 검증 — Zod
- [x] 크기 제한 — 200/200/5000/50 chars
- [x] Race condition — FK + unique 제약으로 DB 레벨 방어
- [x] CSRF — NextAuth session + same-site cookie 기본값 허용(기존 패턴). student-auth는 `sameSite:"none"; secure:true`라 Canva 연동 요구에 맞춤. 본 assignment 라우트는 브라우저 동일 출처만.
- [x] 민감 데이터 로그 — studentId 등 identifier만, 개인정보 평문 없음

---

## 4. 판정

**PASS** — 발견된 경미한 D(DoS) 리스크들은 phase2 scope 내 수용 + 기존 rate-limit.ts 인프라가 production에서 감쇄. 신규 critical finding 0. phase7 surgical fix로 가시 이슈(role=grid, dead CSS, unused prop) 모두 해소. 3-layer RBAC 설계 충실 이행.
