# Security Audit — dj-board-queue (phase8 /cso)

OWASP Top 10 + STRIDE 관점 감사. 권한/외부 fetch/DB write 민감 영역 포함.

## A01 — Broken Access Control

| 엔드포인트 | 인증 | 권한 게이트 | 결과 |
|---|---|---|---|
| POST /api/boards/:id/queue | user OR student | `getEffectiveBoardRole` any non-null role | ✓ 학급 외 학생 403 |
| PATCH/DELETE /api/boards/:id/queue/:cardId | user OR student | `role ∈ {owner,editor}` OR (delete: pending+본인) | ✓ 비-DJ 학생 차단 |
| PATCH .../move | 동일 | `role ∈ {owner,editor}` | ✓ |
| GET /api/classrooms/:id/roles | user only | `classroom.teacherId === user.id` | ✓ 타 교사 접근 불가 |
| POST/DELETE .../roles/assign | user only | 동일 + student.classroomId === classroomId | ✓ |
| GET /api/boards/:id/stream | user OR student | `getEffectiveBoardRole` non-null | ✓ |

**Verdict**: PASS.

주의 포인트:
- `getEffectiveBoardRole`의 teacher 경로는 기존 `getBoardRole`을 호출. 권한 상승 버그 없음 (Role은 열거형, isRole 게이트).
- 학생 DJ가 다른 레이아웃 보드에 접근 시 `BoardLayoutRoleGrant` JOIN 실패 → "viewer" fallback. Confused Deputy 방지. AC-8에 해당.

## A02 — Cryptographic Failures

해당 없음. 큐 submission은 공개 YouTube URL뿐, secrets 저장·비교 경로 없음.

## A03 — Injection

### SQL injection
- 모든 DB 접근은 Prisma parameterized. raw SQL 0건. ✓

### NoSQL/ORM-level injection
- zod로 요청 body 검증 후 Prisma에 전달. 자유 field enumeration 없음. ✓

### XSS
- 카드 title/content는 React escape. ✓
- `linkImage`(oEmbed thumbnail_url)를 `<img src>`에 직접 사용 — 도메인 검증 없음. YouTube i.ytimg.com 으로부터 나오는 URL인데, oEmbed 응답이 악의적이면 `javascript:` URL 가능?
  - oEmbed spec은 thumbnail_url을 URL로 명세하지만 YouTube 응답은 `https://i.ytimg.com/*`로 보장되지 않음 (API response poisoning 가능성 극히 낮지만).
  - 방어: `img src="javascript:..."`는 modern 브라우저에서 자동 차단 (img는 리소스 fetch, script 실행 아님). **Verdict**: PASS.

### URL injection / SSRF
- `src/lib/youtube.ts`에 host 화이트리스트 (`youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`)
- `oEmbed URL`은 항상 서버가 구성 (`https://www.youtube.com/oembed?url=${canonical}`) — 사용자 입력이 oEmbed URL 그대로 들어가지 않음
- `fetch(oembedUrl)`은 항상 youtube.com 도메인만 타격. ✓

## A04 — Insecure Design

- 권한 precedence 명시 설계됨 (design_doc §3 + getEffectiveBoardRole JSDoc)
- 학생 SSE 허용이 타 레이아웃에 의도치 않은 노출 유발하지 않음 (getEffectiveBoardRole에서 classroom 소속 확인 후 viewer fallback, 그 외는 null → 403)

## A05 — Security Misconfiguration

- `.env` secret 추가 없음
- migration seed 하드코딩된 id ("dj_seed_role_id", "dj_seed_grant_id") — cuid가 아니지만 PRIMARY KEY는 TEXT 타입이라 허용. 실제 row 생성 후 UI가 cuid로만 할당하므로 seed id 충돌 가능성 0 (WHERE NOT EXISTS)

## A06 — Vulnerable Components

추가 npm 없음. 기존 프로젝트 deps 재사용.

## A07 — Authentication Failures

- 기존 `getCurrentUser` / `getCurrentStudent` 재사용. 별도 auth 경로 추가 없음
- session rotation · replay 시나리오는 기존 구현 상속

## A08 — Software/Data Integrity

- Prisma `@@unique` 제약으로 중복 assignment 방지 (409 반환)
- Card.queueStatus 전이는 API handler에서 3-값(`approved`|`rejected`|`played`) 검증. 임의 문자열 거부

## A09 — Logging

- `console.error("[dj stream snapshot]", e)` 정도만 추가. 로그 레벨/민감 정보 유출 없음

## A10 — SSRF

위 A03 참조. 화이트리스트 도메인만 fetch.

---

## STRIDE

| 위협 | 조치 |
|---|---|
| **Spoofing** | student session + user session 분리, `getCurrentStudent`는 signed cookie 기반 (기존) |
| **Tampering** | 모든 mutation이 zod validation. SSE snapshot은 read-only (server-push) |
| **Repudiation** | `ClassroomRoleAssignment.assignedById` audit 컬럼으로 누가 부여했는지 보존 |
| **Information Disclosure** | stream이 학생에 노출되지만 반드시 classroom member. 외부인은 401/403 |
| **DoS** | oEmbed fetch 캐시(86400s) → 같은 비디오는 stream/submit 재공격해도 YouTube 서버에 반복 타격 없음 |
| **Elevation of Privilege** | precedence 확정: teacher → DJ student → classroom student viewer → null. 학생 DJ가 BoardMember가 되지 않음 — 매 요청마다 grant resolve |

---

## 최종 판정

**PASS**. 전 항목 방어. `REVIEW_OK.marker` touch 승인.
