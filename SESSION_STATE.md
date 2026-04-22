# Session State — 2026-04-22 18:10 KST (update 2)

> 원격 세션에서 이어갈 때 **가장 먼저** 이 파일을 읽어 현재 상태를 파악한다.

## 현재 HEAD: `3b7051b` — Vercel prod READY ✅

배포 URL: `https://aura-board-app.vercel.app` (리전 icn1)

## 오늘 세션 커밋 타임라인

```
3b7051b feat(vibe-arcade): 잠긴 게이트에서 교사 원클릭 "학급 아케이드 열기" 버튼
7c20096 feat(llm): Ollama 로컬 테스트 provider 추가 (개발자 전용)
21fb169 fix(billing-callback): useSearchParams Suspense boundary — build 실패 복구
a1054a8 feat(teacher-settings): /teacher/settings 허브 페이지
199f83b feat(billing): 빌링키 AES-256-GCM 암호화 저장
ae5ecc4 docs(session): 이전 세션 상태 스냅샷 (본 파일 이전 버전)
c574404 feat(llm+billing): 교사 LLM Key 저장 + Toss 정기결제 scaffold
```

c574404 ~ a1054a8 (4건)이 `useSearchParams` Suspense boundary 누락으로 prod build 실패. 21fb169에서 복구.

## 현재 동작하는 것

### 1. 교사 LLM API Key 저장 (실동작)
- **진입점 바뀜**: `/docs/ai-setup`에서 `/teacher/settings#llm`으로 이동
  - `/docs/ai-setup` 하단은 "교사 설정에서 Key 저장" CTA 버튼만 남음
- 지원 provider 4종: **Claude / ChatGPT / Gemini / Ollama**
  - Ollama는 드롭다운 레이블 "🧪 Ollama (로컬 테스트 — 개발자 전용)"로만 노출 (공개 안내 문서엔 미포함)
  - Ollama 선택 시 `baseUrl` + `modelId` 입력 필드 추가 노출
- AES-256-GCM 암호화 저장, 저장 시 각 사 API에 테스트 호출로 검증
- 학생이 vibe-arcade 보드 사용 시 서버 프록시로 해당 Key 호출

### 2. 교사 설정 허브
- `/teacher/settings` 신규 — 🤖 생성형 AI · 🎨 Canva · 💳 결제·구독 세 섹션
- AuthHeader ⚙ 메뉴: "교사 설정" 헤더 + 세 sub-item 앵커 (#llm/#canva/#billing)
- 보드 개설 시 별도 연결 없이 이 페이지에서 한 번만 저장

### 3. 결제 scaffold
- `/billing` UI + `/billing/callback` + `/docs/billing-setup` (관리자용)
- Toss Payments 빌링키 flow: checkout → confirm → cancel → webhook
- **빌링키 AES-GCM 암호화 저장** (`src/lib/billing/billing-key-crypto.ts`, LLM_KEY_SECRET 파생키 공유)
- `tier.ts`에 DB 구독 반영 `isProTierAsync` 추가 (sync variant는 기존 호환 유지)
- 실결제 활성: `TOSS_CLIENT_KEY` + `TOSS_SECRET_KEY` + `TOSS_WEBHOOK_SECRET` 환경변수 설정 필요

### 4. vibe-arcade 교사 게이트 열기
- 보드 생성 직후 `VibeArcadeConfig.enabled = false` 잠금 상태
- 교사 시점에 잠금 화면에 **"학급 아케이드 열기"** 버튼 노출
- 클릭 → `PATCH /api/vibe/config { enabled: true }` → 즉시 게이트 해제
- 사용자 실제 Gemini Key로 저장·검증 완료. 잠금 해제하고 테스트하면 됨

## 배포 전 해야 할 환경 변수 (Vercel Production + Preview)

| 키 | 용도 | 비고 |
|---|---|---|
| `LLM_KEY_SECRET` | 교사 API Key + 빌링키 암호화 마스터 | 32+자 랜덤. 없으면 AUTH_SECRET fallback |
| `TOSS_CLIENT_KEY` | Toss 클라이언트 키 (ck_...) | 없으면 `/billing` 버튼 disable |
| `TOSS_SECRET_KEY` | Toss 시크릿 키 (sk_...) | 서버 전용 |
| `TOSS_WEBHOOK_SECRET` | 웹훅 쿼리 `?secret=` 값과 대조 | `/api/billing/webhook/toss` |
| (선택) `CLAUDE_MODEL_ID` | 기본 `claude-sonnet-4-5` | |
| (선택) `OPENAI_MODEL_ID` | 기본 `gpt-4o-mini` | |
| (선택) `GEMINI_MODEL_ID` | 기본 `gemini-2.5-flash` | |

## 남은 후속 작업 (우선순위 순)

1. **정기결제 갱신 cron** — `/api/cron/billing-renew` 추가. `currentPeriodEnd ≤ now` 인 active 구독 스캔 → `chargeBillingKey` 재호출. 실패 시 status=past_due.
2. **환불·부분취소 API** — Toss `/v1/payments/cancel`. scaffold에 미포함.
3. **웹훅 HMAC 서명 검증** — 쿼리 secret 방식은 초기용. Toss가 서명 헤더 제공하면 교체.
4. **Pro 기능 게이팅 DB 반영** — `CreateBreakoutBoardModal`의 `userTier` prop이 env 기반 sync 호출. `isProTierAsync`로 바꾸면 DB 구독 반영됨.
5. **Canva Connect 연동 UI 마감** — `/teacher/settings#canva` 섹션에 뱃지/버튼은 있으나 연결 플로우 end-to-end 확인 필요.
6. **Vibe Phase 3 (교사 모더레이션)** — 슬롯 그리드 클릭 시 교사 검토 모달. 현재 Studio만 연결.
7. **vibe-arcade 설정 풀 UI** — 교사가 쿼터/리뷰 정책을 게이트 해제 후 조정할 수 있게. 지금은 PATCH API만 존재.
8. **SEC-1~6** — Upstash 레이트리밋, Slack 이상징후 알림, PlayModal postMessage origin 검증, sandbox.aura-board.app DNS.
9. **dead CSS/blocks 정리 (T10)** — `.classroom-nav-*`, `ClassroomDetail.tsx`의 `{false && ...}` 블록.

## 사용자가 미완료로 남긴 지시

- `origin/feat/vibe-coding-arcade` 원격 브랜치 삭제 (destructive, 명시적 승인 필요)

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
git log --oneline -3   # 최신이 3b7051b 여야 함
npx tsc --noEmit       # 0 errors
```

## 세션 컨텍스트 메모

- 사용자는 윈도우(본 세션)와 원격 우분투 CLI를 교대로 쓴다
- 커밋 훅이 main 직접 커밋 차단 → feat 브랜치 생성 후 `git push origin feat/X:main` 패턴
- 파괴적 작업 (force push, branch -D, 원격 브랜치 삭제)은 사용자 명시적 승인만
- 주 언어는 한국어. 코멘트·커밋 메시지·UI 텍스트 전부 한글
- **Next.js 16 App Router 주의점**: `useSearchParams()`는 반드시 `<Suspense>` 경계 안에서. 이거 놓치면 prod build만 실패하고 dev는 통과함 (c574404 사례)

## 실 사용자 확인된 시나리오

- Gemini API Key 저장 → 검증 통과 → "연결됨" 뱃지 노출 (`/teacher/settings#llm`)
- vibe-arcade 보드 생성하면 학급 아케이드 아직 잠긴 상태 — 교사가 "열기" 버튼 눌러야 함 (3b7051b로 버튼 추가됨)
