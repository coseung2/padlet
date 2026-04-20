# Scope Decision — vibe-coding-arcade

> **입력 승계**: `phase0/request.json` + `INBOX/2026-04-20-vibe-coding-arcade/{seed.yaml, decisions.md, handoff_note.md}`.
> phase1은 스킵(SKIP_PHASE1.md 참조) — ideation 측 벤치마크·UX·보안 탐색 재활용.

---

## 1. 선택한 UX 패턴

### 1.1 카탈로그 — itch.io "Top Rated" 그리드 복제

- **출처**: itch.io 학급·커뮤니티 게임 배포, Steam 스토어 그리드
- **패턴**: 썸네일(160×120 WebP) + 제목 + 작성자 + 별점 평균 + 플레이수 카드 그리드
- **정렬 탭 5종**: `신작` · `인기`(playCount 내림) · `친구 추천`(같은 반 별점 5점) · `🎯 평가 미작성`(리뷰 독려) · 태그 필터
- **채택 사유**: 초등 고학년~중등에게 익숙. 카탈로그 iframe 0 유지(탭 S6 Lite 성능 예산 §2a·§2b).

### 1.2 플레이 — 전체화면 모달 + cross-origin 샌드박스 iframe

- **출처**: Claude Artifacts 플레이 패턴, itch.io web-play 플레이어
- **패턴**: 카드 탭 → 전체화면 모달 → `https://sandbox.aura-board.app/vibe/{projectId}?pt=<playToken>` iframe 마운트(1개만, LRU 3) → 닫으면 즉시 `about:blank` 언마운트
- **채택 사유**: D-3 4중 방어 중첩 가능 + Seed 5 iframe LRU 3개 예산과 정합 + 플레이 완료 postMessage로 VibePlaySession 종료 신호 수신

### 1.3 제작 — Claude Artifacts 대화 + 우측 미리보기 srcdoc

- **출처**: Claude Artifacts, ChatGPT Canvas, v0.dev 실시간 미리보기 패턴
- **패턴**: 좌측 Sonnet 스트리밍 채팅 + 우측 `<iframe srcdoc="...">` 실시간 미리보기. 저장 시 Playwright headless로 160×120 WebP 썸네일 서버 생성
- **채택 사유**: D-2 단일 HTML 아티팩트 원칙. 학생이 저장까지 라우팅 전환 0회.

### 1.4 리뷰 — Steam-like 별점 5 + 실명

- **출처**: Steam(별점·리뷰), Scratch Teacher Account(실명 책임 관례)
- **패턴**: 1-5 별점 + 선택적 댓글 + 신고 버튼 + 학생 1인 1리뷰(`@@unique([projectId, reviewerStudentId])`)
- **채택 사유**: U-2 `named` 기본(실명 책임 = R-10 악성 완화) + U-3 `stars_1_5`(학년 이해도·정렬 정보량)

### 1.5 모더레이션 — Scratch 교사 승인 게이트

- **출처**: Scratch Teacher Account, Google Classroom 과제 승인 흐름
- **패턴**: 기본 `moderationStatus="pending_review"` → 교사 대시보드 승인 큐에서 A/R 키보드 단축키
- **채택 사유**: U-1 `teacher_approval_required` 기본(R-2 극심 리스크 방어) + R-7 교사 부담은 자동 1차 필터(Anthropic refusal + 서버 금칙어 regex) + 단축키로 분산

---

## 2. MVP 범위

### 포함 (IN) — v1 스코프

**데이터 모델 (6 신규 엔티티 + enum/관계 확장)**

- `VibeArcadeConfig` (boardId PK 1:1)
- `VibeProject` (학생 결과물 단일 HTML)
- `VibeSession` (Sonnet 대화 세션)
- `VibeReview` (별점·댓글, 학생 1인 1리뷰)
- `VibePlaySession` (플레이 원장 — itch.io "things to rate" 독려)
- `VibeQuotaLedger` (토큰 일별 rollup)
- `Board.layout` enum에 `"vibe-arcade"` 추가
- `FeatureFlag.vibeArcadeGate` 런칭 플래그

**LLM Provider**

- `src/lib/llm/providers/anthropic-sonnet.ts` — Anthropic SDK `messages.create(stream=true)` 래퍼 + 교사 API Key 서버 프록시 + 입력 필터 hook + 출력 ```html 블록 파서 + 블랙리스트 태그 스캔 + refusal 집계

**UI 라우트·컴포넌트**

- `/board/[id]/vibe-arcade` (학생 카탈로그 + 제작 진입)
- 카탈로그(Catalog) · 플레이 모달(PlayModal) · 제작 스튜디오(VibeCodingStudio) · 리뷰 패널(ReviewPanel)
- 교사 모더레이션 대시보드(TeacherModerationDashboard) — 4탭(승인 큐 / 쿼터 현황 / 프롬프트 로그 / 설정)

**API (8종)**

- `POST /api/vibe/sessions` (Sonnet 스트리밍)
- `POST|GET|PATCH /api/vibe/projects`
- `POST|GET /api/vibe/reviews` (+ 신고)
- `POST /api/vibe/play-sessions`
- `GET /api/vibe/quota` (교사 대시보드)
- `POST /api/vibe/moderation` (승인/반려)
- `GET /api/vibe/config` + `PATCH`
- `GET /sandbox/vibe/[projectId]` (cross-origin 서빙)

**보안·성능 인프라**

- cross-origin 서브도메인(`sandbox.aura-board.app`) 라우팅 + CSP middleware
- 서버 HTML 파서 블랙리스트(`<iframe>·<object>·<embed>`·`javascript:`·`data:` HTML·외부 URL 화이트리스트 외)
- 서버 Playwright headless 썸네일 생성
- 쿼터 3단 배분 체크 미들웨어 (교사 월→학급 풀→학생 상한)
- 개인정보 사전 스캔 (gongmun-assistant `privacy.py` 패턴 재활용)

**Cron 3종**

- `vibe-arcade-quota-rollup` (일별 00:10 KST rollup)
- `vibe-arcade-anonymize` (7일 미활성 익명화)
- `vibe-arcade-hard-delete` (Free 120일 / Pro 365일)

### 제외 (OUT) — v1 편입 금지

| ID | 항목 | 제외 이유 | 후속 |
|---|---|---|---|
| F-1 | 학생 신뢰 등급(`Student.vibeTrustTier`) | U-1 교사 승인 모드 기본 → 신뢰 등급 불필요 | v1.5/v2 |
| F-2 | 좋아요 화폐(StudentAccount 연동) | 경제 시스템 별도 설계 필요 | 별도 시드 |
| F-3 | 학부모 자녀 작품 열람 | parent-viewer v2 cross-cutting | parent-viewer 후속 시드. 본 task phase5 integrate에서 `parent-viewer-roadmap §5`에 `vibe-arcade-child-view` 행 추가만 |
| F-4 | Remix(`VibeProject.remixedFromId`) | 원작자 배지·리뷰 집계 분리 설계 미완 | v2 (`allowRemix=false` 기본) |
| F-5 | 학급 Best Of 주간·학기말 포트폴리오 PDF | canva-assignment-pdf-merge 재활용 필요 | v2 |
| F-6 | Pyodide Python 보드 | 번들 ~10MB 성능 예산 분리 필요 | v2 (`vibe-arcade-python` 별도 layout) |
| F-7 | 스쿨마스터 2026 연동 | 학급 단위 운영 스코프 밖 | 관찰만 |
| — | ML 자동 모더레이션 분류 | v1은 regex + Anthropic classifier로 충분 | v1.5+ |
| — | 복수 태그·자유 태그 | v1은 고정 5종 단일 선택 | v2 |

### 스코프 결정 모드

**Selective Expansion** — 신규 레이아웃 1개 + 엔티티 6종은 Seed 11(assignment-board) 확장 패턴 그대로 재사용하므로 구조적 신규성 낮음. LLM provider 추가는 Seed 12 추상화의 첫 실사용. 단, cross-origin 샌드박스 인프라 · 쿼터 3단 배분 · Playwright 썸네일 · 교사 모더레이션 워크플로는 **신규 도메인**이므로 F-1~F-7 파킹 철저.

---

## 3. 수용 기준 (Acceptance Criteria)

### 3.1 Functional (12)

- [ ] **AC-F1** `VibeArcadeConfig` 6필드 CRUD API + 기본값(`teacher_approval_required` / 45000 / 1500000 / false / named / stars_1_5)로 자동 생성
- [ ] **AC-F2** `VibeProject` CRUD + 교사 승인/반려(`moderationStatus` 전환 + `approvedAt|rejectedAt|ById` 세팅 + `moderationNote ≤300자`)
- [ ] **AC-F3** `VibeSession` Sonnet 스트리밍 대화 (SSE/WebSocket 증분 텍스트, React state 누적 금지) + `tokensIn/Out` 집계 + `refusalCount` 증분
- [ ] **AC-F4** `VibeReview` 작성 API — `@@unique([projectId, reviewerStudentId])` 학생 1인 1리뷰 + 신고 3건 `moderationStatus="hidden_by_teacher"` 자동 전환
- [ ] **AC-F5** `VibePlaySession` — iframe `postMessage({type:"completed"})` 수신 시 `completed=true` + `endedAt` 세팅
- [ ] **AC-F6** `VibeQuotaLedger` 일별 rollup (classroomId, studentId?, date) unique + 학급 합계 행 별도
- [ ] **AC-F7** `Board.layout` enum에 `"vibe-arcade"` 추가 + 기존 11개 layout 값 유지(regression 0)
- [ ] **AC-F8** `anthropic-sonnet.ts` provider — 교사 API Key DB 암호화 조회 + `messages.create(stream=true)` 래핑 + 입력 필터 hook + 출력 ```html 파서 + 블랙리스트 스캔
- [ ] **AC-F9** 쿼터 3단 체크 — 세션 시작 전 학생 일일 45K + 학급 일일 150만 양쪽 체크, 소진 시 "내일 다시" 모달(Haiku 다운그레이드 금지)
- [ ] **AC-F10** 학생 제작 플로우 — 쿼터 체크 → Sonnet 스트리밍 → srcdoc 미리보기 → 저장 시 Playwright 160×120 WebP 썸네일 서버 생성 → `moderationStatus="pending_review"` 기본 게시
- [ ] **AC-F11** 학생 소비 플로우 — 카탈로그 그리드(5탭) → 전체화면 모달 → cross-origin iframe + JWT playToken(1시간) → VibePlaySession 생성 → 리뷰 작성 → `VibeProject.reviewCount/ratingAvg` 비정규화 갱신
- [ ] **AC-F12** 교사 모더레이션 대시보드 4탭 — 승인 큐(A/R 단축키) · 쿼터 현황(학생별 슬라이더) · 프롬프트 로그(금칙어 매치 + CSV) · 설정(Config 6필드 + 긴급 정지 `classroomDailyTokenPool=0`)

### 3.2 Non-functional (9)

- [ ] **AC-N1** 카탈로그 TTI < 3s (30 카드 기준, 갤럭시 탭 S6 Lite Chrome)
- [ ] **AC-N2** 첫 뷰포트 JS+CSS 번들 < 500KB gzip (Monaco 에디터 등 금지)
- [ ] **AC-N3** iframe — 카탈로그 0개 / 모달 1개 / LRU 3개 상한 + 모달 닫힘 시 `about:blank` 언마운트
- [ ] **AC-N4** 썸네일 160×120 WebP + lazy + IntersectionObserver + 클라 생성 금지
- [ ] **AC-N5** Sonnet 토큰당 p95 지연 < 200ms
- [ ] **AC-N6** 플레이 iframe 60fps (rAF) + 메모리 < 100MB/iframe + 비활성 5분 자동 언마운트
- [ ] **AC-N7** 1시간 사용 후 총 메모리 < 500MB + 모달 닫힘 후 `iframe[data-vibe-sandbox]` 잔존 0개
- [ ] **AC-N8** sandbox iframe 내 `document.cookie` = empty string (쿠키 탈취 불가 단위 테스트)
- [ ] **AC-N9** postMessage origin 검증 누락 시 메시지 무시 (단위 테스트)

### 3.3 UX·Governance (10)

- [ ] **AC-U1** U-1~U-4 4필드가 `VibeArcadeConfig`로 교사 대시보드 탭4에서 런타임 변경 가능 (스키마 변경 없이)
- [ ] **AC-U2** 쿼터 소진 UX — 학생 소진 시 "내일 다시" 모달, 학급 풀 소진 시 교사 알림 + 신규 세션 차단(기존 종료까지 허용)
- [ ] **AC-U3** 카탈로그 탭 5종 + 태그 필터(고정 5종: 게임·퀴즈·시뮬·아트·기타, 단일 선택)
- [ ] **AC-U4** 학생 반려 복구 플로우 — `moderationNote` 표시 + 수정·재제출 + `version+=1`
- [ ] **AC-G1** R-1 쿠키·토큰 탈취 방어 — cross-origin + sandbox + CSP + postMessage 화이트리스트
- [ ] **AC-G2** R-2 다층 콘텐츠 방어 — (a) Anthropic input classifier (b) 서버 금칙어·개인정보 regex (c) 교사 승인 게이트 (d) 학생 신고 → flagged
- [ ] **AC-G3** R-5 개인정보 스캔 — gongmun-assistant `privacy.py` 재활용 (전화/주민/성명 5자) + 프롬프트·HTML 사전 스캔 + 교사 게이트
- [ ] **AC-G4** R-8 API Key — env 보관 금지 + DB 암호화 + 서버 프록시 전용(클라 직접 호출 금지) + 학생별 레이트 limit + 일일 비정상 소비 Slack 경보
- [ ] **AC-G5** R-9 데이터 보존 — 7일 미활성 익명화 (studentId→null) · Free 120일 / Pro 365일 하드 삭제 cron (Seed 12 관례)
- [ ] **AC-G6** 프롬프트 로그 감사 뷰 — `VibeSession.messages` 금칙어 매치 필터 + 학생별 그룹핑 + CSV 다운로드

총 **31 수용 기준**.

---

## 4. 스코프 결정 모드

**Selective Expansion**

근거:

- 엔티티 6종·Board.layout 확장·LLM provider 1개 추가는 Seed 11·12 패턴 그대로 계승 → 구조 신규성 낮음
- 그러나 cross-origin 샌드박스 인프라(sandbox.aura-board.app 신규 서브도메인) + Sonnet 쿼터 3단 배분 + 교사 모더레이션 워크플로 + Playwright 썸네일 파이프라인은 **신규 도메인** → 이 4개 축에만 집중
- F-1~F-7 7건은 모두 파킹 철저 — 특히 F-4(Remix)·F-5(포트폴리오 PDF) 유혹 크지만 v1 스코프 외 절대 편입 금지

---

## 5. 위험 요소

### 5.1 극심(Extreme)

- **R-1 쿠키·토큰 탈취**: 학생 생성 JS가 부모 도메인 쿠키·localStorage에 접근 가능성 → cross-origin 서브도메인 + `allow-scripts` (allow-same-origin 금지) + CSP `sandbox` 헤더 + postMessage origin 화이트리스트 4중 방어
- **R-2 부적절 콘텐츠 생성**: Sonnet이 초중등 부적합 콘텐츠 산출 → (a) Anthropic input classifier (b) 서버 금칙어 regex (c) 교사 승인 게이트 (d) 학생 신고

### 5.2 높음(High)

- **R-3 쿼터 독식**: 1~2명 학생이 학급 풀 소진 → `perStudentDailyTokenCap=45000` + `classroomDailyTokenPool=1500000` + 세션 타임아웃 + 교사 실시간 모니터
- **R-4 저작권 침해**: 특정 상용 게임 클론 → v1은 저작 가이드 팝업 + 프롬프트 사전 안내. 기술 감지(simhash·Scratch DB 대조)는 v1.5+
- **R-5 개인정보 노출**: 학생이 본인·타인 전화·주민·이름 입력 → gongmun-assistant regex 재활용 + 프롬프트·HTML 사전 스캔 + 교사 최종 게이트
- **R-8 API Key 유출**: Sonnet API Key가 클라 or 로그 → env 보관 금지 + DB 암호화 + 서버 프록시 + Slack 경보

### 5.3 중간(Medium)

- **R-7 교사 승인 부담**: 30명 학급 주당 ~90건 승인 → 자동 1차 필터(refusal + 금칙어 auto reject) + 신고 우선 정렬 + A/R 키보드 단축키
- **R-9 데이터 프라이버시**: 미성년 대화 장기 보존 → 7일 익명화 + Free 120일 / Pro 365일 삭제 cron
- **R-10 악성 리뷰**: 욕설·감정 배설 리뷰 → 신고 3건 auto-hidden + 욕설 regex + `reviewAuthorDisplay=named` + 교사 리뷰 탭
- **R-11 외부 도메인 로드**: 학생 HTML이 악성 CDN 로드 → CSP `frame-src 'none'` + 서버 파서 블랙리스트 + 외부 CDN 화이트리스트(jsdelivr·cdnjs·unpkg, SRI)

### 5.4 낮음(Low)

- **R-6 동시 편집 충돌**: VibeSession은 학생 1인 전용 단일 writer 모델 → 충돌 없음. VibeProject 재제출은 version field로 optimistic

### 5.5 기술 부채 리스크

- **Sonnet API 비용 예측 불확실성**: 잉여 쿼터 기반이지만 학생 바이브 코딩 토큰 소비 패턴 미검증 → VibeQuotaLedger 일별 rollup + 1주차 관찰 후 cap 조정
- **Playwright headless 리소스**: 동시 썸네일 생성 부하 → 큐잉(BullMQ or similar) + 동시 3건 제한
- **Board.layout enum 확장 마이그레이션**: 기존 보드 영향 0 (신규 enum 값만 추가) + FeatureFlag 런칭 플래그로 안전

---

## 6. 자동 검증 게이트 통과 조건

- ✅ 필수 필드 — 수용 기준 31건 ≥ 3 · 리스크 분석 존재(극심 2 / 높음 4 / 중간 4 / 낮음 1 / 부채 3) · 스코프 결정 모드 명시(Selective Expansion) · IN/OUT 명확 분리
- ✅ 측정 가능 — 모든 AC는 동사형 · 숫자 또는 boolean 판정 가능
- ✅ placeholder/TBD 0

→ **스코프 검증 게이트 PASS**. phase3 architect 진입.
