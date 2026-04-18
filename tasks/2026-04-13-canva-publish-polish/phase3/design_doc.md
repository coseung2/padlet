# Design Doc — canva-publish-polish

task_id: `2026-04-13-canva-publish-polish`
change_type: `enhancement`
의존 phase2 Revision: `Reduction` 모드 최종 scope.

## 0. 영향 파일 (read-only 식별)

- `prisma/schema.prisma` — Card 모델에 `canvaDesignId` 추가
- `src/app/api/external/cards/route.ts` — 요청 body 스키마 + DB insert 확장
- `src/lib/canva.ts` — `resolveCanvaEmbedUrl` 의 oEmbed 실패 fallback (Canva Connect API)
- `src/components/CardAttachments.tsx` — 작성자 푸터 렌더, `canvaDesignId` 우선 추출
- `src/app/globals.css` 또는 card 관련 CSS — `.card-author-footer` 토큰
- 테스트: `src/lib/__tests__/canva-embed.test.ts`(회귀 보강)

기존 파일 보존(수정 안 함): `CanvaEmbedSlot.tsx`, `useIframeBudget`, `useInViewport`, `/api/cards/*` 핵심 로직.

## 1. 데이터 모델 변경

### Prisma schema — `model Card`

```prisma
model Card {
  // ... 기존 필드 전부 유지 ...
  canvaDesignId String?   // Canva design 식별자 (publisher 앱 게시 시 + 링크 붙여넣기 해석 성공 시)
  @@index([canvaDesignId])  // 선택 — 디자인별 카드 조회가 생길 때만. MVP 에서는 생략.
}
```

### 마이그레이션 전략

- `prisma migrate dev --name add_card_canva_design_id` 로 Nullable 컬럼 추가 → backward compatible, 기존 rows 영향 없음.
- DB 마이그레이션은 **사용자 승인 후** 실행 (memory `No destructive DB commands`). `prisma migrate deploy` 는 phase10 배포 시.
- Roll-forward 후 롤백은 컬럼 drop migration 으로 되돌릴 수 있으나 데이터 손실 가능 — 롤백 플랜 §7 참조.

### Non-goals

- `Card.embedUrl` / `canvaUpdatedAt` 컬럼 추가 안 함 (scope revision 참조).
- `OAuthToken` 스키마 변경 없음.

## 2. API 변경

### POST `/api/external/cards` — 요청 body 확장

기존 Zod 스키마(strict 4필드) 에 2개 optional 필드 추가.

```ts
// 기존
z.object({
  boardId: string,
  title: string,
  imageDataUrl: "data:image/png;base64,...",
  sectionId: string | null | undefined,
}).strict();

// 확장안
z.object({
  boardId: string,
  title: string,
  imageDataUrl: "data:image/png;base64,...",
  sectionId: string | null | undefined,
  canvaDesignUrl: z.string().url().optional(),  // Canva Content Publisher 앱이 전달
  canvaDesignId: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),  // URL 파싱 실패 대비
}).strict();
```

- 두 필드 모두 optional — 기존 PAT 호출 흐름(JSON 스키마 엄격 검증) 호환.
- 서버에서 `canvaDesignUrl` 있으면 `extractCanvaDesignId` 로 ID 추출 → `canvaDesignId` 최종 결정.
- 두 필드 모두 없으면 기존 동작(이미지 카드) 그대로.

### Card INSERT 변경

```ts
await db.card.create({
  data: {
    // ... 기존 필드 ...
    canvaDesignId: finalDesignId ?? null,
    linkUrl: input.canvaDesignUrl ?? null,           // CardAttachments 의 canRenderCanvaEmbed 조건 충족
    linkTitle: input.title,                          // publisher 앱에서 받은 제목 재사용
    linkImage: blobUrl,                              // PNG 썸네일 = linkImage (oEmbed thumbnail 대체)
  },
});
```

핵심 통찰: `linkImage` 를 Blob PNG URL 로 채우면, Content Publisher 앱 카드도 기존 `CanvaEmbedSlot` 의 썸네일+라이브 UX 로 자동 진입.

### 응답 포맷

변함없음. `{ id, url }` 유지.

### `resolveCanvaEmbedUrl` fallback (src/lib/canva.ts)

기존 oEmbed 시도 → 모두 실패 시 Canva Connect API fallback:

```
1. isCanvaDesignUrl(rawUrl) → 아니면 null (기존)
2. designId = resolveCanvaDesignId(rawUrl) (기존)
3. for endpoint in [api.canva.com, www.canva.com]: oEmbed 시도 (기존)
4. [NEW] oEmbed 전부 실패 → getCanvaDesignViaConnect(designId, studentOAuthToken?)
    - Connect API `GET https://api.canva.com/rest/v1/designs/{designId}`
    - 응답의 thumbnail.url, title, owner.user_id 사용
    - 실패 시 null 반환 (현재 동작과 동일)
5. thumbnail 확보 시 기존 CanvaEmbed 객체 형태로 반환
```

- Connect API 는 학생 OAuth 토큰이 있어야 호출 가능. 토큰 없는 경로에서는 4단계 skip → 기존 null 반환.
- 토큰 획득 경로: caller 가 명시적으로 전달 (CardAttachments 등 렌더 시점엔 토큰 없으므로, 이 fallback 은 **서버 측 /api/cards POST 시점**에만 유효).
- thumbnail.url 은 15분 TTL → PNG 을 Blob 에 업로드하거나, 매 렌더마다 재발급 필요. MVP: 첫 POST 시점에 얻은 thumbnail 을 `linkImage` 에 저장(=15분 만료). 만료 시 CanvaEmbedSlot 의 기존 "라이브 iframe 실패 → 링크 프리뷰" 폴백 경로가 작동.
- **절충**: 완전 해결은 아니지만, 기존 생태계에서 깨진 상태(텍스트 링크만)보다 명백히 나음. 완전 영속 썸네일은 Blob 에 재업로드하는 후속 task 로 분리.

### 실시간 이벤트

없음. DB 쓰기만 하고 기존 WS 브로드캐스트(`board:{id}:cards`) 재사용.

## 3. 컴포넌트 변경

### 신규: CardAuthorFooter (함수 컴포넌트, 메모)

```
props:
  externalAuthorName?: string | null
  studentAuthorName?: string | null  // server 에서 student.name 미리 join 해 props 로
  authorName?: string | null         // teacher.name fallback
  createdAt?: Date
render:
  <div className="card-author-footer">
    <span className="card-author-name">{fallbackChain}</span>
    <time dateTime={iso}>{formatted}</time>
  </div>
```

fallback chain: `externalAuthorName ?? studentAuthorName ?? authorName ?? "알 수 없음"`.

### 수정: CardAttachments

변경 없음 — `canvaDesignId && linkImage` 조건을 이미 만족시키는 방향으로 백엔드 선에서 해결. 푸터는 상위 카드 컴포넌트가 조립.

### 수정: Card 렌더 최상위 컴포넌트 (DraggableCard 또는 등가)

```
<article className="card">
  <CardHeader title content />
  <CardAttachments imageUrl linkUrl linkTitle linkImage linkDesc videoUrl />
  <CardAuthorFooter externalAuthorName studentAuthorName authorName createdAt />
</article>
```

- **파일 위치 확인 필요**: phase7 coder 가 실제 Card 렌더 컴포넌트 경로 확인 후 삽입. CanvaEmbedSlot 는 건드리지 않음.

### 상태 위치

- `canvaDesignId`: 서버(Prisma) → SSR hydration 으로 클라 전달. 클라 상태 변화 없음.
- 작성자 fallback: 순수 derived state, 컴포넌트 내부.
- OAuth 토큰 fallback 경로: 서버 전용.

## 4. 데이터 흐름 다이어그램

### Canva Content Publisher 앱 → Aura 게시

```
[Canva editor] 학생이 "Aura-board로 게시" 클릭
     │
     ▼
[Canva app (별도 프로젝트)] PNG export + Aura /api/external/cards POST
  Body: { boardId, title, imageDataUrl, canvaDesignUrl }
     │
     ▼
[Aura API /api/external/cards]
  1. PAT/OAuth 검증, scope, tier, rate limit, RBAC, 학급 경계 (기존)
  2. Blob upload PNG → blobUrl
  3. extractCanvaDesignId(canvaDesignUrl) → canvaDesignId
  4. DB.card.create({ imageUrl: null, linkUrl: canvaDesignUrl,
                      linkImage: blobUrl, linkTitle: title,
                      canvaDesignId, studentAuthorId, externalAuthorName, ... })
     │
     ▼
[WS broadcast] board:{id}:cards event (기존)
     │
     ▼
[Board UI] CardAttachments 렌더
  - linkUrl(canva.com/design/...) + linkImage(blob PNG) + canvaDesignId
  → canRenderCanvaEmbed = true → CanvaEmbedSlot
  → 썸네일 표시 (linkImage = blob PNG)
  → 사용자 ▶ 클릭 → iframe(buildCanvaEmbedSrc(linkUrl)) 활성화
  → CardAuthorFooter 가 externalAuthorName 렌더
```

### 링크 붙여넣기 (/api/cards) — fallback 개선만

```
[사용자] 보드 편집창에 https://www.canva.com/design/... 붙여넣기
     │
     ▼
[/api/cards POST]
  1. 기존 card insert (linkUrl 저장)
  2. resolveCanvaEmbedUrl(linkUrl)
     ├─ oEmbed(api.canva.com) → 성공 시 linkImage=oEmbed.thumbnail_url
     ├─ oEmbed(www.canva.com) → 성공 시 linkImage=oEmbed.thumbnail_url
     └─ [NEW] getCanvaDesignViaConnect(designId, studentToken?)
              → 성공 시 linkImage=design.thumbnail.url (15분 TTL)
              → 실패 시 linkImage=null → 기존 텍스트 링크 폴백 (변함없음)
     │
     ▼
(이후 흐름 변함없음)
```

## 5. 엣지케이스 (≥5)

1. **oEmbed·Connect 모두 실패**: `linkImage=null` → `canRenderCanvaEmbed=false` → 기존 텍스트 링크 프리뷰. 사용자 경험 현재와 동일 (개선 안 되지만 퇴보도 아님).
2. **Canva 비공개 디자인**: oEmbed 는 403, Connect API 는 토큰의 access 권한 범위 내에서만 성공. 권한 없는 비공개 디자인은 null → §1 케이스로 수렴.
3. **Blob 업로드 실패 (기존)**: 이미 rollback 로직 존재 (`db.card.delete`). canvaDesignId 저장도 rollback 되므로 추가 핸들링 불필요.
4. **canvaDesignUrl 형식 오류**: Zod `string().url()` 에서 422. 서버는 이미지만 업로드하고 linkUrl=null → 일반 이미지 카드로 저장 (graceful degradation).
5. **Connect API rate limit**: Canva 공식 레이트 리밋 초과 시 fallback 실패 → §1 케이스로 수렴. 별도 재시도 안 함 (솔로 프로젝트 단순성).
6. **학생 OAuth 토큰 만료 during fallback**: `/api/cards` 경로에서 학생 세션이 없거나 만료된 경우 Connect API 호출 skip → §1 로 수렴.
7. **태블릿 4 카드 동시 렌더**: CanvaEmbedSlot LRU-3 이 이미 처리 (R6 해소).
8. **같은 디자인 여러 카드**: CanvaEmbedSlot 의 slotId=designId 이므로 LRU 에서 하나만 활성. 기존 동작 유지.
9. **PNG 썸네일 없이 canvaDesignUrl만**: publisher 앱이 imageDataUrl 을 못 받은 상황(현재 앱 흐름에서는 발생하지 않지만 방어). 서버에서 `imageDataUrl` 는 여전히 required — 422 반환.

## 6. DX 영향

- **타입**: Prisma client 자동 생성 → `Card.canvaDesignId` 타입 자동 반영. 수동 타입 추가 없음.
- **린트**: `any` 없이 작성. 기존 패턴 준수.
- **테스트**:
  - `src/lib/__tests__/canva-embed.test.ts` 에 Connect API fallback 경로 unit test (mock fetch) 추가.
  - `/api/external/cards` 통합 테스트 추가: canvaDesignUrl 포함 payload → DB row 에 canvaDesignId + linkUrl + linkImage 채워짐.
- **빌드**: `prisma generate` 1회 실행 필요. `npm run build` 영향 없음.
- **배포**: `prisma migrate deploy` 가 배포 파이프라인에 이미 존재한다면 자동. 아니면 phase10 에서 수동 수행 + 사용자 승인.
- **env**: 신규 변수 없음 (Canva Connect API 는 기존 학생 OAuth 토큰 재사용).

## 7. 롤백 계획

### 코드 롤백
- feature 브랜치 `feat/canva-publish-polish` revert 한 commit 단위로 롤백 가능.
- `git revert <merge-commit>` 후 재배포.

### DB 롤백
- `canvaDesignId` 컬럼은 Nullable — 롤백 없이도 기존 코드 호환.
- 필요 시 migration 하나 추가해 컬럼 drop: `ALTER TABLE Card DROP COLUMN canvaDesignId;` — 데이터 손실 발생하므로 **하이브리드 롤백**(코드는 롤백, 컬럼은 유지) 권장.

### 부분 배포 실패 시
- 코드가 canvaDesignId 참조하는데 DB에 컬럼 없음 → 500. 배포 순서: **migration 먼저 → 코드**.
- 배포 중 오류 감지 시: code rollback → migration 유지.

### 관찰 포인트 (phase10 launch)
- `/api/external/cards` 200 비율
- `resolveCanvaEmbedUrl` 성공/실패 로그 비율 (oEmbed-hit / connect-fallback-hit / all-fail)
- 보드 페이지에서 Canva 카드 썸네일 가시화 비율 (QA 수동)
