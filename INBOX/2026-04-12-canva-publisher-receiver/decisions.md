# Phase 3 Decisions — Canva Publisher Receiver

> task_id: `2026-04-12-canva-publisher-receiver`
> session_id: `interview_20260412_124111`
> ambiguity: **0.12** (목표 ≤ 0.2 달성)
> 인터뷰 라운드: 3 (자율 답변, 사용자 부재)
> 작성: 2026-04-12 · interview-facilitator 에이전트

---

## 0. 요약

Ouroboros 인터뷰로 phase2 sketch의 미결 Q1~Q7 + 리스크 R1·R2 + 인터뷰 중 드러난 3개 API 계약 분기(boardId 지정 방식, request body 스키마, 200 OK 응답 스키마)를 해소. 모든 결정은 phase1 권고·phase2 sketch 불변 전제·사전 방침(사용자 제공)에 정합한다.

---

## 1. 사전 방침으로 확정된 결정 (인터뷰 이전)

사용자 사전 제공 방침 — 에이전트 자율 적용.

| # | 주제 | 결정 | 근거 |
|---|---|---|---|
| D1 | Scope 체계 (Q1) | v1은 `cards:write` 단일 스코프. `scopes String[]` 필드 유지로 v2 확장(`submissions:write`, `webhooks:receive`) 대비 | phase2 §1-B, Seed 5 P2-⑤ 호환 |
| D2 | 유효기간 기본값 (Q2) | 기본 90일. 드롭다운: **1일(테스트)/30일/90일(기본)/365일/무기한**. 무기한 유지하되 UI에 "권장: 90일 회전" 가이드 | phase1 §1-C |
| D3 | 1회 노출 UX (Q3) | "복사" 버튼 + "다운로드(.txt)" 버튼 **둘 다** 제공. 모달 닫으면 재표시 불가 | 갤탭 앱 이동 시 clipboard 유실 리스크 완화 |
| D4 | 레거시 row 처리 (Q4 / R2) | 3단계 마이그레이션: (1) `tokenPrefix String? @unique` nullable 추가 → (2) 레거시 row 일괄 `revokedAt=now` + 이메일 재발급 공지 → (3) NOT NULL 전환 | tokenHash에서 prefix 역산 불가 (SHA-256 단방향) |
| D5 | Canva 딥링크 (Q5) | v1은 `https://www.canva.com/apps` 일반 URL 폴백. 교사용 deeplink는 aura-canva-app 별도 확인 task | Canva Apps 딥링크 스펙 확인 비용 > 가치 (v1) |
| D6 | sectionId 지정 (Q6) | v1 API body에 `sectionId?: cuid \| null` optional 수용. 누락 시 보드 기본 섹션(freeform null). Canva 앱 section 드롭다운은 v2 파킹 | Canva는 섹션 개념 모름, 확장성만 확보 |
| D7 | CRC32 checksum (Q7) | v1 미포함. v1.1 검토. 미래 도입 시 prefix 정규식 분기(`aurapatc_` 신포맷) | phase1 §1-B 🟡 옵션, 구현 0.5일이지만 v1 복잡도 회피 |
| D8 | 다른 외부 앱 확장 | `scopes String[]` + Card 메타 별도 `metadata JSON` 필드로 일반화. v1은 Canva 전용이지만 Slack·Miro 등 대비 | phase2 §6-A |
| D9 | imageUrl 저장소 | **Vercel Blob** 확정 (Seed 2 인프라 일관). S3는 Enterprise v2+ | phase1 §2-B |
| D10 | PAT 분실 정책 | 복구 불가. 새로 발급. 보안 원칙 | GitHub/GitLab 표준 |
| D11 | Tier 게이팅 세분 | (a) `POST /api/external/cards`는 **Pro 전용**. Free 토큰 호출 시 **402 Payment Required** + 업그레이드 링크 반환. (b) Free 교사도 토큰 발급은 가능하되 scope `cards:write`는 **Pro 인증 사용자만 발급** 가능 (UI에서 잠금 배지). | Seed 2 승계, phase2 §6-B |
| D12 | Rate limit 수치 | **token당 분당 60, 교사당 시간당 300**. Upstash Redis sliding window. 초과 시 429 + Retry-After 헤더 | phase1 §3, phase2 §2-A(5) — perIp 300/min은 유지 |
| D13 | R1 p95 초과 완화 | 스트리밍 처리 도입 — request body를 chunk 단위로 `@vercel/blob` multipart/stream put. 메모리 버퍼 최소화. 목표 **p95 < 500ms** (사용자 명시치) 엄수. 추가로 aura-canva-app 측 프리-리사이즈 강제(별도 task) | sketch §5·§7 R1, tablet-performance-roadmap §2 |

---

## 2. 인터뷰 중 확정된 결정 (API 계약 구체화)

Ouroboros 인터뷰가 sketch 본문만으론 모호했던 3개 분기를 추가 검증. 답변 근거 = sketch §2-A 클라이언트 계약 + aura-canva-app 읽기 전용 인터페이스.

### D14. boardId 지정 방식

**결정**: `POST /api/external/cards` body에 `boardId: cuid` **필수**. `scopeBoardIds`는 서버측 **allowlist 권한 검증용**.

**처리**:
- body.boardId가 `scopeBoardIds`에 포함되는지 서버가 재검증 (scopeBoardIds 빈 배열 = 교사 소유 전체 허용)
- 위반 시 `403 forbidden_board`

**근거**:
- aura-canva-app `content_publisher/index.tsx` 클라이언트가 이미 보드 드롭다운 UX로 body.boardId 전송 계약 고정
- 토큰=보드 1:1 제한은 교사 UX 역행 (반마다 재발급 불필요)
- scopeBoardIds는 "허용 범위"이지 "타겟 지정"이 아님 (분리 책임)

### D15. Request body Zod strict 스키마

**결정**: 단 4개 필드 — strict mode (알 수 없는 키 거부).

```ts
const bodySchema = z.object({
  boardId: z.string().cuid(),
  title: z.string().min(1).max(200),
  imageDataUrl: z.string().regex(/^data:image\/png;base64,/),
  sectionId: z.string().cuid().nullable().optional(),
}).strict();
```

- `title`: Canva 디자인 이름이 aura-canva-app 클라이언트에서 자동 주입
- `imageDataUrl`: PNG 전용 (Canva Publisher 1차 스펙)
- `sectionId`: optional (D6 연계). 누락/null → 보드 최상단
- 알 수 없는 필드 → `422 invalid_data_url`
- `cardType`·`tags`·`metadata` 등은 v1 범위 외 (미래 확장은 D8 metadata JSON 필드로 일반화)

**근거**: sketch §2-A 계약 + D6 sectionId optional 승계 + strict mode로 실수 방지.

### D16. 200 OK 응답 스키마

**결정**: `200 OK` (201이 아닌 200 — 기존 클라이언트 계약 준수).

```json
{
  "id": "<Card.id cuid>",
  "url": "https://aura-board-app.vercel.app/board/<slug>#c/<cardId>"
}
```

- `imageUrl`, 전체 card 객체, 내부 필드는 **응답 비포함** (최소 반환·내부 필드 노출 최소화)
- Canva 앱은 응답 받아 Toast "Aura-board에 게시됨" + externalUrl 링크로 교사에게 결과 확인 UX 제공 (sketch §4-A 6-7단계)
- 에러 응답은 `{ error: { code: string, message: string } }` 통일 포맷
- `Content-Type: application/json` 고정

**근거**: sketch §2-A 계약 그대로 + Canva 앱은 원본 디자인 보유하므로 imageUrl 재사용 불필요.

---

## 3. 리스크 해소 상태

| # | 리스크 | 해소 결정 |
|---|---|---|
| R1 | p95 3MB 업로드 예산 초과 | D13 스트리밍 처리 + aura-canva-app 프리-리사이즈 강제 (별도 task) |
| R2 | 레거시 tokenPrefix NULL | D4 3단계 마이그레이션 (nullable → revoke → NOT NULL) |
| R3 | Vercel Blob 4.5MB 초과 | 조기 413 + Canva UI 재-Export 가이드 (sketch §7 그대로 유지) |
| R4 | PAT 평문 유출 | 1회 모달 경고 + prefix 포맷 secret scanner 호환 + 즉시 revoke UI (sketch §7 유지) |
| R5 | timing side-channel | prefix miss 시 dummy hash timingSafeEqual + per-IP rate limit (sketch §7 유지) |
| R6 | Upstash 장애 fail-open | fail-open 권고 + healthz 모니터 (sketch §7 유지) |
| R7 | Free 교사 tier 강등 우회 | 수신 단계 user.tier 재검증 (D11 이중 방어) |
| R8 | Canva 송신측 이슈 | 에러 응답에 원인 코드 명시 (sketch §7 유지) |
| R9 | Tier 훅 Seed 2 이전 | v1 임시 허용 + "베타: Pro 제한 추후" 배너 (sketch §7 유지) |

---

## 4. 새로 드러난 분기 (현재 세션 편입 금지 — 별도 task 예약)

interview-facilitator contract의 "인터뷰 중 새로 드러난 큰 분기"는 본 Seed 외부로 파킹.

1. **aura-canva-app 프리-리사이즈 강제 task** (R1 완화 b조건)
   - Canva 앱 클라이언트에서 export 직전 3MB 초과 시 해상도 자동 스케일다운
   - 별도 phase0 request 필요 (aura-canva-app 리포 대상)

2. **Canva Apps 교사용 deeplink 스펙 조사 task** (D5 후속)
   - `https://www.canva.com/apps/intent/...` 형태 확인 → v1.1에 적용

3. **Card 삭제 시 Vercel Blob 정리 Cron task** (sketch §6-D)
   - onDelete cascade와 맞물려 `boards/<boardId>/cards/<cardId>.png` 삭제
   - padlet 리포 별도 task

4. **Webhook 수신 엔드포인트 `scopes: webhooks:receive`** (D1 v2 확장)
   - Seed 5 P2-⑤ 미래 계획 연계

5. **`metadata JSON` 필드 일반화** (D8)
   - 다른 외부 앱(Slack/Miro) 합류 시점에 실제 스키마 확정

---

## 5. Phase 3 → Phase 4 핸드오프

- **session_id**: `interview_20260412_124111` (phase3/session_id.txt 기록)
- **ambiguity**: 0.12 — Seed generation 가능 (임계값 ≤ 0.2 통과)
- **Ouroboros 리턴**: "Ready for Seed generation"
- 다음 단계: phase4 seed-composer가 본 decisions.md + phase2/sketch.md + phase1/exploration.md 종합해 Seed 생성 (seed-composer 에이전트)
- Seed 골격 후보:
  - goal: Canva Publisher 수신 엔드포인트 + PAT 발급/관리 UI 구현
  - acceptance criteria: sketch §2·§3 계약 + 본 decisions §2 스키마 + §3 리스크 완화 + tablet-performance §2 QA 게이트
  - constraints: phase1 §5 1순위 아키텍처 + D11 Tier 게이팅 + D12 Rate limit 수치 + D13 p95 < 500ms

---

## 6. 품질 체크리스트 (interview-facilitator contract)

- [x] ambiguity ≤ 0.2 달성 (0.12)
- [x] 각 결정에 근거 기록 (D1~D16 모두 근거 명시)
- [x] 새로 드러난 큰 분기는 §4에 기록, 현재 세션 편입 금지
- [x] session_id.txt + decisions.md 작성
- [x] Ouroboros "Ready for Seed generation" 포함
- [x] 사용자 판정 항목(수치·tier·UX 규범)은 사전 방침으로 확정 (AskUserQuestion 금지 준수)
- [x] 10라운드 미만(3라운드)에 완료
