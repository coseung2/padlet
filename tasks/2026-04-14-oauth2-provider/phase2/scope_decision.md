# Scope Decision — oauth2-provider

## 1. 선택한 패턴
- **OAuth 2.0 Authorization Code + PKCE (S256)** — Canva 공식 권장
- **Student-scoped tokens** — access_token에 studentId + scope 바인딩
- **Refresh token rotation** — 새 refresh 발급 시 구 토큰 폐기
- **Dual-auth on /api/external/*** — PAT(백워드) + OAuth Bearer 동시 수용

## 2. MVP 범위

### 포함 (IN) — Session 1: Backend-only

**2-1. DB 스키마**
- Prisma 신규 모델 4개: `OAuthClient`, `OAuthAuthCode`, `OAuthAccessToken`, `OAuthRefreshToken`
- `Student` 역관계 추가 (authCodes, accessTokens, refreshTokens)
- Migration 생성 + 로컬 적용. **Production DB 적용은 session 2로 연기**.

**2-2. OAuth Provider 라이브러리** (`src/lib/oauth-server.ts`)
- Code/token 발급 helper
- PKCE `code_verifier` 검증 (SHA256 S256)
- Client secret verify (bcrypt/timing-safe)
- Token hash + prefix 분리 (PAT 패턴 재사용)

**2-3. Route handlers**
- `GET /oauth/authorize` — 검증 → consent 또는 로그인 리다이렉트
- `GET /oauth/consent` (page) — 학생-친화 UI
- `POST /api/oauth/consent` — 수락 시 authcode 발급 + redirect
- `POST /oauth/token` — grant_type 분기 (code/refresh)
- `POST /oauth/revoke` — RFC 7009

**2-4. External API Bearer 지원**
- `src/lib/external-auth.ts` 신규 — `verifyBearer()` 통합 함수
- `/api/external/cards, boards, sections, whoami` 에서 `verifyPat` → `verifyBearer`로 교체
- OAuth 토큰 경로에선 student_session 쿠키 체크 스킵 (토큰이 이미 student-scoped)

**2-5. Seed 데이터**
- `prisma/seed.ts`에 Canva OAuth client 추가 (ID: `canva`, secret: env var)

### 제외 (OUT) — Session 2 이후

| 항목 | 사유 | 후속 |
|---|---|---|
| Canva Developer Portal 등록 | 사용자 외부 작업 | 사용자가 직접 수행 + Client ID/Secret 제공 |
| `aura-canva-app` repo 코드 수정 | 별도 저장소 | Session 2 |
| Production Prisma migration 배포 | 파괴적 DB 변경, 사용자 확인 필요 | Session 2 |
| 관리자 OAuth 토큰 대시보드 | 감사 UI, MVP 외 | 후속 task |
| OAuth client 추가 UI | 현재 canva 하나만 필요 | 미정 |

## 3. 수용 기준 (Session 1)

1. `prisma migrate dev` 실행 시 4개 새 모델 생성, 기존 데이터 손실 0
2. `npm run typecheck` 및 `npm run build` 통과
3. 로컬에서 `curl /oauth/authorize?client_id=canva&redirect_uri=...` 호출 시 미로그인 학생 → `/student/login?return=...`으로 302
4. 학생 쿠키 심어서 호출 시 consent 페이지 (`/oauth/consent?...`) 렌더
5. consent 허용 API 호출 시 `redirect_uri?code=<code>&state=<state>`로 302, `OAuthAuthCode` 테이블에 row 1개 생성
6. `POST /oauth/token` with grant_type=authorization_code + 올바른 PKCE → `{access_token, refresh_token, ...}` 반환, `OAuthAccessToken` + `OAuthRefreshToken` row 각 1개 생성
7. 잘못된 code_verifier → 400 invalid_grant
8. 같은 code로 두 번째 교환 → 400 invalid_grant (consumed)
9. `POST /oauth/token` with grant_type=refresh_token → 새 access + 새 refresh 반환, 구 refresh revokedAt 세팅
10. `POST /oauth/revoke` → 200, 해당 토큰 revokedAt 세팅
11. `POST /api/external/cards` with `Authorization: Bearer aurastu_<valid>` → 정상 card 생성 (기존 PAT 경로도 회귀 없음)
12. 유효기간 지난 OAuth 토큰 → 401 invalid_token

## 4. 스코프 결정 모드

**Selective Expansion** (2-session split)

- Backend 완결성 우선 — endpoint + DB + 내부 로직 모두 이번에
- 외부 연동(Canva Portal + 별도 repo + production migration)은 사용자 외부 작업 병행 필요 → Session 2

## 5. 위험 요소

| # | 리스크 | 완화 |
|---|---|---|
| R1 | Prisma migration이 기존 Student 관계에 영향 | 검토: 모두 optional 역관계, cascade 미적용 → safe |
| R2 | OAuth 버그로 토큰이 잘못된 학생에게 발급 | 테스트: studentId 바인딩 + authcode 1회성 소비 + PKCE |
| R3 | PAT 경로 제거로 내부 테스트 중단 | PAT 보존 (dual-auth) — PAT는 `teacher` 도구로 남김 |
| R4 | Client secret 유출 | env var + bcrypt hash, git 비커밋 |
| R5 | Canva Developer Portal에 등록 안 되면 테스트 불가 | Session 1에서 로컬 `curl`로만 검증, 사용자에게 Portal URL 제공 |
| R6 | 세션 토큰 크기 증가로 DB 부하 | hash만 저장 (64byte × N) — 미세, OK |
| R7 | 2개 세션 분할 중 컨텍스트 유실 | Session 1 끝에 PUSH_READY + 명확한 handoff doc |

## 6. 예상 작업량 (Session 1 backend only)
- Prisma schema + migration: 30분
- oauth-server.ts 라이브러리: 1시간
- 4개 route handler: 1.5시간
- dual-auth 수정: 30분
- 테스트/빌드: 30분
- **합계 ~4시간** — 이번 세션에서 충분

## 7. 검증 게이트 체크
- 수용 기준 12개 (≥ 3) ✅
- OUT 명시 + 후속 ✅
- 리스크 7개 ✅
- session split 논리 명시 ✅

**→ phase3 architect 진행 전, 사용자에게 split 승인 요청**
