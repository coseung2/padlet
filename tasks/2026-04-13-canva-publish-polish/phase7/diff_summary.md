# Diff Summary — canva-publish-polish phase7

## 1. 데이터 모델 (1 컬럼)
- `prisma/schema.prisma` — `model Card` 에 `canvaDesignId String?` Nullable 추가 (backward compatible)
- `prisma/migrations/20260413_add_card_canva_design_id/migration.sql` — 단일 ALTER TABLE
- **DB migration 미적용** — phase10 deployer 에서 `prisma migrate deploy` 로 적용 (사용자 승인 후)

## 2. 신규 컴포넌트 (D 안 — CardBody 추출)
- `src/components/cards/CardAuthorFooter.tsx` — chip + relative time + sr-only label
- `src/components/cards/CardBody.tsx` — 카드 본문 합성(`CardAttachments` + 제목 + 본문 + `CardAuthorFooter`). `titleAs="h3"|"h4"` prop 으로 의미론 레벨 보존
- `src/lib/card-author.ts` — `pickAuthorName`, `formatRelativeKo` pure helpers (테스트 경계)
- `src/styles/card.css` — `.card-author-footer` / `.card-author-chip` / `.sr-only` 추가, `--color-accent-tinted-bg/text` + `--radius-pill` 재사용

## 3. 6 렌더러 CardBody 마이그레이션 (D 핵심)
| 파일 | 변경 |
|---|---|
| `DraggableCard.tsx` | import 변경 + 2 사용처 → `<CardBody card={card}/>` + `CardData` 타입에 author 필드 추가 |
| `StreamBoard.tsx` | import + 1 사용처 (h3) |
| `ColumnsBoard.tsx` | import + 1 사용처 (h4) |
| `GridBoard.tsx` | import + 1 사용처 (h3) |
| `BreakoutBoard.tsx` | import + 2 사용처 (h4) |
| `SectionBreakoutView.tsx` | import + 1 사용처 (h4) + `CardLike` 타입 확장 |

순 효과: 18줄(`<CardAttachments .../>` 4-line + h3/h4 + p) × 8 사용처 → 8 줄 1-line `<CardBody/>`. 약 -100줄, +75줄(CardBody/AuthorFooter/helpers/CSS) = 순 -25줄.

## 4. 보드 페이지 author join 추가
- `src/app/board/[id]/page.tsx`
  - `cardsPromise` `include: { author: select name, studentAuthor: select name }`
  - `cardProps` 에 `externalAuthorName`, `studentAuthorName`, `authorName` 추가
- `src/app/board/[id]/s/[sectionId]/page.tsx`
  - 동일 include + map 확장 + `createdAt.toISOString()`
- `src/app/board/[id]/archive/page.tsx` — **변경 없음** (cards.findMany 결과를 카운트/날짜 집계용으로만 사용, 카드 렌더 안 함)

## 5. `/api/external/cards` Option B 분기
- Zod body schema: `canvaDesignUrl?: z.string().url().max(500)` 추가
- INSERT 시 `extractCanvaDesignId(canvaDesignUrl)` 호출 → `canvaDesignId` 저장
- `canvaDesignUrl` 동봉 시 `linkUrl`/`linkTitle` 동시 저장 (CardAttachments 의 `canRenderCanvaEmbed` 게이트 충족 준비)
- Blob 업로드 후 `canvaDesignUrl` 있으면 `linkImage` 에, 없으면 기존대로 `imageUrl` 에 저장 → CanvaEmbedSlot 자동 활성화
- 기존 PNG-only 카드 흐름은 변함없음 (backward compat)

## 6. AC 충족 상태

| AC | 상태 | 비고 |
|---|---|---|
| AC1 작성자 푸터 | ✅ | 6 렌더러 모두 CardBody 경유로 자동 |
| AC2 Option B 게시 성공 | ✅ | canvaDesignUrl 동봉 시 canvaDesignId+linkUrl+linkImage 저장 |
| AC3 iframe 라이브 렌더 | ✅ | 기존 CanvaEmbedSlot 경로 재사용 (조건 자동 충족) |
| AC4 oEmbed 실패 fallback | ⚠️ DEFERRED | Connect API fallback 은 OAuth 토큰 plumbing 필요 → 별도 task. 본 task 에선 미구현 |
| AC8 학급 경계 | ✅ | 기존 검증 로직 변경 없음 |

## 7. Karpathy 준수

- §1 Think-before: A vs D 분기에서 사용자 결정 후 진행. AC4 범위 초과 발견 → 멈춤 후 deferred 처리
- §2 Simplicity: 신규 추상은 CardBody 1개 (카드 본문 6× 중복 해소). Connect API 미구현 (투기 회피)
- §3 Surgical: 각 변경이 직접 추적 가능. 인접 코드 (CanvaEmbedSlot, CardAttachments 내부) 미수정
- §4 Goal-driven: 4 AC 검증 가능, 미충족 1개 명시 deferred

## 8. 외부 의존성 (사용자 액션)

- **Canva Content Publisher 앱** (별도 프로젝트 `aura-canva-app`) — POST `/api/external/cards` 시 `canvaDesignUrl` 필드 추가 전송 필요. 본 변경 없이도 기존 호출은 200 OK (canvaDesignUrl optional).
- **DB migration 적용** — `prisma migrate deploy` 실행 필요 (phase10 사용자 승인 후).

## 9. 커밋 계획

- C1 (data + lib): schema migration + card-author lib + tests
- C2 (components): CardAuthorFooter + CardBody + CSS
- C3 (renderers): 6 file migration to CardBody
- C4 (api + page): /api/external/cards canvaDesignUrl + 2 board pages cardProps
