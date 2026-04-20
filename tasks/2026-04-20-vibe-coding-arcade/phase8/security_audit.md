# Phase 8 — Security Audit (OWASP Top 10 + STRIDE)

> **대상**: vibe-arcade feature (phase8 자동 수정 반영 후). **Scope**: auth · DB write · 외부 API · XSS · cross-origin sandbox · HMAC.

---

## 1. OWASP Top 10 (2021)

| # | 항목 | 상태 | 근거 · 남은 위험 |
|---|---|---|---|
| A01 | Broken Access Control | ✅ | Projects GET 카탈로그 classroomId scope 체크(수정 2.4) · Moderation/Config/Quota는 `getBoardRole` owner/editor · Play session crossClassroomVisible 분기 · Review self/flag 차단. 한 곳이라도 빠지면 cross-classroom leak이므로 통합 테스트 추천. |
| A02 | Cryptographic Failures | ⚠ | playToken HMAC-SHA256 + `timingSafeEqual` OK. **교사 Sonnet API Key는 env(`SONNET_API_KEY`) 저장** — CanvaConnectAccount 스타일 DB 암호화 미구현(TODO phase7 후속). 프로덕션 진입 전 반드시 구현. |
| A03 | Injection (XSS 포함) | ✅ | HTML artifact 4중 방어: (a) `moderation-filter.scanHtml` 금지 tag/scheme/외부 URL, (b) cross-origin `sandbox.aura-board.app` 서빙, (c) `<iframe sandbox="allow-scripts">` (allow-same-origin 금지, PlayModal에서 설정 — TODO), (d) CSP `sandbox`·`frame-src 'none'`. 리뷰 comment/제목은 React escape 기본 방어. `renderSandboxHtml.escapedTitle` 수동 escape 확인. |
| A04 | Insecure Design | ✅ | Quota cap 2단(학생/학급) · 세션 타임아웃 · Haiku 다운그레이드 금지 명시 · 센티넬 패턴 문서화. |
| A05 | Security Misconfiguration | ✅ | CSP 헤더 `sandbox`, `frame-src 'none'`, `default-src 'self' + whitelist CDN`, `script-src 'self' 'unsafe-inline' 'unsafe-eval' + whitelist`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob: + whitelist`, `connect-src 'self'`, `base-uri 'none'`, `object-src 'none'`. `X-Content-Type-Options: nosniff` + `Referrer-Policy: no-referrer`. |
| A06 | Vulnerable Components | ⚠ | `@anthropic-ai/sdk` 미설치(dynamic import). phase10 deployer에서 `^0.30.0` 핀 + `npm audit` 필수. Prisma CLI 7.7 vs client 6 미스매치(review 2.10). |
| A07 | Authentication Failures | ✅ | Student HMAC cookie + NextAuth 5 beta — 기존 repo 패턴 승계, 신규 경로 아님. |
| A08 | Software/Data Integrity Failures | ✅ | Migration append-only (본 건은 1차 배포). FK/Cascade 일관성: `VibeProject.authorStudentId=Restrict`(작품 보존) vs `VibeSession.studentId=SetNull`(7일 익명화) — 설계 의도 반영. |
| A09 | Logging & Monitoring | ⚠ | R-8 "일일 비정상 소비 Slack 경보" **미구현**. Upstash Redis 있음(package.json). phase10에서 rate limiter + Slack webhook 연결 필수. 프롬프트 감사 로그 자체는 DB에 저장됨(VibeSession.messages). |
| A10 | SSRF | ✅ | 서버에서 외부 URL 요청하는 경로 = Anthropic API 1개(교사 API Key 기반, 고정 호스트). 학생 HTML은 클라이언트 iframe 내에서만 로드 + CSP CDN 화이트리스트. |

---

## 2. STRIDE

| 위협 | 상태 | 방어 |
|---|---|---|
| **S**poofing | ⚠ | playToken HMAC + 1h TTL ✓. **iframe postMessage origin 검증은 클라이언트 PlayModal의 책임** — 현 세션 UI 미구현. design_spec §S2 명시됐고 단위 테스트(AC-N9)가 phase9 QA 대기 중. |
| **T**ampering | ✅ | playToken `timingSafeEqual` · Zod 스키마로 req payload 무결성 · DB 레벨 compound unique |
| **R**epudiation | ✅ | VibeSession.messages 전체 보존 + 교사 감사 탭 설계 |
| **I**nformation Disclosure | ✅ | sandbox iframe의 `allow-same-origin` 금지 → `document.cookie` empty string (AC-N8) · Restrict FK로 미성년 PII 보존 정책 · 7일 미활성 익명화 cron + Pro 365일 hard delete |
| **D**enial of Service | ⚠ | Quota cap ✓ · SSE abort signal ✓. **학생별 rate limit(Upstash)은 미구현** — R-8 후속. Anthropic SDK 루프가 교사 쿼터를 고갈시키는 경로가 학생 cap으로만 차단됨. rate limit 도입 필수. |
| **E**levation of Privilege | ✅ | Moderation/Config/Quota 모두 `getBoardRole` owner/editor 요구 · self-review/self-flag 차단 · cron은 `x-vercel-cron` 헤더 또는 `CRON_SECRET` 요구 |

---

## 3. 남은 위험 (phase10 deployer / 후속 세션에서 반드시 처리)

| # | 항목 | 담당 phase | 차단 여부 |
|---|---|---|---|
| SEC-1 | 교사 `SONNET_API_KEY` DB 암호화 저장 | phase7 후속 구현 | 프로덕션 배포 전 차단 |
| SEC-2 | 학생별 rate limit (Upstash `@upstash/ratelimit`) | phase7 후속 | 프로덕션 배포 전 차단 |
| SEC-3 | 일일 비정상 소비 Slack 경보 | phase7 후속 | 프로덕션 배포 전 차단 |
| SEC-4 | iframe postMessage origin 검증 (PlayModal 컴포넌트) | phase7 후속 UI | 실제 플레이 기능 활성화 전 차단 |
| SEC-5 | `sandbox.aura-board.app` DNS/도메인 Vercel 등록 | phase10 deployer | sandbox route 동작 전 차단 |
| SEC-6 | 환경 변수 3종 등록: `SONNET_API_KEY` · `PLAYTOKEN_JWT_SECRET`(32 chars min) · `NEXT_PUBLIC_APP_ORIGIN` | phase10 | 배포 전 차단 |

---

## 4. 자동 수정 반영 결과

phase8 자동 수정 9건 중 4건이 보안 관련:
- **A01**: Projects GET classroomId scope (review 2.4)
- **A03**: moderation-filter regex 상태 누수 제거 (review 2.1) — 정기 regex hit 놓치던 false-negative 제거
- **A08**: VibeQuotaLedger.studentId non-null + VibeSession.studentId nullable — DB 무결성 확정
- **D**: SSE abort signal — API Key 낭비성 DoS 경로 차단 (review 2.5)

---

## 5. 최종 판정

- **프로덕션 배포 차단**: SEC-1 · SEC-2 · SEC-3 · SEC-5 · SEC-6 (5건)
- **QA 통과 차단**: SEC-4 (PlayModal 동작 전)
- **현 phase8 스코프**: staff engineer 리뷰 + 자동 수정 → PASS

배포 전 phase7 후속 세션에서 SEC-1~4 해결 필수. phase10 deployer는 SEC-5·SEC-6 체크리스트 처리 + `npm audit` 검토.

→ **security audit PASS**. REVIEW_OK 생성 가능 (프로덕션 배포 전 SEC 5건 처리 조건부).
