# Scope Decision — canva-oembed

## 1. 선택한 UX 패턴

phase1 `ux_patterns.json` 의 6개 중 **전부 채택** (상호 보완적 — 서로 배타가 아닌 계층 구조):

1. `oembed-paste-detect` (기본 흐름)
2. `thumbnail-first-iframe-swap` (렌더 전략)
3. `responsive-aspect-wrapper` (CSS 레이아웃)
4. `graceful-degradation-to-link-card` (실패 폴백)
5. `csp-frame-src-allowlist` (보안)
6. `oembed-response-cache` (성능)

**선정 사유**:
- `research_pack §3-1` Notion 이 동일 조합으로 "설정 0" UX 달성 — Aura-board 목표와 일치
- `research_pack §2-5` CSP 요구사항은 iframe 렌더의 필수 조건
- `research_pack §6` 의 리스크 목록에서 graceful degradation 없이는 교실망 차단/비공개 디자인 시나리오가 UX 파탄을 유발

## 2. MVP 범위

### IN (이번 task 필수)

- [ ] `src/lib/canva.ts` 에 `resolveCanvaEmbedUrl(url)` 신규 함수
  - Canva 디자인 URL 정규화 (`canva.com/design/*`, `canva.link/*`, 쿼리/해시 제거)
  - `https://www.canva.com/_oembed?url=...` 호출
  - 응답 파싱 → `{ type, html, iframeSrc, thumbnailUrl, title, authorName, width, height }` 반환
  - 실패 시 `null` 반환 (호출부가 폴백 결정)
- [ ] `src/components/CardAttachments.tsx` 에 Canva 분기 추가
  - `linkUrl` 이 Canva 패턴이면 썸네일 먼저 렌더 + onLoad 시 iframe 스왑
  - `iframe src` = `https://www.canva.com/design/{id}/view?embed&meta`
  - `sandbox="allow-scripts allow-same-origin allow-popups"` 적용
  - 16:9 반응형 wrapper
- [ ] `src/app/api/cards/route.ts` (POST) + `src/app/api/cards/[id]/route.ts` (PATCH) 에서
  - `linkUrl` 이 Canva 패턴이면 `resolveCanvaEmbedUrl` 호출
  - 성공 시 `linkTitle`, `linkImage` (= thumbnailUrl), `linkDesc` (= authorName) 자동 채우기
  - 실패 시 기존 `link-preview` 로 폴백
- [ ] `next.config.ts` 에 CSP 헤더 추가 — `frame-src 'self' https://www.canva.com https://www.youtube.com`
- [ ] 스타일: `src/styles/card.css` (또는 적절한 곳) 에 `.card-canva-embed` 반응형 래퍼 규칙

### OUT (이번 task 제외)

| 제외 | 사유 | 후속 |
|---|---|---|
| `Card.kind` 필드 추가 | 스키마 마이그레이션 동반 — 지금 `linkUrl` 문자열 패턴 매칭만으로 충분 | 다른 플랫폼(Google/Notion/Figma) 확장 시 별도 task에서 추가 |
| Webhook 기반 자동 refresh | roadmap P2-⑤ 별도 항목 | `canva-webhook-refresh` task |
| 비공개 디자인 인증 | OAuth 경로가 이미 있으나 UX/설계 추가 작업 필요 | 별도 task |
| Content Publisher Intent | roadmap P0-② 별도 항목 | `canva-content-publisher` task |
| "새로고침" 액션 버튼 | 웹훅 도입 후 재평가 | P2-⑤ 이후 |
| 다른 플랫폼 범용 oEmbed | `tasks/2026-04-12-embed-research/findings.md` 에 보관 | Canva 출하 후 `generic-oembed` task |

### 스킵 게이트 적용

- `change_type = "new_feature"` — 스킵 규칙 해당 없음 (모든 phase 실행)
- 디자인 phase (4-6) 는 기존 `padlet-card` / `card-link-preview` 템플릿 재사용이 기본값이라 변형은 최소 — shotgun 2-3개로 단축 가능 (phase5 단계에서 결정)

## 3. 수용 기준 (Acceptance Criteria)

검증 가능 체크리스트 8 개:

1. **URL 감지** — `https://www.canva.com/design/DAF.../view`, `canva.com/design/DAF...`, `canva.link/...` 3가지 형식이 모두 Canva 임베드로 렌더된다.
2. **라이브 iframe 렌더** — Canva URL 입력 후 카드에서 **3초 내** iframe 이 표시된다 (브라우저 DevTools Network 기준).
3. **원본 동기화** — Canva 에디터에서 디자인 수정 후 브라우저 새로고침 없이 30초 내 iframe 이 최신 내용 반영 (iframe 자체 갱신 메커니즘).
4. **역할 권한** — `viewer` 롤 유저도 iframe 을 볼 수 있다. 단, 카드 편집/삭제 버튼은 역할 규칙 그대로 숨겨진다.
5. **실패 폴백** — 비공개 Canva 디자인 또는 iframe 로드 실패 시, 기존 OG 링크 프리뷰 (`card-link-preview`) 가 대신 표시된다 (에러 덤프 대신 graceful degradation).
6. **CSP 유효** — 배포된 페이지에 `Content-Security-Policy: frame-src ... https://www.canva.com` 이 포함되어 있고, YouTube 임베드 기존 동작도 깨지지 않는다.
7. **썸네일 우선** — iframe 이 완전히 로드되기 전에 `linkImage` (oEmbed thumbnail_url) 이 먼저 표시되어 LCP 를 선점한다.
8. **회귀 방지** — 기존 YouTube / 일반 링크 / 이미지 카드 렌더가 모두 이전과 동일 동작 (수동 검증 + typecheck + build PASS).

## 4. 스코프 결정 모드

**Selective Expansion** — roadmap P0-① 자체 수용 기준은 전부 포함 (4개 체크박스), 거기에 회귀/폴백/보안 관점 기준 4개를 오케스트레이터가 추가. 새 모델 필드나 별도 route 는 보류 (후속 task 로 분리).

## 5. 위험 요소

| 리스크 | 영향 | 완화책 |
|---|---|---|
| Canva oEmbed 엔드포인트 변경/장애 | P0-① 핵심 경로 | `resolveCanvaEmbedUrl` 실패 시 graceful degradation + 응답 DB 캐시로 재조회 최소화 |
| 비공개 디자인에서 iframe 이 로그인 프롬프트 표시 | UX 혼란 | iframe `onError` 감지 → 링크 프리뷰 카드로 교체, 카드에 "비공개 디자인" 배지 (후속 task) |
| 학교망/기관망에서 `canva.com` 차단 | iframe 완전 실패 | 썸네일-first 전략으로 썸네일만이라도 표시, 클릭 시 새 창 |
| CSP 헤더가 다른 iframe/스크립트 차단 | 부수 회귀 | `frame-src` 추가만 수행 (`script-src` 등 건드리지 않음). phase9 QA 에서 YouTube iframe, next-auth 콜백, 이미지 호스트 모두 점검 |
| Canva 응답 썸네일이 hotlink 차단 / CDN 토큰 만료 | `linkImage` 깨짐 | `linkImage` 는 보조 — iframe 렌더되면 썸네일 숨김. 실패 시 대체 이미지 없이 iframe 유지 |
| oEmbed 응답에 포함된 HTML 을 그대로 삽입 시 XSS | 보안 | `html` 필드 무시하고 iframe src 만 추출해서 직접 JSX 로 렌더 (no `dangerouslySetInnerHTML`) |
| Canva for Education 비공개 디자인의 공유 모드에 따른 동작 차이 | 교실 실사용 | phase9 QA 에서 Canva Edu 계정으로 실제 테스트 |
