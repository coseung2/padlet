# Session 1 → Session 2 Handoff

## 커밋
- 브랜치: `feat/oauth2-provider-backend` (push됨, **main 미머지**)
- 단일 커밋, 4개 OAuth 모델 + 4개 route + lib 2개 + seed

## Session 1에서 완료
- Prisma 스키마 + `prisma/migrations/20260414_add_oauth2_provider/migration.sql` (수동 작성)
- `src/lib/oauth-server.ts` — PKCE S256, 토큰 hash+prefix, rotate, revoke
- `src/lib/external-auth.ts` — `verifyBearer()` (PAT + student OAuth dual path)
- Routes: `/oauth/authorize` (page) · `/api/oauth/consent` · `/api/oauth/token` · `/api/oauth/revoke`
- `/api/external/{boards,cards,sections,whoami}` → `verifyBearer` 전환 (backward compatible)
- Seed: canva OAuth client (ENV `CANVA_OAUTH_CLIENT_SECRET`)
- typecheck ✅, build ✅ (모든 /oauth/* 라우트 manifest에 등장)

## Session 2에서 해야 할 것

### 1. Production migration 배포 (사용자 승인 후)
```bash
# 로컬에서 prod DB 백업 상태 확인 후
npx prisma migrate deploy
# 또는 Vercel 빌드 훅에서 자동 적용
```
- 4 테이블 신규 생성 (기존 데이터 영향 없음)
- 4 FK는 Student/OAuthClient로 — Student 변경 없음

### 2. 환경변수 설정 (Vercel Production)
```
CANVA_OAUTH_CLIENT_SECRET=<high-entropy random string>
CANVA_OAUTH_REDIRECT_URIS=<Canva Developer Portal이 제공하는 redirect_uri>
```

### 3. Canva Developer Portal 등록 (사용자 외부 작업)
https://www.canva.com/developers/apps 에서 OAuth Provider 설정:
- **Provider**: `Aura`
- **Client ID**: `canva`
- **Client Secret**: (CANVA_OAUTH_CLIENT_SECRET 값)
- **Credential transfer mode**: Headers (Basic) 권장
- **Authorization server URL**: `https://aura-board-app.vercel.app/oauth/authorize`
- **Token exchange URL**: `https://aura-board-app.vercel.app/api/oauth/token`
- **Revocation URL**: `https://aura-board-app.vercel.app/api/oauth/revoke`
- **PKCE**: enabled (S256)
- **Scopes**: `cards:write`
- Canva가 제공하는 redirect_uri를 `CANVA_OAUTH_REDIRECT_URIS`에 반영

### 4. Canva 앱 repo 수정 (`aura-canva-app`)
- `auth.initOauth()` 초기화
- `oauth.requestAuthorization({ scope: 'cards:write' })` 호출 버튼 (현재 PAT 하드코딩 제거)
- fetch 시 `Authorization: Bearer ${accessToken}` (oauth.getAccessToken())
- setting_ui.tsx의 로그인 배너는 그대로 (whoami는 Bearer 토큰도 수용)

### 5. 머지 & 재배포
- migration 적용 + Canva 통합 확인 후 `feat/oauth2-provider-backend` → main 머지

## 로컬 smoke 테스트 결과 (Session 1)
- `/oauth/authorize` (no params) → 200 에러 페이지 (response_type 검증)
- `/oauth/authorize` (unknown client) → 500 (로컬 DB에 테이블 없음, 예상)
- `/api/oauth/token` (wrong content-type) → 400 `invalid_request` ✅
- `/api/oauth/revoke` (no auth) → 401 `invalid_client` ✅
- `/api/external/boards` (Bearer aurastu_*) → OAuth path 진입 확인 (table 부재로 500)

모든 500은 migration 미적용이 원인. Session 2에서 migrate 후 재검증.

## 보안 체크리스트
- [x] PKCE S256 필수 (client.pkceRequired=true)
- [x] Auth code 10분 만료 + 1회성 (consumedAt)
- [x] Refresh token rotation (재사용 시 chain 전체 revoke)
- [x] Client secret hashed (SHA256+PEPPER, timing-safe)
- [x] Access token prefix-indexed O(1) lookup + timing-safe compare
- [x] Student-scoped — 학급 불일치 시 forbidden
- [x] RFC 7009 revoke (항상 200 반환)
