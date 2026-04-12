# Design Doc — canva-oembed

task_id: 2026-04-12-canva-oembed
branch: feat/canva-oembed
stack lock: Next.js 16 App Router + Prisma + NextAuth 5 beta + Postgres(Supabase) — unchanged from `docs/architecture.md`.

Scope upstream: `phase2/scope_decision.md` — Selective Expansion with 6 UX patterns adopted and 8 acceptance criteria.

---

## 1. 데이터 모델 변경

**결론: 이번 task 에서 schema 변경 없음 (no-op migration).**

`prisma/schema.prisma` 의 `Card` 모델이 이미 보유한 컬럼을 Canva oEmbed 응답의 저장소로 재활용한다.

### 1-1. 재사용 매핑 (Card 컬럼 ↔ oEmbed 응답)

| Card 컬럼 | 기존 의미 | Canva URL 일 때 추가 의미 | 출처 (oEmbed 응답) |
|---|---|---|---|
| `linkUrl`    | 링크 카드의 href        | Canva view URL (정규화 후 저장) | 입력 그대로 |
| `linkTitle`  | OG 타이틀             | Canva 디자인 제목                | `title` |
| `linkImage`  | OG 썸네일 (경로/URL)    | Canva CDN 썸네일 URL              | `thumbnail_url` |
| `linkDesc`   | OG description       | `"by {authorName}"` 문자열       | `author_name` |

- `imageUrl`, `videoUrl` 은 **건드리지 않음**. Canva 분기는 `linkUrl` 기반이므로 비디오/이미지 카드와 독립.
- iframe `src` 는 `linkUrl` 에서 `designId` 를 런타임에 다시 추출해 조립 (DB 에 별도 저장 불필요). 재구성 규칙: §2-1 의 `designId` 규칙.
- Canva 고유 필드 (`iframeSrc`, `width`, `height`) 는 DB 저장 안 함 — 16:9 반응형 wrapper 가 width/height 에 무관하게 동작하고 iframeSrc 는 designId 로부터 결정적 재구성되기 때문.

### 1-2. 마이그레이션

- **없음**. `prisma migrate` 실행 생략. phase7 구현 시 schema 변경이 필요해지면 phase3 재실행 (scope 범위를 벗어남).

### 1-3. 후속 task 대비 힌트 (지금은 적용 안 함)

- `Card.kind String @default("link")` 필드는 `phase2/scope_decision.md §2 OUT` 에 따라 후속 task 의 책임. 이번 task 는 **URL 패턴 매칭**으로 분기.
- Canva oEmbed 응답 캐시 TTL 도 별도 테이블 없이 DB 필드(linkTitle/linkImage/linkDesc)에 쓰는 시점이 곧 캐시 시점.

---

## 2. API 변경

**신규 route 없음.** 기존 `POST /api/cards` 와 `PATCH /api/cards/[id]` 핸들러 내부에서 `src/lib/canva.ts` 의 신규 함수를 인라인 호출.

### 2-1. `src/lib/canva.ts` — 신규 함수 `resolveCanvaEmbedUrl`

삽입 위치 힌트: 현 파일의 `resolveCanvaDesignId` (line 316) 바로 아래.

```text
// Type (new, exported)
type CanvaEmbed = {
  iframeSrc:    string   // e.g. "https://www.canva.com/design/DAF.../view?embed&meta"
  thumbnailUrl: string   // from oEmbed.thumbnail_url
  title:        string   // from oEmbed.title
  authorName:   string   // from oEmbed.author_name
  width:        number   // from oEmbed.width
  height:       number   // from oEmbed.height
  designId:     string   // extracted from normalized URL
}

// Detector (new, exported) — pure sync, no network
function isCanvaDesignUrl(rawUrl: string): boolean
  // true iff host matches /canva\.com|canva\.link/ AND
  //   (host is canva.link)  OR  (path contains "/design/{ID}")
  // Also accepts www-prefixed and non-www variants.

// Resolver (new, exported) — async, MAY do 1–2 network hops
async function resolveCanvaEmbedUrl(rawUrl: string): Promise<CanvaEmbed | null>
  1. Guard: if not isCanvaDesignUrl(rawUrl) → return null
  2. Normalize:
     - Short-link: if host is canva.link, reuse resolveCanvaDesignId style
       (HEAD/GET with redirect:"manual", read Location header, 3s timeout)
     - Strip query + hash, ensure path ends with "/view" (map /edit → /view)
     - designId = path match /\/design\/([A-Za-z0-9_-]+)\//.
     - If designId missing → return null
     - canonicalUrl = `https://www.canva.com/design/${designId}/view`
  3. Fetch oEmbed:
     - endpoint = `https://www.canva.com/_oembed?url=${encodeURIComponent(canonicalUrl)}`
     - fetch(endpoint, { signal: AbortSignal.timeout(3000), headers: { "User-Agent": UA } })
     - if !res.ok → return null
     - body = await res.json() (wrap in try/catch — return null on parse error)
  4. Validate:
     - Require type === "rich" AND thumbnail_url present
     - If validation fails → return null
  5. Return CanvaEmbed:
       iframeSrc    : `https://www.canva.com/design/${designId}/view?embed&meta`
       thumbnailUrl : String(body.thumbnail_url)
       title        : String(body.title ?? "Canva design")
       authorName   : String(body.author_name ?? "")
       width        : Number(body.width ?? 1600)
       height       : Number(body.height ?? 900)
       designId
  6. Any throw → catch & return null (호출부가 graceful degradation 담당)
```

**Caller contract**: 반환 `null` 은 "Canva 임베드로 다룰 수 없음 → 기존 link-preview 흐름 유지" 로 해석. 에러 throw 안 함.

### 2-2. `POST /api/cards` 통합 지점

삽입 위치: `src/app/api/cards/route.ts` line 31 `await requirePermission(...)` 와 line 33 `db.card.create(...)` **사이**.

```text
let linkTitle = input.linkTitle ?? null
let linkDesc  = input.linkDesc  ?? null
let linkImage = input.linkImage ?? null
let linkUrl   = input.linkUrl   ?? null

if (linkUrl && isCanvaDesignUrl(linkUrl)) {
  const embed = await resolveCanvaEmbedUrl(linkUrl)
  if (embed) {
    // Canonicalize the stored URL so render is deterministic
    linkUrl   = `https://www.canva.com/design/${embed.designId}/view`
    linkTitle = linkTitle ?? embed.title           // don't overwrite user-provided title
    linkImage = linkImage ?? embed.thumbnailUrl
    linkDesc  = linkDesc  ?? (embed.authorName ? `by ${embed.authorName}` : null)
  }
  // embed === null → fall through; client may subsequently call /api/link-preview
}

// Then proceed with existing db.card.create, substituting the resolved fields.
```

### 2-3. `PATCH /api/cards/[id]` 통합 지점

삽입 위치: `src/app/api/cards/[id]/route.ts` line 41 `const input = PatchCardSchema.parse(body)` 와 line 42 `db.card.update(...)` **사이**.

```text
const patch = { ...input }

if (
  typeof patch.linkUrl === "string" &&
  patch.linkUrl !== card.linkUrl &&     // only re-resolve on URL change
  isCanvaDesignUrl(patch.linkUrl)
) {
  const embed = await resolveCanvaEmbedUrl(patch.linkUrl)
  if (embed) {
    patch.linkUrl   = `https://www.canva.com/design/${embed.designId}/view`
    // Reset stale metadata from previous URL — explicit overwrite on URL change
    patch.linkTitle = patch.linkTitle ?? embed.title
    patch.linkImage = patch.linkImage ?? embed.thumbnailUrl
    patch.linkDesc  = patch.linkDesc  ?? (embed.authorName ? `by ${embed.authorName}` : null)
  }
}

// Then proceed with db.card.update({ where: { id }, data: patch })
```

Idempotency: URL 미변경이면 oEmbed 호출 스킵 → 드래그/리사이즈 PATCH 가 외부 API 를 때리지 않는다.

### 2-4. 실시간 이벤트

- **변경 없음**. 기존 card.update broadcast 가 그대로 linkTitle/linkImage/linkDesc 변경을 전달.
- iframe 은 Canva 측이 자체 갱신 (oEmbed 갱신 아님) → acceptance criteria §3 "30초 내 반영" 은 iframe 내부 동작에 의존, Aura-board 실시간 채널과 독립.

### 2-5. CSP / 헤더 변경 (`next.config.ts`)

기존 파일(lines 1-8)에 `async headers()` 추가. **기존 필드 `reactStrictMode`, `allowedDevOrigins` 는 보존**.

```text
// Pseudocode — keep exact list management to phase7
const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [...],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-src 'self' https://www.canva.com https://www.youtube.com",
              // Do NOT add script-src / default-src here — avoid regressions.
            ].join("; "),
          },
        ],
      },
    ]
  },
}
```

Notes:
- `frame-src` 만 추가. 다른 directive (script-src, default-src, img-src 등)는 건드리지 않는다 — NextAuth 콜백, next-image, 외부 이미지 호스트가 전부 기존 기본값에 의존.
- youtube.com 포함은 회귀 방지 (acceptance §6).
- 개발 서버에서도 동일 헤더 적용되어 미리 검증 가능.

---

## 3. 컴포넌트 변경

**수정 1개 파일**: `src/components/CardAttachments.tsx`. 신규 컴포넌트 파일 없음 (phase2 OUT 결정의 "최소 변경").

### 3-1. 변경 트리

```
CardAttachments (memo, client)            ← 유일한 수정 지점
├── card-attach-image          (unchanged)
├── card-attach-video (YouTube/native) (unchanged)
├── card-canva-embed           (NEW branch — 조건부 렌더)
│   ├── <img class="card-canva-thumb">   (썸네일 — iframe 로드 전까지)
│   └── <iframe>                         (Canva 라이브)
└── card-link-preview           (existing — fallback 경로로도 재사용)
```

### 3-2. 분기 규칙 (CardAttachments 내부)

```text
// At top of CardAttachments:
const canvaDesignId = linkUrl ? extractCanvaDesignId(linkUrl) : null
// extractCanvaDesignId: lightweight sync parser; same regex as isCanvaDesignUrl.
// Helper lives beside getYouTubeId in same file, or exported from src/lib/canva.ts.

// Local UI state (client):
const [iframeLoaded, setIframeLoaded] = useState(false)
const [iframeFailed, setIframeFailed] = useState(false)

// Render decision tree for the link slot:
if (linkUrl && canvaDesignId && !iframeFailed) {
  render <CanvaEmbedBranch />
} else if (linkUrl) {
  render existing <a class="card-link-preview">   // graceful degradation path
}
```

### 3-3. Canva 분기 의사코드 (`.card-canva-embed`)

```text
<div class="card-canva-embed"
     style="position: relative; width: 100%; padding-bottom: 56.25%;">

  {/* Thumbnail — painted immediately, hides after iframe load */}
  {linkImage && !iframeLoaded && (
    <img
      class="card-canva-thumb"
      src={linkImage}
      alt={linkTitle ?? "Canva design"}
      loading="lazy"
      onError={() => { /* keep showing — fallback to iframe only */ }}
      style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"
    />
  )}

  <iframe
    src={`https://www.canva.com/design/${canvaDesignId}/view?embed&meta`}
    title={linkTitle ?? "Canva design"}
    loading="lazy"
    sandbox="allow-scripts allow-same-origin allow-popups"
    referrerPolicy="no-referrer-when-downgrade"
    onLoad={() => setIframeLoaded(true)}
    onError={() => setIframeFailed(true)}
    style="position:absolute; inset:0; width:100%; height:100%; border:0;"
  />

  {/* Attribution footer — optional; small label at bottom */}
  {linkDesc && (
    <span class="card-canva-attr">{linkDesc}</span>
  )}
</div>
```

Notes on React / memo correctness:
- Component stays wrapped in `memo` — new local state (`iframeLoaded`, `iframeFailed`) is internal, doesn't break memo contract.
- `iframeFailed` triggers fallback to existing `card-link-preview` branch in same render pass (no new network hop).
- No `dangerouslySetInnerHTML` anywhere (XSS hardening, §5-6).
- `onLoad` fires for both success and many "logged-out" Canva states — we accept that; real failure goes to §5-3 onError path.

### 3-4. 상태 위치

| 상태                            | 위치            | 수명                 |
|---|---|---|
| `linkUrl / linkTitle / linkImage / linkDesc` | server (DB → Card prop)   | 카드 수명과 동일      |
| `iframeLoaded`, `iframeFailed`  | client (CardAttachments 로컬 useState) | 컴포넌트 인스턴스 수명 |
| `canvaDesignId`                 | client 파생값 (useMemo 불필요 — string cheap) | render 범위만 |

실시간 상태 없음 — 모든 변경은 기존 card.update 브로드캐스트에 묻어간다.

### 3-5. 스타일 (`src/styles/*.css`)

phase5 에서 확정. 지금은 규칙 2 개만 계약:
- `.card-canva-embed { position: relative; padding-bottom: 56.25%; width: 100%; }`
- `.card-canva-embed > iframe, .card-canva-embed > img { position: absolute; inset: 0; width: 100%; height: 100%; }`

---

## 4. 데이터 흐름 다이어그램

### 4-1. 생성 (POST /api/cards)

```
┌────────────────┐  paste Canva URL   ┌──────────────────┐
│ AddCardModal   │ ───────────────▶   │ onSubmit handler │
│ (client)       │                    │ (client)         │
└────────────────┘                    └─────────┬────────┘
                                                │ fetch POST /api/cards
                                                ▼
                                     ┌────────────────────┐
                                     │ POST /api/cards    │
                                     │ (Node runtime)     │
                                     └──────┬─────────────┘
                                            │ requirePermission()
                                            │ isCanvaDesignUrl(linkUrl) ?
                                            │       ├── NO  → skip
                                            │       └── YES ▼
                                            │   resolveCanvaEmbedUrl(linkUrl)
                                            │       │ fetch www.canva.com/_oembed
                                            │       ├── null → keep original fields
                                            │       └── CanvaEmbed → populate
                                            │            linkTitle/linkImage/linkDesc
                                            ▼
                                     ┌──────────────────┐
                                     │ prisma card.create│
                                     │ (Postgres)       │
                                     └──────┬───────────┘
                                            │ 201 { card }
                                            ▼
                                     ┌──────────────────┐
                                     │ realtime broadcast│
                                     │ (existing)       │
                                     └──────┬───────────┘
                                            ▼
                                    clients re-render board
```

### 4-2. 렌더 (Board → Card → CardAttachments)

```
Card props { linkUrl, linkTitle, linkImage, linkDesc }
        │
        ▼
CardAttachments
  │
  ├── canvaDesignId = extractCanvaDesignId(linkUrl)
  │
  ├── canvaDesignId != null AND !iframeFailed
  │      └── render .card-canva-embed
  │            ├── <img src=linkImage>      ← paints first (LCP hit)
  │            └── <iframe src=…/view?embed&meta>
  │                 onLoad → hide thumbnail
  │                 onError → setIframeFailed(true) → rerender branch below
  │
  └── fallback: existing <a class="card-link-preview"> branch
        (same linkUrl/linkTitle/linkImage/linkDesc — no extra fetch)
```

### 4-3. 편집 (PATCH /api/cards/[id])

```
User edits linkUrl in CardEditor
        │
        ▼
PATCH /api/cards/[id]
        │
        ├── patch.linkUrl === card.linkUrl ?
        │       ├── YES → skip oEmbed (drag/resize case)
        │       └── NO  ▼
        │            isCanvaDesignUrl(patch.linkUrl) ?
        │                ├── NO  → normal PATCH
        │                └── YES → resolveCanvaEmbedUrl → merge fields
        │
        ▼
prisma card.update → realtime broadcast → clients re-render
```

---

## 5. 엣지케이스 (8개 — 요구치 ≥5 초과)

### 5-1. Canva oEmbed 엔드포인트 5xx / 타임아웃
- 트리거: `https://www.canva.com/_oembed` 가 500/503 또는 >3s 응답.
- 동작: `resolveCanvaEmbedUrl` 이 `null` 반환 → POST/PATCH 핸들러는 원본 `linkUrl` 만 저장 → 클라이언트는 linkImage 없이 `.card-canva-embed` 대신 `.card-link-preview` 로 렌더 (canvaDesignId 는 있지만 linkImage 부재 시 iframeFailed false 라 iframe 자체는 시도 — onLoad 실패하면 fallback).
- 완화 추가안 (phase7 판단): AbortSignal timeout 3000ms 하드코딩, 재시도 없음 (사용자 경험 > 정확도).

### 5-2. Canva URL 정규화 누락 케이스
- `canva.link/abc123` 단축 URL: HEAD redirect follow 로 해결 (pseudo §2-1 step 2).
- `/edit` vs `/view`: path 정규화로 `/view` 로 치환.
- 쿼리스트링에 embed 파라미터가 이미 있음: `?embed&meta` 재삽입 시 중복 가능 → 정규화에서 쿼리 전부 제거 후 재조립.
- 대문자 호스트 `Canva.com`: URL 파서로 lowercase 강제.
- 동작: 위 정규화 실패 시 `designId` 추출 실패 → `resolveCanvaEmbedUrl` null → link-preview fallback.

### 5-3. 비공개 디자인 (iframe 이 Canva 로그인 프롬프트 표시)
- oEmbed 엔드포인트는 public 디자인에만 응답 → 비공개면 `resolveCanvaEmbedUrl` 이 null → link-preview 경로. 이 경우 `/api/link-preview` 가 Canva 의 OG 메타를 가져와 일반 링크 프리뷰로 degrade (기존 동작).
- 단, public 디자인이었다가 사후에 비공개 전환되면 DB 엔 Canva 메타가 남고 iframe 이 로그인 UI 를 렌더 — 이 UI 도 Canva sandbox 안 → 우리 CSP/iframe `allow-scripts allow-same-origin allow-popups` 로 OK. 사용자는 "로그인" 안 함 → 시각적으로 로그인 폼이 보임. 본 task 에서는 수용 (후속 task 에서 "비공개 배지" 추가).

### 5-4. 학교망에서 canva.com 전체 차단
- iframe 로드 실패 + 썸네일도 같은 호스트 CDN 이면 이미지까지 실패.
- `<img onError>` 는 현재 무시 (§3-3) → 빈 공간. `<iframe onError>` 는 브라우저별로 일관 미발화 가능 — timer-based fallback 을 phase7 에서 검토 (예: 8초 후 iframeLoaded=false 이면 iframeFailed=true).
- 완화: link-preview 의 `linkImage` 는 `/api/link-preview` 가 로컬 `/uploads/` 로 캐시한 사본 — 이 경로를 `linkImage` 에 쓰면 학교망에서도 표시된다. phase7 에서 Canva 썸네일을 `/api/link-preview` 로 프록시할지 결정.

### 5-5. CSP 오설정으로 YouTube 기존 임베드 깨짐
- `frame-src 'self' https://www.canva.com` 만 써서 `https://www.youtube.com` 가 누락되면 YouTube iframe 차단.
- 완화: CSP 값에 youtube.com 반드시 포함 (acceptance §6). phase9 QA 체크리스트에 YouTube 카드 렌더 1건 강제.
- CSP 를 새로 도입하는 task 이므로 "기존 CSP 와 충돌" 리스크는 없음 (기존 CSP 헤더 없음) — 반대로, 신규 추가가 다른 external iframe(예: next-auth 콜백 iframe 이 없음 확인)을 깰 수 있어 phase9 에서 OAuth 로그인/next-image 모두 점검.

### 5-6. oEmbed 응답 `html` 필드 XSS 위험
- Canva oEmbed 응답의 `html` 필드는 `<iframe ...>` 문자열 — 이를 innerHTML 로 삽입하면 응답이 조작된 경우 XSS.
- 완화: `html` 필드 **전체 무시**. 우리는 `designId` 만 쓰고 iframe 은 JSX 로 직접 렌더. `dangerouslySetInnerHTML` 사용 금지(§3-3 명시).
- 추가: `resolveCanvaEmbedUrl` 은 response.json() 결과를 `String()` / `Number()` 강제 캐스팅 (§2-1 step 5). 객체/스크립트 주입 무력화.

### 5-7. Canva CDN 썸네일 401/403 (hotlink 토큰 만료)
- `linkImage` 가 Canva CDN 직접 URL 이면 일정 기간 후 403. 이미 `src/app/api/link-preview/route.ts` (lines 83-104) 가 OG 이미지를 `public/uploads/` 에 캐싱 — 같은 전략을 phase7 에서 `resolveCanvaEmbedUrl` 에 이식 가능 (but scope 는 "원본 URL 저장" 으로 유지, 캐싱은 optional).
- 현재 설계: 원본 `thumbnail_url` 저장. 이미지 실패 시 iframe 만 보임 (iframeLoaded=true 시 썸네일 숨김이라 육안 변화 작음).

### 5-8. 동시 편집 경쟁 (linkUrl 변경 중 추가 PATCH)
- 사용자 A 가 linkUrl 을 Canva URL 로 바꾸는 PATCH 중, 사용자 B 가 x/y (드래그) PATCH 송신.
- 현재 PATCH 는 `data: patch` 로 undefined 필드를 보내지 않음(Prisma) → linkUrl 미포함 PATCH 는 URL 에 영향 없음. oEmbed 호출도 §2-3 의 "linkUrl 변경 시에만" 가드로 드래그에서는 호출 안 됨.
- 두 PATCH 가 동시에 linkUrl 을 다른 값으로 바꾸면 last-writer-wins (기존 정책과 동일, 설계 유지).
- 추가 주의: oEmbed 이 3초 걸리는 동안 클라이언트 B 가 linkUrl 을 또 바꾸면, 응답 도착 시점 DB 상태와 어긋날 수 있음. 수용: PATCH 응답이 최종 상태이므로 realtime broadcast 가 정합화.

---

## 6. DX 영향

### 6-1. 타입 추가
- `src/lib/canva.ts`: `export type CanvaEmbed = {...}` (§2-1). 기존 `CanvaDesignInfo` 와 별개 — OAuth 경로의 design info 와 혼동하지 않도록 이름 분리.
- `src/components/CardAttachments.tsx`: 기존 `Props` 불변. 내부 helper `extractCanvaDesignId(url: string): string | null` 추가 (export 불필요, 필요 시 `src/lib/canva.ts` 로 이관).

### 6-2. Lint / TypeCheck
- `npm run typecheck` 는 pass 기대 — 모든 신규 코드는 strict-null 호환.
- lint: 새 JSX prop 은 React 19 규약 준수 (`sandbox`, `referrerPolicy` 는 camelCase). `onLoad`/`onError` 는 iframe 에서 허용.
- Zod schema 변경 없음 (linkUrl/linkTitle/linkImage/linkDesc 기존 그대로) → API validation 회귀 위험 0.

### 6-3. 빌드 / 배포 영향
- 번들 크기: `resolveCanvaEmbedUrl` 은 server-only (Node runtime) 이므로 클라이언트 번들 영향 없음.
- 클라이언트 번들 증가: `extractCanvaDesignId` 한 함수 + useState 2개 분량 (<0.5 KB gzipped).
- 빌드 시간 영향: 없음 (새 의존성 없음, CSS 규칙 2줄).
- 배포 구성: Vercel 환경변수 변경 없음. CSP 추가는 Next.js `headers()` 로 런타임 부여 — Edge / Node 모두 동일.
- Runtime 선택: `POST /api/cards`, `PATCH /api/cards/[id]` 는 기존 default(Node). Edge 로 이동하지 않음.

### 6-4. 문서 업데이트 필요 항목
- `docs/architecture.md` — "Card integrations" 섹션에 "Canva oEmbed (public design live iframe, 2026-04)" 한 줄 + CSP `frame-src` 허용 호스트 목록 갱신.
- `docs/current-features.md` (존재 시) — 사용자 표시용: "Canva 디자인 URL 을 카드에 붙이면 라이브 임베드".
- `prompts/*` 수정 없음.
- CLAUDE.md 수정 없음 (스택 결정 아님).

### 6-5. 테스트 기대
- 유닛: `isCanvaDesignUrl` / `extractCanvaDesignId` 에 대한 표 기반 테스트 (phase7 에서 9 케이스: view/edit/no-www/canva.link/쿼리있음/해시/잘못된 path/유튜브 URL/빈 문자열).
- 통합: `resolveCanvaEmbedUrl` 은 phase7 에서 fetch mock 필요. 실망/타임아웃/파싱실패 3 경로.
- 회귀: YouTube 카드, 일반 링크 카드, 이미지 카드 렌더가 변하지 않음 (수동 phase9).

---

## 7. 롤백 계획

### 7-1. 롤백 트리거
- 배포 후 다음 중 하나 발생 시 즉시 롤백:
  - YouTube iframe 또는 next-auth 흐름이 CSP 로 깨짐.
  - `resolveCanvaEmbedUrl` 이 예외 경로에서 500 을 흘려 POST /api/cards 가 실패.
  - Canva 도메인이 악용되어 CSP allowlist 재고 필요.

### 7-2. 롤백 절차
1. `git revert <merge-commit-of feat/canva-oembed>` — 단일 revert commit 으로 충분.
2. `npm run build && npm run typecheck` 로 revert 빌드 검증.
3. Vercel 프로덕션 배포 트리거.

DB 변경 없음 → **migration 롤백 불필요**. 기존 Card 행의 linkTitle/linkImage/linkDesc 는 Canva 포맷이 들어간 상태로 남지만, revert 후 렌더는 일반 link-preview 경로라 시각적 회귀는 "Canva 용 배지 없음" 수준 — 사용자 데이터 손실 0.

### 7-3. CSP 변경 롤백
- `next.config.ts` 에 `headers()` 블록 제거 (또는 revert 에 포함). CSP 헤더 미설정 상태로 복귀 — 브라우저는 제한 없는 기본 동작, 회귀 없음.
- **CSP 변경은 idempotent**: 적용/제거 모두 재적용 안전.

### 7-4. 롤백 성공 검증 체크리스트
- [ ] `curl -I https://{prod-url}/boards/any | grep -i content-security-policy` → 결과 없음(또는 이전 설정).
- [ ] 기존 YouTube URL 을 카드로 붙여넣으면 iframe 정상.
- [ ] Canva URL 을 카드로 붙여넣으면 일반 `card-link-preview` 로 렌더 (iframe 아님).
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.
- [ ] Sentry/console 에서 `resolveCanvaEmbedUrl` 관련 에러 0 (함수 자체 revert 됨).

### 7-5. 후속: 재시도 전략
- 원인 분석 → 실패한 스코프(예: CSP 값, oEmbed 타임아웃, iframe onError 미발화)만 좁혀 재설계 → phase3 재실행. 전체 feature 폐기 대신 **부분 축소 재투입** 선호.

---

## 부록 A. phase7 구현자 체크리스트 (non-normative)

- [ ] `src/lib/canva.ts`: `isCanvaDesignUrl`, `extractCanvaDesignId`, `resolveCanvaEmbedUrl`, `CanvaEmbed` 타입 추가 (기존 export 보존).
- [ ] `src/app/api/cards/route.ts`: POST 에 oEmbed 분기 (§2-2 위치).
- [ ] `src/app/api/cards/[id]/route.ts`: PATCH 에 URL-변경 가드 + oEmbed 분기 (§2-3).
- [ ] `src/components/CardAttachments.tsx`: Canva 분기 + iframeLoaded/iframeFailed 상태 (§3-3).
- [ ] `next.config.ts`: `headers()` 추가, `frame-src` 에 canva.com + youtube.com (§2-5).
- [ ] 스타일: `.card-canva-embed` / thumb / iframe 3 규칙.
- [ ] 유닛/통합 테스트 추가.
- [ ] `docs/architecture.md` + `docs/current-features.md` 업데이트.
