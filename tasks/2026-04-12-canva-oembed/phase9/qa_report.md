# QA Report — canva-oembed

**Task**: 2026-04-12-canva-oembed
**Branch**: feat/canva-oembed
**Dev server**: `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev` (restarted per project rule)

## 개요

`phase2/scope_decision.md §3` 의 8개 수용 기준에 대해 가능한 최대 수준까지 검증. 실제 Canva public 디자인 URL 이 필요한 항목은 **수동 체크리스트**로 남겨 배포 후 현장 검증 단계에서 수행.

이 프로젝트에는 e2e 자동화 프레임워크가 없음 (`phase8/code_review.md` §7 재확인). 따라서 자동 회귀 테스트는 `src/lib/__tests__/canva-embed.test.ts` 의 18개 sync 유닛 테스트 + dev server smoke 검증으로 구성.

## 자동 검증 결과

| 항목 | 결과 | 비고 |
|---|---|---|
| `npm run typecheck` | ✅ PASS | tsc --noEmit 성공 |
| `npm run build` | ✅ PASS | 48 라우트 컴파일 성공 |
| `npx tsx src/lib/__tests__/canva-embed.test.ts` | ✅ 18/18 PASS | isCanvaDesignUrl + extractCanvaDesignId |
| Dev server 기동 | ✅ PASS | PID 122134, http 200 on /login |
| CSP 헤더 확인 (`/login`) | ✅ PASS | `Content-Security-Policy: frame-src 'self' https://www.canva.com https://www.youtube.com` |
| CSP 헤더 확인 (`/board/any-id`) | ✅ PASS | 동일 |
| CSP 헤더 확인 (`/`) | ✅ PASS | 동일 (301 → login, 헤더 먼저 적용) |

## 수용 기준별 판정

### §3-1. URL 감지 3가지 형식
- **정적 확인**: `src/lib/canva.ts#isCanvaDesignUrl` + `extractCanvaDesignId` 테스트 (18케이스). `www.canva.com/design/*/view`, `www.canva.com/design/*/edit`, `canva.com/design/*`, `canva.link/*`, 쿼리/해시, 대소문자 모두 통과.
- **서버 정규화**: POST 핸들러가 `canonicalUrl = https://www.canva.com/design/${designId}/view` 로 통일 저장.
- **판정**: ✅ **PASS (static)**. 실브라우저 3가지 URL 붙여넣기는 수동 체크리스트에 포함.

### §3-2. 3초 내 iframe 렌더
- **정적 확인**: `resolveCanvaEmbedUrl` 의 `AbortSignal.timeout(3000)` (두 endpoint 각각), `resolveCanvaDesignId` 의 2초 canva.link HEAD timeout. 최악 조합 2 + 3 = 5초 (두 endpoint 연쇄 실패 시) 가능하나 실서비스 평균 <1초.
- **판정**: ⚠️ **수동 검증 필요** (배포 환경 Seoul region 에서 실 Canva CDN latency 측정).

### §3-3. 원본 30초 내 반영
- Canva iframe 이 자체 refresh. Aura-board 책임 외. iframe loader 가 Canva 서버 측 로직에 의해 resync.
- **판정**: ⚠️ **수동 검증 필요** (Canva 에디터에서 디자인 수정 후 새로고침 없이 30초 대기).

### §3-4. viewer 역할
- **정적 확인**: `CardAttachments` 의 Canva 분기는 role 에 무관하게 렌더 — iframe 자체가 읽기 전용. 편집/삭제 버튼은 기존 `DraggableCard` / `GridBoard` 등의 역할 규칙 그대로 숨김.
- **판정**: ✅ **PASS (static)**. 실제 뷰어 로그인 테스트는 수동.

### §3-5. 비공개 디자인 / iframe 실패 시 폴백
- **정적 확인**: 서버 `resolveCanvaEmbedUrl` null → `linkImage = null` → 클라이언트 gate `canvaDesignId && linkImage` 실패 → `card-link-preview` 렌더. 5라운드 Codex 검수로 서버/클라이언트 모두 bypass 없음 확인.
- **판정**: ✅ **PASS** (정적 경로 완전 검증 — Codex 5차 PASS 에 근거).

### §3-6. CSP 유효 + YouTube 호환
- **자동 검증**: dev server curl 결과 CSP 헤더 확인. `frame-src` allowlist 에 `https://www.youtube.com` 포함.
- **회귀 리스크**: YouTube iframe 카드의 실렌더는 수동 확인 필요 (CSP 가 차단하지 않음을 dev server 에서 실 브라우저로 검증 권장).
- **판정**: ✅ **PASS (headers)**, ⚠️ **YouTube 카드 실렌더 수동 확인** 체크리스트 유지.

### §3-7. 썸네일 우선 (LCP)
- **정적 확인**: `CardAttachments` / `CanvaEmbed` 에서 `<img>` 가 `<iframe>` 앞에 DOM 삽입. `data-loaded` attribute 토글로 opacity 전환. phase5 v1 / phase6 score 9/10.
- **판정**: ✅ **PASS (static)**. 실측은 배포 후 Lighthouse 참고.

### §3-8. 회귀 방지 (YouTube / 일반 링크 / 이미지 카드)
- **자동 검증**: typecheck + build PASS. 기존 `.card-attach-image`, `.card-attach-video` 분기, `.card-link-preview` 분기 코드 불변 (git diff 확인).
- **판정**: ✅ **PASS (static)**. 실 렌더 회귀 여부는 수동 체크리스트.

## 수동 검증 체크리스트 (배포 후 수행)

사용자/QA가 공개 Canva 디자인 URL 보유 후 수행:

- [ ] 공개 Canva 디자인 URL 을 보드에 추가 → 카드에 iframe 임베드 표시 (3초 내)
- [ ] 단축 URL `canva.link/xxx` 도 동일하게 iframe
- [ ] Canva 에디터에서 디자인 수정 → 카드 새로고침 없이 30초 내 반영
- [ ] 비공개 Canva 링크 → card-link-preview 로 폴백 (iframe 표시 안 됨)
- [ ] 학교망/방화벽 환경에서 canva.com 차단 시나리오 → 썸네일/링크로 degrade
- [ ] 기존 YouTube URL 카드 추가 → iframe 정상 (CSP 회귀 없음)
- [ ] 기존 일반 링크 (`github.com/x/y` 등) → 기존 link-preview 그대로
- [ ] NextAuth Google OAuth 로그인 → CSP 충돌 없이 정상 콜백
- [ ] 카드 드래그/리사이즈 → oEmbed 호출 없이 빠른 PATCH (Network 탭 모니터)
- [ ] viewer 역할로 Canva 카드 열람 → iframe 보이지만 편집 버튼 숨김

## Risk / Residual

- **iframe 실패 감지 unreliability**: phase8 `/review` MEDIUM #2 — 학교망 완전 차단 시 iframe onError 가 브라우저별로 일관성 없이 발화. 현재는 linkImage 존재 여부로 거의 커버되지만, 완전 차단 감지는 timer watchdog 이 필요 (별도 follow-up task 로 분리 권장).
- **Canva oEmbed 엔드포인트 drift**: 현재 신규 `api.canva.com/_spi/...` + 레거시 `www.canva.com/_oembed` fallback 지원. 양쪽 모두 deprecated 되면 `?embed&meta` iframe URL 자체는 유지되지만 메타(linkTitle/linkImage/linkDesc) 수급 경로가 없어져 gate 실패 → link-preview 폴백.

## 판정

**자동 검증 기준**: ✅ **PASS**. 본 phase 산출물 (qa_report.md + 수동 체크리스트) + 18 unit tests + dev server CSP 검증으로 phase9 gate 통과.

실 Canva 사용 환경의 end-to-end 검증은 배포 후 phase10 직후 수동 smoke test 로 보완 권장 (이 프로젝트 e2e 자동화 부재 컨벤션 유지).
