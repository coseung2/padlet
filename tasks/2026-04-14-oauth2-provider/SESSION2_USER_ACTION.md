# Session 2 후속 — 사용자 외부 작업

Backend + Canva 앱 코드는 모두 배포/커밋 완료. 남은 건 **Canva Developer Portal 등록**뿐입니다.

## 1. Canva Developer Portal OAuth Provider 등록

https://www.canva.com/developers/apps → 본인 앱(`AAHAAMW43f4`) → **Authentication** 탭 →
**OAuth integration** 선택 → "Add OAuth provider" 클릭.

다음 필드를 입력:

| 필드 | 값 |
|---|---|
| Provider name | `Aura` |
| **Client ID** | `canva` |
| **Client secret** | `1DmGSCHBZhde-L53m1OdDzEqMla0EyQ-kFFRI6X-JfU` (이미 Vercel env + DB에 심어둠) |
| Credential transfer mode | **Headers** (Basic Auth) — 권장 |
| **Authorization server URL** | `https://aura-board-app.vercel.app/oauth/authorize` |
| **Token exchange URL** | `https://aura-board-app.vercel.app/api/oauth/token` |
| **Revocation URL** | `https://aura-board-app.vercel.app/api/oauth/revoke` |
| **PKCE** | Enabled (S256) |
| **Scopes** | `cards:write` |

### 중요 — Redirect URI 확인
등록 시 Canva가 read-only로 **redirect_uri**를 보여줍니다 (예: `https://www.canva.com/apps/configured/oauth/redirect`).

현재 DB에는 `https://www.canva.com/apps/configured/oauth/redirect`가 등록돼 있어요. 만약 Canva가 다른 URI를 보여주면 이 커맨드로 갱신:

```bash
# Vercel env 갱신
vercel env rm CANVA_OAUTH_REDIRECT_URIS production --yes
echo "<canva-redirect-uri>" | vercel env add CANVA_OAUTH_REDIRECT_URIS production

# DB 갱신 (seed 재실행)
vercel env pull .env.production --environment=production --yes
npx tsx scripts/seed_oauth_client.ts
rm .env.production   # 중요: secret 파일 정리
```

## 2. Canva 앱 번들 재배포

`aura-canva-app` 저장소에 OAuth 전환 commit 생성됨 (local, 미push). Canva 앱 배포는 git이 아니라 Canva CLI + Developer Portal 업로드로 이루어져요:

```bash
cd "C:\Users\심보승\Desktop\Obsidian Vault\aura-canva-app"
# WSL esbuild 플랫폼 이슈 있으면 Windows PowerShell에서 실행
npm install
npm run build   # webpack production bundle
# → dist/ 결과물을 Canva Developer Portal "App bundle" 섹션에 업로드
# 또는 `npm start`로 dev 서버 (https://localhost:8080) 띄운 뒤 Portal에서
# "Development URL"로 연결 상태 테스트
```

## 3. 테스트 체크리스트

Portal 저장 + 번들 업로드 후:

1. Canva 에디터에서 Aura-board 앱 열기 → setting_ui의 **"Aura 학생 계정으로 연결"** 버튼 클릭
2. Canva 팝업이 `/oauth/authorize`로 열림 → 로그인 안 돼있으면 `/student/login`으로 자동 라우팅
3. 로그인 후 consent 페이지 렌더 — "허용" 클릭
4. 팝업 닫히고 앱으로 복귀, "✓ Aura에 로그인됨: 이름" 배너 확인
5. 보드 드롭다운에 본인 학급 보드만 보이는지 확인 (다른 학급 ×)
6. 게시 → 보드에 카드 생성, `studentAuthorId`가 본인으로 기록되는지 DB 확인

## 4. 배포된 것 요약

### Padlet (main 머지 완료, Vercel 자동배포)
- Prisma 4 OAuth 모델 + migration (prod DB 적용됨)
- `/oauth/authorize` consent 페이지
- `/api/oauth/token` PKCE 토큰 교환
- `/api/oauth/revoke` RFC 7009
- `/api/oauth/consent` 폼 핸들러
- `/api/external/*` verifyBearer 전환 (PAT + student OAuth dual)
- Vercel env: CANVA_OAUTH_CLIENT_SECRET + CANVA_OAUTH_REDIRECT_URIS
- DB seed: OAuthClient `canva` row

### aura-canva-app (local commit, 아직 push/Portal 업로드 안 됨)
- `@canva/user` auth.initOauth() + oauth.requestAuthorization
- fetchAura helper (Bearer 자동)
- AURA_PAT 하드코딩 제거
- UX: "학생 계정으로 연결" 버튼 + loading 상태

## 5. 문제 발생 시

- 500 에러: `vercel logs aura-board --since 5m` 확인 후 stack trace 공유
- `invalid_client`: Client Secret 미스매치. Vercel env와 Portal 값 동일한지 확인
- `invalid_grant`: PKCE code_verifier 어긋남 또는 code 10분 만료. 처음부터 다시.
- `student_session_required` (로그인 후에도): browser 3rd-party cookie 차단 여부. Canva는 자체 팝업 관리라 이 오류는 OAuth 경로에선 안 나야 정상.
