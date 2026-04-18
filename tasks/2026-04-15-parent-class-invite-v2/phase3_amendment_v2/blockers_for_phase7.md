# Blockers for phase7 kickoff — parent-class-invite-v2

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **근거**:
  - `phase6/user_decisions.md` §"phase6 reviewer 에게" (블로커 3종 경고)
  - `phase6/review_report.md` §4 (외부 블로커 리스트)
  - 본 amendment v2 작성 중 식별된 갭
- **규칙**: 본 amendment 는 phase7 coder 진입 **전에** 사용자가 해결해야 할 항목만 나열한다. phase7 내부 구현 이슈는 제외.

---

## 1. 환경 변수 (Blocker — 핵심)

phase3 § 2.1·§7.3·§8.7 + 이메일 9종 dispatcher 운영 + parent session 발급 기능에 필요한 env 를 Vercel Production / Preview / Development 3환경에 모두 세팅해야 한다. 현재 `src/lib/parent-email.ts` 는 TODO 상태(`PARENT_EMAIL_ENABLED` flag 만 존재, 실제 Resend 연동 미구현).

| 변수명 (정확) | 용도 | 환경 | 기본값 여부 | 현재 상태 |
|---|---|---|---|---|
| `RESEND_API_KEY` | React-email 9종 발송. phase7 에서 `src/lib/parent-email.ts` 가 `resend` SDK 로 교체됨. | Production / Preview / Development | **없음 — 필수** | 미설정. `resend` npm 의존성도 미설치 (package.json 확인). phase7 kickoff 전 의존성 설치 + 키 발급 필요. |
| `PARENT_EMAIL_FROM` | 발신 주소 (e.g. `aura-board@mail.example.com`). Resend 검증 도메인 필요. | 동일 | 없음 — 필수 | 미설정. 도메인 DNS (SPF / DKIM) 세팅 사용자 책임. |
| `PARENT_EMAIL_ENABLED` | 플래그 (`"true"` 일 때만 실제 발송; dev 는 `"false"` 권장). | Production=true, Preview/Development=false | 기본 `"false"` 해석 (기존 코드) | 기존 값 유지 가능, 단 prod 에서는 반드시 `"true"`. |
| `CRON_SECRET` | `/api/cron/expire-pending-links` + 기존 2개 Cron 인증. | Production / Preview | 기존 재사용 (phase3 §7.3) | **기존 존재 확인 필요** (audit 없으면 신규 설정). phase7 kickoff 전 Vercel Dashboard 에서 확인. |
| `AUTH_SECRET` | parent magic-link 토큰 HMAC 서명 (src/lib/parent-magic-link.ts L10). NextAuth 와 공용. | 전 환경 | 기존 재사용 | **dev-secret fallback 제거 필요** — prod 에서 fallback 상태면 보안 이슈. phase7 coder 가 fallback 경로 제거 작업. |
| `PARENT_SESSION_SECRET` *(제안)* | `src/lib/parent-session.ts` 쿠키 서명용. 현재 `AUTH_SECRET` 공용 사용 중이라면 별도 분리 필요 여부 사용자 확정. | 전 환경 | 현재 미존재 | **결정 필요 항목**: phase3 § 2.1 "세션 의미론 변경" 이후 parent session 범위가 교사 NextAuth 와 명확히 분리되므로 키 분리 권고. 단 기존 코드가 `AUTH_SECRET` 공용인 상태라 phase7 내 수정 범위에 들어갈 수 있음. 사용자가 "분리 OR 공용 유지" 선택해야 함. |

### 1.1 `RLS rotation key` 항목 (phase6 review §4 언급) 재검토

phase6 review_report.md §4 는 "RLS rotation key" 를 blocker 로 명시했으나, phase3 architecture 전반에는 Postgres RLS rotation 관련 설계가 **존재하지 않는다** (Supabase RLS 자체가 phase3 에서 설계되지 않았고, 본 task 는 Prisma 직접 쿼리를 사용). 따라서 해당 항목은 **다음 2가지 중 하나**로 재해석 필요 — 사용자 확정 필요:

- (a) `CRON_SECRET` 을 주기 회전(rotation) 정책으로 운영한다는 의미 → 위 표 4행으로 흡수, 별도 key 불필요.
- (b) phase6 reviewer 가 의도한 것이 **`ClassInviteCode` 회전(phase3 §5.4)** 인 경우 → env 와 무관한 애플리케이션 기능(phase7 구현 범위 내)이며 blocker 아님.

**권고**: (a) 해석 채택. 실제 별도 "RLS rotation key" env 는 불필요. 사용자가 (b) 또는 신규 (c) 해석을 밝히면 본 섹션 업데이트.

---

## 2. 테스트 인프라 (Blocker — 핵심)

현재 `package.json` 에 unit / e2e / contract 테스트 러너가 **하나도** 없다. phase9 qa_tester 는 테스트 실행이 계약이며, phase8 code_reviewer 도 테스트 존재 여부를 확인한다. phase7 coder 가 테스트 코드를 작성하려면 러너 선택이 선행되어야 한다.

| 필요 트랙 | 후보 | 현재 상태 | 결정 필요 |
|---|---|---|---|
| Unit (`src/lib/*`, mask-name 제거 후 → `class-invite-codes.ts`, `parent-link-state.ts`, `rate-limit-parent.ts`) | Vitest (권장, Next.js 16 호환) / Jest | 미설치 | **러너 1종 선택** |
| Component (Toast, Stepper, CodeInput8, StudentPickerCard, DPlusBadge) | @testing-library/react + Vitest (동일 러너 재사용) | 미설치 | 위와 동일 |
| Contract / API route (phase9 에서 `fetch` 기반 스크립트 또는 Vitest 환경으로 route handler 직접 호출) | Vitest + `next-test-api-route-handler` 또는 자체 util | 미설치 | **패턴 결정 필요** (fetch smoke vs 직접 호출) |
| E2E (교사 승인 플로우, 학부모 온보딩 플로우) | Playwright | 미설치 | **도입 여부 선택** (phase9 에서 smoke 매뉴얼로 대체 가능 — scope out 도 합리적) |
| React-email preview (9종 템플릿 시각 검수) | `react-email` CLI | 미설치 | **도입 여부 선택** (템플릿 수동 점검으로 대체 가능) |

**권고 기본안** (사용자 override 가능):
- Vitest + @testing-library/react 채택 (Next.js 16 + React 19 호환 + Turbopack 충돌 적음).
- Playwright 는 본 task scope **out** — phase9 에서 수동 smoke 로 대체.
- react-email CLI 는 본 task scope **out** — phase9 에서 Resend test send 로 시각 확인.

**사용자 결정 필요**: 위 기본안 수용 여부. 수용하면 phase7 coder 가 설치 및 smoke test 1개 작성 포함.

---

## 3. phase3 amendment v1 누적 반영 확인 (Minor)

`phase3_amendment/architecture_amendment.md` (2026-04-13, 마스킹 제거) 가 다음을 미완 체크로 남겨두었다:

```
- [ ] phase2/scope_decision.md (존재 시) — A-12 제거, AC 카운트 29 → 28
- [ ] phase3/api_contract.json (존재 시) — maskedName → name
```

이 2건은 phase7 coder 진입 전에 해소되어야 한다 (API 응답 필드명 기반 코드 생성 시 충돌 가능).

**확인 필요 액션**:
- `phase2/scope_decision.md` 에서 A-12 항목 실제 제거 상태인지 1회 확인.
- `phase3/api_contract.json` 에서 `maskedName` 문자열 grep → 잔존 시 `name` 일괄 교체(본 amendment v2 범위 밖, phase7 coder 가 kickoff 시점에 수행).

---

## 4. resend npm 의존성 설치 (Minor, 1번과 연계)

package.json 현재 의존성에 `resend` 없음. 이메일 9종 구현은 `resend` + `@react-email/components` 등 npm 설치가 선행 조건. phase7 coder 가 설치할 예정이나, 사용자가 Vercel plan 상 outbound email 정책 승인 및 domain 검증을 먼저 완료해야 한다.

**블로킹 정도**: phase7 coder 는 `src/emails/*.tsx` 작성까지는 npm 설치만으로 가능하나, 실제 발송 테스트는 §1 의 `RESEND_API_KEY` + `PARENT_EMAIL_FROM` 세팅 완료 후에만 가능.

---

## 5. 본 amendment 작성 중 발견한 갭 (phase5 ↔ phase3)

본 amendment 의 `architecture.md` / `component_contract.md` 에서 해소한 갭은 다음과 같다. 사용자 조치 불요 — 기록 목적.

1. **Toast 전역 경로** — phase3 §4.1 트리에 Toast 미기재, phase5 §4.2 "미정" 표기. → `architecture.md §1.2`, `component_contract.md §1` 으로 해소.
2. **Stepper 전역 경로** — phase3 가 `src/components/parent/OnboardingStepper.tsx` 로 배치. user_decisions 로 `src/components/ui/Stepper.tsx` 확정. → `architecture.md §1.1` + §5 overlay map.
3. **Toast API (role / aria-live / 44×44 / duration / variant / onClose)** — phase5 미명시, phase6 MAJOR. → `component_contract.md §1.2~§1.6`.
4. **Stepper API (props shape / progressbar ARIA)** — phase5 요소 수준만 명시. → `component_contract.md §2.2~§2.6`.
5. **FilterBar role** — phase5 `role="tablist"` 가 WAI-ARIA 의미 왜곡. → `architecture.md §3` 에서 `role="radiogroup"` 으로 확정.
6. **토큰 patch 적용 타이밍** — phase5 `tokens_patch.json` 은 "phase8 후 doc 갱신"인데 phase7 코드 내 CSS 반영 시점이 불명. → `architecture.md §2.1` 에서 phase7 `src/styles/base.css` 확정, docs 는 phase11.
7. **Display 28 예외** — phase5 가 하드코드 스타일 1회 사용. → `architecture.md §4` 에서 단발 hardcode 명시, 신규 타이포 토큰 생성 안 함.

---

## 6. phase7 kickoff 체크리스트 (사용자용)

phase7 coder 호출 전에 다음을 모두 체크해야 한다:

- [ ] §1 env 변수 전부 세팅 확인 (`RESEND_API_KEY`, `PARENT_EMAIL_FROM`, `PARENT_EMAIL_ENABLED`, `CRON_SECRET`, `AUTH_SECRET` non-fallback, `PARENT_SESSION_SECRET` 분리 결정).
- [ ] §1.1 "RLS rotation key" 해석 확정 (권고 (a) 수용 or 재정의).
- [ ] §2 테스트 러너 결정 (권고 기본안 수용 or 대안).
- [ ] §3 phase3 amendment v1 미완 체크 2건 상태 확인.
- [ ] §4 Resend 도메인 DNS 검증(SPF/DKIM) 완료 (외부 작업, phase7 무관하게 선행 가능).
- [ ] (선택) phase7 coder 프롬프트에 본 amendment v2 경로 전달: `tasks/2026-04-15-parent-class-invite-v2/phase3_amendment_v2/*`.

---

## 7. Top 3 블로커 (요약)

1. **env 변수 세팅 미완** (§1): `RESEND_API_KEY`, `PARENT_EMAIL_FROM`, `CRON_SECRET` 확인/생성, `AUTH_SECRET` fallback 제거. Resend 도메인 검증은 외부 작업.
2. **테스트 러너 미선택** (§2): Vitest + @testing-library/react 권고안 수락/변경. phase9 진입 전 필수.
3. **phase3 amendment v1 미완 체크 2건** (§3): `phase2/scope_decision.md` A-12 제거 + `phase3/api_contract.json` `maskedName`→`name` 교체 실제 완료 확인.
