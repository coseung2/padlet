# Handoff Note — Canva Publisher 수신 엔드포인트 & PAT

> task_id: `2026-04-12-canva-publisher-receiver`
> seed: `seed_26af361e92b7` (ambiguity 0.121)
> 작성: 2026-04-12 · handoff-writer
> 수신 파이프라인: **padlet `feature` (Phase 0 analyst 진입)**

---

## 배경

aura-canva-app(Canva Content Publisher intent)의 클라이언트 계약 — `{boardId, title, imageDataUrl, sectionId?}` 요청 + `200 {id, url}` 응답 — 은 이미 고정되어 있다. 그러나 **수신측(Aura-board = padlet Next.js App Router)** 에 PAT 인증·Tier 게이팅·3축 rate limit·Vercel Blob 스트리밍·교사 관리 UI가 부재해 실제 게시가 불가능한 상태다.

본 작업은 **신규 테이블 없이** 기존 `ExternalAccessToken` 엔티티를 확장해 `/api/external/cards` 수신 엔드포인트, `/api/tokens` CRUD, `/(teacher)/settings/external-tokens` 교사 UI를 구현한다. v1 scope는 `cards:write` 단일, Pro tier 전용(Free → 402).

---

## 참조 문서 필수 독해 순서

1. **`canva project/plans/seeds-index.md`** — Seed 8 항목 + Seed 2(Tier 승계) / Seed 5(P0-② 교사앱 한정) 인접성 파악
2. **`canva project/plans/canva-publisher-receiver-roadmap.md`** — 본 작업의 SSOT. §1 설계 전제(D1~D16) · §2 파일 맵 · §4 CR-1~CR-10 · §5 수용기준 15건
3. **`canva project/plans/tablet-performance-roadmap.md`** §2 성능 예산 — 갤럭시 탭 S6 Lite 교사 UI 터치 타겟·TTI·p95 기준
4. **`canva project/plans/implementation-roadmap.md`** #p0-②-content-publisher-intent 크로스 참조 — Canva 앱(`content-publisher-app/`) SSOT vs 수신측(Seed 8) SSOT 범위 분할
5. **`canva project/tasks/2026-04-12-canva-publisher-receiver/phase3/decisions.md`** — D1~D16 결정 근거 원본
6. **`canva project/tasks/2026-04-12-canva-publisher-receiver/phase4/seed.yaml`** — acceptance_criteria 15건, ontology, evaluation_principles, exit_conditions
7. (선택) `canva project/plans/phase0-requests.md` "Canva Publisher 수신" 섹션 — CR-1~CR-10 작업 카드 블록

---

## 기준 단말·제약

- **단말**: 갤럭시 탭 S6 Lite (1200×800, 포트레이트/가로 모두) — 교사 UI 터치 타겟 ≥ 44px, PAT 생성 < 10초
- **런타임**: Next.js App Router + Node.js runtime 전용 (Edge 미지원)
- **저장소**: Vercel Blob (스트리밍 `put({ multipart: true })`, S3는 Enterprise v2+ 파킹)
- **본문 한도**: 4.0MB 하드 가드 (Vercel 4.5MB 천장 대비 여유) → 413 early
- **p95 업로드 < 2000ms** (3MB PNG 기준, 스트리밍 / 전체 버퍼 금지)
- **PAT 포맷**: `aurapat_{8char_base62_id}_{40char_secret}`, hash = `SHA-256(secret ‖ PEPPER)`
- **토큰 1회 노출**: 발급 직후 모달만. DB 재조회 불가. 분실 시 재발급만.
- **Zod strict**: 알 수 없는 필드 → 422 `invalid_data_url`
- **Rate Limit 3축**: per-token 60/min, per-teacher 300/hour, per-IP 300/min (Upstash Redis sliding window, OR 판정)
- **Tier 게이트**: Free 계정의 `cards:write` 호출 → **402 Payment Required + 업그레이드 링크** (이중 방어 — 발급+수신)
- **GPL 격리**: padlet 리포(MIT) 내에서 GPL 의존 금지. Upstash·Vercel Blob·zod·prisma는 기존 허용 목록.
- **레거시 마이그**: 3-stage (`tokenPrefix` nullable → legacy revoke+이메일 공지 → NOT NULL), Stage 2·3 사이 최소 7일 유예

---

## 이번 작업 (seed.goal)

> POST /api/external/cards 수신 엔드포인트와 PAT 시스템을 Aura-board에 구현해, 교사가 Canva Content Publisher로 보낸 디자인을 Pro tier 게이트·rate limit·스트리밍 업로드를 거쳐 보드 카드로 생성한다. PAT는 `aurapat_{prefix}_{secret}` 포맷, SHA-256+PEPPER 해시 저장, 1회 노출, prefix 기반 O(1) 조회.

padlet `feature` 파이프라인이 본 request.json을 phase0 analyst 입력으로 소비한다. CR-1~CR-10 10개 작업 카드는 `canva project/plans/phase0-requests.md`에 별도 등재되어 있으며, 본 핸드오프는 **수용 기준 전건 달성**을 한 트랙으로 묶는 상위 컨텍스트다.

---

## 수용 기준 체크리스트 (seed.acceptance_criteria 15건 1:1 매핑)

- [ ] **AC-01** POST /api/external/cards 가 Zod **strict** 스키마로 body 검증: `boardId: cuid`, `title: string(1–200)`, `imageDataUrl: data:image/png;base64,…`, `sectionId?: cuid | null`
- [ ] **AC-02** 성공 시 200 OK `{ id: Card.cuid, url: "https://aura-board-app.vercel.app/board/<slug>#c/<cardId>" }` (201 아님, 기존 계약 유지)
- [ ] **AC-03** 모든 에러 응답 포맷 `{ error: { code, message } }` 통일 (12종 에러 코드, roadmap §1.7)
- [ ] **AC-04** PAT 인증: `tokenPrefix`(8-char base62) DB lookup → `SHA-256(secret ‖ PEPPER)` 검증, timing-safe (prefix miss 시 더미 hash 비교)
- [ ] **AC-05** `boardId`를 `token.scopeBoardIds` allowlist 검증, 빈 배열 = 교사 소유 전체 보드 허용
- [ ] **AC-06** 이미지 Vercel Blob 스트리밍 업로드(`put({ multipart: true })`, 전체 버퍼 금지), p95 < 2000ms (3MB PNG)
- [ ] **AC-07** Rate limit 초과 시 429 + `Retry-After: <seconds>` 헤더 (3축 OR 판정)
- [ ] **AC-08** Free-tier 계정 토큰이 `cards:write` 호출 → **402 Payment Required + upgrade link** (발급 시점 + 수신 시점 이중 재검증)
- [ ] **AC-09** `Content-Length` > 4.0MB → **body 파싱 이전** 413 `payload_too_large`
- [ ] **AC-10** 토큰 발급 UI `/(teacher)/settings/external-tokens` — 갤럭시 탭 S6 Lite 최적화 (터치 타겟 ≥ 44px, 포트레이트/가로 대응)
- [ ] **AC-11** 토큰 공개 모달 — **1회만** 표시, **Copy 버튼** + **Download(.txt) 버튼**, 닫으면 재조회 불가
- [ ] **AC-12** 유효기간 드롭다운 — 1일 / 30일 / **90일(기본)** / 365일 / 무기한 + "권장: 90일 회전" 주석
- [ ] **AC-13** 레거시 토큰 **3-stage 마이그** — Stage 1 `tokenPrefix` nullable 추가 / Stage 2 전체 `revokedAt=now()` + Resend 재발급 공지 / Stage 3 NOT NULL 전환 (7일 유예)
- [ ] **AC-14** Card 기본값: `width=240`, `height=160`, `content=""`, `authorId=token.teacherId`, `sectionId=body.sectionId ?? null`, `imageUrl=blobUrl`(내부, 응답 비공개), `kind="image"`
- [ ] **AC-15** 알 수 없는 request 필드 → 422 `invalid_data_url` (Zod `.strict()` 활용)

---

## 주의사항

### 파이프라인 준수
- **padlet `feature` 파이프라인을 그대로 통과**시킬 것. phase0 analyst가 본 request.json을 받아 phase1~phase9까지 표준 순서로 진행. 임의 단계 스킵 금지.
- 본 task는 phase6까지 완료 상태. **seed.yaml / plans / sketch / decisions는 수정 금지** (phase4·5 고정).
- handoff-writer는 padlet 폴더에 쓰기 권한 없음. 본 request.json은 **canva project 내 phase6/** 에만 생성.

### 설계 경계 — 반드시 지킬 것
- **신규 엔티티 금지**. `ExternalAccessToken` 엔티티에 필드(`tokenPrefix`·`label`·`lastUsedAt`·`scopeBoardIds`) **추가**만 허용. `tokenHash`는 기존 컬럼 재정의(평문 → SHA-256+PEPPER) 가능.
- **레거시 row 처리**: SHA-256 단방향이라 `tokenPrefix` 역산 불가 → 레거시는 일괄 `revokedAt=now()` + 교사 이메일 공지(Resend). Stage 2·3 사이 **최소 7일 유예** 엄수.
- **Tier 게이팅**: `cards:write` scope는 **Pro 전용**. Free 계정은 UI에서 잠금 배지 + 수신 단계에서 `user.tier !== "pro"` 이중 체크 (R7 강등 우회 차단).
- **Upstash 무료 플랜**으로 3축 rate limit 수용 가능(60 + 300/hour + 300/min 샘플 기준 일일 request 범위 내). 장애 시 **fail-open** 기본, `RL_FAIL_MODE=close` 환경변수로 역전 허용.

### 보안
- PAT 평문 DB 저장 **절대 금지**. 평문은 1회 모달에서만, 그 직후 메모리에서도 지워야 함.
- prefix 미존재 시에도 **더미 hash와 `timingSafeEqual`** 수행 (timing side-channel R5).
- 토큰 공개 모달은 **ephemeral state**만 보유 — 페이지 새로고침·닫기 후 재조회 불가 확인 E2E.
- `aurapat_` 접두는 **GitHub secret scanner 호환 정규식** `^aurapat_[0-9a-zA-Z]{8}_[0-9a-zA-Z]{40}$` 준수.

### 크로스 참조
- **P0-② 역할 분할**: `implementation-roadmap.md` P0-②는 **Canva 앱(`content-publisher-app/`)** 측의 SSOT, 본 Seed 8은 **padlet 수신** 측 SSOT. 두 리포 동시 진행. 계약은 `aura-canva-app/src/intents/content_publisher/index.tsx` 읽기 전용으로 고정.
- **학부모 열람 범위**: Publisher 출처 카드는 별도 구분 없이 일반 `Card`로 편입 — Seed 7(`parent-viewer-roadmap.md`) PV-7 `Section → Card` 서버 필터로 자연 처리. **별도 구현 작업 없음**.

### 파킹 (v2+ 이관, 본 task 범위 외)
CRC32 checksum (`aurapatc_`), sectionId UI 드롭다운, aura-canva-app 프리-리사이즈, Canva Apps deeplink 스펙, Blob 정리 Cron, Webhook `scopes: webhooks:receive` 확장, `metadata JSON` 일반화, S3 Enterprise 마이그, 학교 일괄결제, 토큰 회전 알림(90일 만료 7일 전) — roadmap §9 참조.

### 금지
- 임의 API 스키마 변경 (요청/응답 계약은 `aura-canva-app` intent와 양방향 고정)
- 201 Created 응답 사용 (기존 계약 200 OK)
- `imageUrl`·내부 필드·전체 card 객체 응답 포함 (응답은 `{id, url}` only)
- scope 문자열 확장 (v1은 `cards:write` 단일, `scopes String[]` 컬럼만 v2 대비 유지)
- 토큰 secret 평문 로그·알림·재조회 API 제공

---

## Exit Conditions (seed 발췌)

1. **endpoint_functional** — POST /api/external/cards 가 live, 유효 Pro 토큰 요청에 200 `{id,url}` 반환 (auth + rate-limit + tier + blob + card INSERT + 응답 스키마 전부 통합 테스트 통과)
2. **migration_complete** — 전체 `ExternalAccessToken` row `tokenPrefix` non-null, Stage 3 NOT NULL 적용 완료, 레거시 revoke + 재발급 공지 증거 존재
3. **security_verified** — 평문 토큰 DB 0건, SHA-256 컬럼만 존재, 1회 모달 재표시 불가 E2E 통과, revoke 즉시 적용 확인

---

## 다음 단계

padlet feature 파이프라인 phase0 analyst에 `padlet_phase0_request.json`을 제출하고, 본 `handoff_note.md` 를 에이전트 세션 프롬프트에 첨부. CR-1~CR-10 작업 카드는 `phase0-requests.md` 에서 개별 pull해 병렬/직렬 분배 가능 (의존 관계: CR-1 → CR-2 → CR-3 → CR-4/CR-5 → CR-6 → CR-7 → CR-8 → CR-9 → CR-10).
