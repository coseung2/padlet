# Phase 1 — OAuth 2.0 Provider Research

## Canva OAuth 통합 계약 (공식 문서 발췌)

### Canva 앱 측 API
- `auth.initOauth()` — 초기화
- `oauth.requestAuthorization({ scope })` — 인가 요청 (팝업 트리거, Canva가 관리)
- `oauth.getAccessToken({ scope, forceRefresh })` — 저장된 토큰 반환

### Redirect URL 계약
- **Canva가 팝업 관리** — 우리는 redirect_uri를 생성하지 않음
- Canva는 Developer Portal에서 read-only로 redirect_uri를 제공
- 우리 `/oauth/authorize`가 이 redirect_uri로 `?code=<code>&state=<state>` 리다이렉트해야 함

### 토큰 교환 플로우
- **Canva가 직접 POST /oauth/token** 호출 (서버-서버)
- Credential 전달 모드 3종: Headers (Basic) / Body / Both
- Body: `grant_type=authorization_code&code=<code>&redirect_uri=<uri>` (+ PKCE 시 `code_verifier`)
- 응답: `{access_token, token_type, expires_in, refresh_token, scope}`

### 토큰 관리
- Canva가 자동 refresh (만료 전)
- 만료시간 미제공 시 90일 가정
- **토큰은 Canva가 저장** — 우리가 캐시 X

### Developer Portal 등록 필드
- Provider name
- Client ID / Client Secret
- Credential transfer mode
- Authorization server URL (우리: `https://aura-board-app.vercel.app/oauth/authorize`)
- Token exchange URL (우리: `/oauth/token`)
- Revocation URL (선택)
- PKCE 활성화 (권장)

## Aura OAuth Provider 설계

### 엔드포인트 설계

#### `GET /oauth/authorize`
Query params (Canva 표준):
- `client_id` (canva 고정)
- `redirect_uri` (Canva 등록값 매칭)
- `response_type=code`
- `scope` (e.g. `cards:write`)
- `state` (Canva가 세팅)
- `code_challenge` + `code_challenge_method=S256` (PKCE)

로직:
1. `client_id`, `redirect_uri`, `scope` 검증 → invalid_client / invalid_scope
2. 학생 세션 확인 → 없으면 `/student/login?return=<original-authorize-url>` 리다이렉트
3. 있으면 consent 페이지 렌더 (`/oauth/consent?auth_request_id=<uuid>`)
4. Consent 허용 시:
   - DB에 `OAuthAuthCode` 저장 (10분 만료, studentId + scope + code_challenge + redirect_uri 스냅샷)
   - `<redirect_uri>?code=<code>&state=<state>` 리다이렉트
5. Deny 시: `<redirect_uri>?error=access_denied&state=<state>` 리다이렉트

#### `POST /oauth/token`
Body (form-urlencoded):
- `grant_type=authorization_code` | `refresh_token`
- `code` | `refresh_token`
- `redirect_uri` (authorization_code 시)
- `code_verifier` (PKCE)
- `client_id` / `client_secret` (Basic header 또는 body)

로직 (grant_type=authorization_code):
1. Basic/body에서 client 검증 (constant time)
2. AuthCode 조회 → 없으면/만료 → invalid_grant
3. AuthCode 1회성 소비 (DELETE)
4. PKCE: `SHA256(code_verifier)` === stored `code_challenge`
5. redirect_uri 일치 확인
6. access_token (30일) + refresh_token (180일) 발급, DB 저장
7. 응답: `{access_token, token_type: "Bearer", expires_in: 2592000, refresh_token, scope}`

로직 (grant_type=refresh_token):
1. client 검증
2. refresh_token lookup, 만료/폐기 확인
3. 기존 access_token 회전 (revoke + new)
4. 응답 동일 형식

#### `POST /oauth/revoke`
- `token=<access_or_refresh>&token_type_hint=...`
- 해당 토큰 invalidate, 200 반환 (RFC 7009)

### DB 스키마 변경 (Prisma)

```prisma
model OAuthClient {
  id            String   @id
  name          String
  secretHash    String   // bcrypt/argon2
  redirectUris  String   // JSON array
  scopes        String   // JSON array
  pkceRequired  Boolean  @default(true)
  createdAt     DateTime @default(now())
}

model OAuthAuthCode {
  code              String   @id
  studentId         String
  clientId          String
  redirectUri       String
  scope             String
  codeChallenge     String
  codeChallengeMethod String
  expiresAt         DateTime
  consumedAt        DateTime?
  student           Student  @relation(fields: [studentId], references: [id])
}

model OAuthAccessToken {
  token         String   @id       // hashed
  tokenPrefix   String             // O(1) lookup
  studentId     String
  clientId      String
  scope         String
  expiresAt     DateTime
  revokedAt     DateTime?
  refreshTokenId String?
  student       Student  @relation(fields: [studentId], references: [id])
  @@index([tokenPrefix])
}

model OAuthRefreshToken {
  token         String   @id       // hashed
  tokenPrefix   String
  studentId     String
  clientId      String
  scope         String
  expiresAt     DateTime
  revokedAt     DateTime?
  @@index([tokenPrefix])
}
```

### /api/external/* Bearer 토큰 허용

현재 `verifyPat()` (prefix `aurapat_`)만 인식. 추가로 OAuth 토큰 (prefix `aurastu_` 또는 RFC 표준 형식) 검증 분기.

```ts
// src/lib/external-auth.ts (신규)
export async function verifyBearer(header: string) {
  if (header.startsWith("Bearer aurapat_")) return verifyPat(header);
  if (header.startsWith("Bearer aurastu_")) return verifyOAuth(header);
  return { ok: false, code: "invalid_token_format" };
}
```

### 보안 고려
- Auth code: 10분 만료, 1회성 (재사용 시 모든 관련 토큰 폐기)
- Access token: 30일, refresh로 연장
- Refresh token: 180일, rotation (새로 발급 시 구 리프레시 폐기)
- Client secret: bcrypt hash
- Token: SHA256 hash only, prefix 8자만 평문 (timing-safe compare)
- PKCE 필수 (Canva 지원 + best practice)

### 학부모 OAuth 대상 아님
- `OAuthAuthCode.studentId` — student 전용 FK
- Parent 계정은 이 플로우 사용 X

## 벤치마크

| 제공자 | 패턴 |
|---|---|
| Google OAuth | AuthorizationServer URL + token exchange, PKCE 지원 |
| Supabase Auth | JWT 기반 access_token, refresh rotation |
| Hanko / Ory Hydra | OSS OAuth 2.0 provider 참조 구현 |

우리는 최소 구현 (custom). `oauth4webapi` 같은 라이브러리 대신 Next.js route handler로 직접 작성.

## 결론
- 공식 Canva 계약 확정 — `/oauth/authorize` + `/oauth/token` + (선택) `/oauth/revoke`
- PKCE S256 채택
- DB 4개 모델 추가
- Backend만 1 task(이번) / Canva 앱 통합은 후속 task 권장
