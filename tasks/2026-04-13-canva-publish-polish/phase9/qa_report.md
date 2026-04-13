# QA Report — canva-publish-polish

검수: orchestrator (code-level QA, /qa /browse /benchmark gstack 미설치)
상태: **PARTIAL PASS** — 코드/빌드/단위 검증 통과. 브라우저 e2e 사용자 수동 검증 필요.
일자: 2026-04-13

## 0. 자동 검증 결과

| 검증 | 결과 | 명령 |
|---|---|---|
| TypeScript typecheck | ✅ clean (no errors) | `npx tsc --noEmit` |
| 단위 테스트 (card-author) | ✅ 13/13 PASS | `npx tsx src/lib/__tests__/card-author.test.ts` |
| 단위 테스트 (canva-embed 회귀) | ✅ 18/18 PASS | `npx tsx src/lib/__tests__/canva-embed.test.ts` |
| Next.js production build | ✅ 성공 (전체 라우트 컴파일) | `npm run build` |

## 1. AC 검증 매트릭스

| AC | 코드 검증 | 브라우저 e2e | 결정 |
|---|---|---|---|
| AC1 작성자 푸터 모든 카드 | ✅ 6 렌더러 모두 `<CardBody/>` 경유, CardAuthorFooter 내부 fallback chain 13 케이스 PASS | ⚠️ **사용자 검증 필요** — 6 layout (freeform/grid/stream/columns/breakout/section) 보드에서 실제 푸터 가시화 + 이름 정확도 | PARTIAL |
| AC2 Option B 게시 성공 | ✅ Zod 스키마 + INSERT 분기 + S1 보안 fix(canva.com 강제) | ⚠️ **사용자 검증 필요** — Canva Content Publisher 앱이 `canvaDesignUrl` 필드 추가 후 실제 200 응답 + DB row 확인 | BLOCKED (외부 의존: Canva 앱 업데이트) |
| AC3 CanvaEmbedSlot 활성화 | ✅ `linkUrl + linkImage + canvaDesignId 존재 시 자동 활성화` 코드 경로 변경 없음, 입력 조건만 충족 | ⚠️ **사용자 검증 필요** — 게시 후 보드에서 썸네일 + 클릭 시 라이브 iframe 동작 | BLOCKED (외부 의존) |
| AC4 oEmbed 실패 fallback | — | — | **DEFERRED** (phase7 명시) |
| AC8 학급 경계 | ✅ 기존 검증 로직 변경 없음 (regression 없음) | ⚠️ 회귀 확인 권장 — 타 학급 보드 게시 시도 → 403 | PARTIAL |

## 2. 브라우저 e2e 가로막은 요인

1. **DB migration 미적용** — `prisma/migrations/20260413_add_card_canva_design_id/migration.sql` 작성됐으나 `prisma migrate deploy` 미실행. dev 서버에서 보드 페이지 로드 시 Card.canvaDesignId 컬럼 부재로 쿼리 실패할 가능성.
2. **Canva Content Publisher 앱 (별도 프로젝트 `aura-canva-app`) 미업데이트** — 본 task 의 `/api/external/cards` 가 `canvaDesignUrl` optional 로 받지만, 실제 카드를 Option B 모드로 만들려면 Canva 앱이 이 필드를 전송하도록 수정 필요.
3. **gstack `/qa` `/browse` `/benchmark` 미설치** — 자동화된 헤디드 Chromium 테스트 불가. chrome-devtools MCP 로 가능하나 dev 서버 + DB 마이그레이션 선행.

## 3. 사용자 수동 QA 체크리스트

phase10 배포 전 다음을 사용자가 직접 확인:

### 3.1 작성자 푸터 회귀
- [ ] freeform 보드 (DraggableCard) — 기존 카드에 푸터 1줄 표시, chip + 시간
- [ ] grid 보드 — 동일
- [ ] stream 보드 — 푸터가 stream-card-meta(번호/날짜) 와 충돌 없는지
- [ ] columns 보드 (h4) — chip 정렬 정상
- [ ] breakout 보드 (h4, 두 위치 풀섹션 + 모둠섹션) — 동일
- [ ] section breakout 페이지 — 동일
- [ ] 작성자 fallback — externalAuthorName 우선, 없으면 student.name, 없으면 author.name

### 3.2 작성자 푸터 시각/접근성
- [ ] 긴 이름 (한글 10자 초과) → ellipsis(…)
- [ ] 시간 hover 시 절대 시간 툴팁
- [ ] 키보드 Tab → chip/푸터 focus 안 받음
- [ ] 카드 클릭 시 푸터 영역이 카드 클릭 막지 않음 (pointer-events: none)
- [ ] 스크린리더 (NVDA 또는 macOS VoiceOver): "작성자: 공서희, 3분 전" 순으로 읽힘

### 3.3 Canva 게시 흐름 (Canva 앱 업데이트 후)
- [ ] Canva 에디터에서 "Aura-board 로 게시" → 200 OK
- [ ] 보드 카드에 Canva 썸네일 표시 (썸네일 모드)
- [ ] 카드 ▶ 클릭 → 라이브 iframe 활성화
- [ ] LRU 4번째 카드 활성화 시 가장 오래된 카드 썸네일로 회귀 ("썸네일로 돌아감" toast)
- [ ] DB Card row 의 `canvaDesignId` / `linkUrl` / `linkImage` / `imageUrl=null` 확인

### 3.4 보안 회귀 (S1 fix)
- [ ] PAT 으로 `canvaDesignUrl: "https://evil.com"` POST → 422 + "must be a canva.com design URL"
- [ ] PAT 으로 `canvaDesignUrl: "https://canva.com/foo"` (디자인 페이지 아님) → 422
- [ ] PAT 으로 `canvaDesignUrl` 생략 → 200 (기존 PNG-only 흐름)
- [ ] 타 학급 보드에 게시 시도 → 403

### 3.5 태블릿 성능 (Galaxy Tab S6 Lite 권장 baseline)
- [ ] 카드 4개 동시 표시 + 그 중 3 개 라이브 활성화 → CanvaEmbedSlot LRU-3 동작 확인
- [ ] 보드 페이지 LCP < 3초 권장 (수동 측정)

## 4. 회귀 테스트 미생성 사유

`phase9/regression_tests/` 디렉토리는 비워둠. 이유:
1. 푸터 표시 회귀 = 6 layout 모두 시각적 — Playwright 같은 e2e harness 미설치
2. 단위 회귀는 이미 `src/lib/__tests__/card-author.test.ts` 로 커버
3. 보안 fix(S1) 회귀는 `/api/external/cards` integration test 가 필요한데 token mocking 등 인프라 미존재 — 후속 task 권장

## 5. 성능 baseline 미측정 사유

`/benchmark` 미설치 + dev 서버 미구동 → `phase9/perf_baseline.json` 미생성. AC7 (태블릿 성능) 은 본 task 의 deferred AC 라 게이트 영향 없음.

## 6. 판정

- 코드 레벨: ✅ 통과 (typecheck, units, build)
- 브라우저 e2e: ⚠️ 사용자 수동 QA 필요
- AC1/AC8: PARTIAL (코드 통과 + 사용자 시각 확인 필요)
- AC2/AC3: BLOCKED (Canva 앱 업데이트 + DB migration 적용 후 검증 가능)

**`QA_OK.marker` 미생성** — phase9 contract 가 "단위 테스트만으로 통과 판정" 금지. 사용자 수동 QA 통과 후 수동으로 marker touch 또는 본 phase 재실행 권장.

phase10 배포 검증 게이트 = `QA_OK.marker` 부재 → **자동 진행 차단**. 사용자 결정 필요.
