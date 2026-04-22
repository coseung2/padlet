# Sandbox 서브도메인 분리 — `sandbox.aura-board.app`

> 관리자 전용 작업. 배포한 코드에 더해 Vercel 대시보드 + DNS 제공자 측에서
> 수동 설정해야 완결됩니다.

## 왜 분리하는가

현재 `/sandbox/vibe/:id` 는 메인 앱(`aura-board-app.vercel.app`)과 동일 오리진.
학생이 만든 HTML이 `document.cookie` / `localStorage` / SessionStorage 에
접근하면 메인 앱의 인증 쿠키를 훔칠 수 있음. iframe sandbox 속성으로 1차
방어는 되지만 서브도메인 분리로 origin 자체를 다르게 해 완전히 격리한다.

## 단계

### 1. Vercel 대시보드 — 도메인 추가

1. https://vercel.com/mallagaenge-1872s-projects/aura-board/settings/domains
2. `sandbox.aura-board.app` 추가. Project는 동일 `aura-board`.
3. "Git Branch" = `main` (메인 도메인과 동일 배포에 매핑)

### 2. DNS 제공자 레코드 추가

도메인 구매처 (Cloudflare / 가비아 / Namecheap 등)에서:

```
Type:  CNAME
Host:  sandbox
Value: cname.vercel-dns.com.
TTL:   auto
```

전파 확인:
```
nslookup sandbox.aura-board.app
# → cname.vercel-dns.com. 또는 Vercel edge IP
```

### 3. Vercel 프로젝트 환경 변수 추가

```
NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN = https://sandbox.aura-board.app
```

Production + Preview 모두. 이 env가 세팅되면 VibePlayModal이 iframe src를
sandbox 서브도메인 경유로 생성하고 postMessage origin 검증도 해당 origin을
추가 허용한다 (현재 코드: `src/components/vibe-arcade/VibePlayModal.tsx` +
`NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN` 참조).

### 4. 라우트 수정 — iframe src 분리

※ **후속 코드 작업**. 지금 커밋에는 포함 안 됨.

`VibePlayModal.tsx` 에서 iframe src를 다음과 같이:
```ts
const sandboxOrigin = process.env.NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN;
const base = sandboxOrigin ?? ""; // 없으면 같은 origin fallback
const src = `${base}/sandbox/vibe/${projectId}?pt=${encodeURIComponent(playToken)}`;
```

그리고 `next.config.ts` 에서 sandbox 라우트의 `Content-Security-Policy`
헤더를 `frame-ancestors https://aura-board-app.vercel.app` 로 제한해
다른 사이트에서 iframe 삽입 차단.

### 5. 검증 체크리스트

- [ ] `sandbox.aura-board.app` 이 SSL 포함 200 응답 (임의 경로)
- [ ] iframe src가 새 origin을 가리킴 (개발자 도구 > Network)
- [ ] 학생 브라우저에서 sandbox origin은 메인 쿠키(`next-auth.session-token`
      등)를 볼 수 없음 (document.cookie가 비어 있음)
- [ ] postMessage 이벤트가 여전히 메인 앱에 도달
- [ ] 다른 도메인(예: evil.example) 에서 iframe 삽입 시 브라우저 콘솔에
      frame-ancestors 차단 경고 출력

## 롤백

NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN 을 삭제하면 같은 origin fallback으로 되돌아감.
DNS와 Vercel 도메인 설정은 비용 없으므로 남겨도 무해.
