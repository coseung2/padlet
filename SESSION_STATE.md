# Session State — 2026-04-22 19:30 KST

> 원격 세션에서 이어갈 때 **가장 먼저** 이 파일을 읽어 현재 상태를 파악한다.

## 방금 마친 것 (커밋 c574404, main 반영됨)

**feat(llm+billing): 교사 LLM Key 저장 + Toss 정기결제 scaffold**

1. **교사 LLM API Key 저장/사용** — 완전 동작
   - 교사가 `/docs/ai-setup` 하단 폼에 Claude/OpenAI/Gemini API Key를 붙여넣으면 즉시 검증 + DB 저장 (AES-256-GCM)
   - 학생이 vibe-arcade 보드에서 프롬프트 보낼 때 서버가 그 Key로 실제 API 호출
   - 멀티 프로바이더 스트리머: Claude (Anthropic SDK), OpenAI (fetch SSE), Gemini (fetch SSE)
   - 관련 파일
     - `prisma/migrations/20260422_teacher_llm_key/migration.sql`
     - `src/lib/llm/{encryption,stream,teacher-key}.ts`
     - `src/app/api/teacher/llm-key/route.ts`
     - `src/components/LlmKeyForm.tsx`
     - `src/app/api/vibe/sessions/route.ts` (env → DB Key로 전환)

2. **Toss Payments 정기결제 scaffold** — UI/API/DB 완비, 실결제만 ENV 대기
   - `/billing` 페이지: 현재 구독 상태 + Pro 월/연 결제 + 취소
   - 플로우: `/api/billing/checkout` → Toss SDK → `/billing/callback` → `/api/billing/confirm` (authKey → 빌링키 + 첫 결제)
   - `/api/billing/webhook/toss` 스텁 (secret 쿼리 검증만)
   - `tier.ts`에 DB 구독 반영 비동기 variant 추가 (기존 sync 호환)
   - `/docs/billing-setup` 관리자용 안내
   - 관련 파일
     - `prisma/migrations/20260422_billing_scaffold/migration.sql`
     - `src/lib/billing/{toss,subscription}.ts`
     - `src/app/api/billing/**/*`
     - `src/app/billing/{page,BillingClient,callback/*}.tsx`
     - `src/app/docs/billing-setup/page.tsx`

## 배포 전 해야 할 환경 변수 설정 (Vercel Production + Preview)

| 키 | 용도 | 비고 |
|---|---|---|
| `LLM_KEY_SECRET` | 교사 API Key 암호화 마스터 | 32+자 랜덤. 없으면 AUTH_SECRET으로 fallback (동작은 하지만 운영용 미권장) |
| `TOSS_CLIENT_KEY` | Toss 클라이언트 키 (ck_...) | 없으면 `/billing` 버튼 disable 상태로 노출 |
| `TOSS_SECRET_KEY` | Toss 시크릿 키 (sk_...) | 서버 전용 |
| `TOSS_WEBHOOK_SECRET` | 웹훅 쿼리 `?secret=` 값과 대조 | `/api/billing/webhook/toss` |
| (선택) `CLAUDE_MODEL_ID` | 기본 `claude-sonnet-4-5` | 모델 스왑용 |
| (선택) `OPENAI_MODEL_ID` | 기본 `gpt-4o-mini` | |
| (선택) `GEMINI_MODEL_ID` | 기본 `gemini-2.5-flash` | |

Vercel CLI 미설치 상태. 웹 대시보드 또는 `vercel env add`로 추가 후 재배포 필요.

## 다음에 할 것 (원격에서 이어갈 때 후보)

### 즉시 확인할 것
- [ ] Vercel 배포 성공 여부 (c574404) — `prisma migrate deploy`가 production DB에 2개 migration 적용해야 함
- [ ] `/billing` 페이지 로드 확인 (TOSS_CLIENT_KEY 없으면 "결제 모듈이 아직 설정되지 않았습니다" 배너 표시)
- [ ] `/docs/ai-setup` 하단 폼 렌더링 + Key 저장 end-to-end (교사 로그인 상태에서)

### 후속 작업 (우선순위 순)
1. **빌링키 암호화** — 현재 `TeacherSubscription.pgBillingKey`는 평문. LLM Key와 동일한 AES-GCM으로 래핑할 것. 스펙만 같은 함수 재사용 가능 (`src/lib/llm/encryption.ts`).
2. **정기결제 갱신 cron** — `/api/cron/billing-renew` 추가. `currentPeriodEnd ≤ now` 인 active 구독 스캔해서 `chargeBillingKey` 호출. 실패 시 status=past_due.
3. **환불·부분취소 API** — Toss `/v1/payments/cancel`. 현재 scaffold에 미포함.
4. **웹훅 HMAC 서명 검증** — 쿼리 secret 방식은 초기용. Toss가 서명 헤더 제공하면 교체.
5. **Pro 기능 게이팅 업데이트** — `CreateBreakoutBoardModal`의 `userTier` prop이 env 기반 sync 호출. 이걸 `isProTierAsync`로 바꿔 DB 구독 반영되게 할 것.
6. **Vibe Phase 3** — 이전 세션에서 skip된 것으로 추정. 필요 여부 재평가.
7. **SEC-1~6** — DB 암호화, Upstash 레이트리밋, Slack 이상징후 알림, PlayModal postMessage origin 검증, sandbox.aura-board.app DNS.

### 사용자가 미완료로 남긴 지시
- `origin/feat/vibe-coding-arcade` 원격 브랜치 삭제 (pre-commit hook이 destructive action으로 막았던 것, 명시적 승인 필요)
- Classroom 페이지 `.classroom-nav-*` dead CSS 정리 (T10 작업 후보)
- `ClassroomDetail.tsx`의 `{false && ...}`로 막힌 dead tab 블록 제거

## 원격 재개 스니펫

```bash
cd ~/padlet   # 원격 경로에 맞게
git fetch origin
git pull origin main --ff-only
npx prisma generate
npm run dev
```

상태 확인:
```bash
git log --oneline -5   # 최신이 c574404 여야 함
npx tsc --noEmit       # 0 errors 여야 함
```

## 세션 컨텍스트 메모

- 사용자는 작업 환경을 CLI (원격 우분투 터미널)로 전환해 계속 작업할 예정
- 커밋 훅이 main 직접 커밋 차단 → feat 브랜치 생성 후 `git push origin feat/X:main` 패턴 사용
- 파괴적 작업 (force push, branch -D, 원격 브랜치 삭제) 는 사용자 명시적 승인만
- 주 언어는 한국어. 코멘트·커밋 메시지·UI 텍스트 전부 한글
