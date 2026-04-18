# Deploy Log — parent-class-invite-v2 · phase10

## 1. Merge 정보

- **Branch merged**: `feature/parent-class-invite-v2-design` → `main`
- **Merge method**: local no-ff merge (solo project — memory `feedback_solo_direct_merge`; no PR)
- **Feature branch tip**: `c6c9...` phase7+8+9 통합 (1 commit, 79 files)
- **Merge commit** on main: `6572e38 Merge feat/parent-class-invite-v2 — class-invite-code onboarding`
- **Pushed**: `bbe6ed9..6572e38  main -> main` (2026-04-15)

충돌 해결 — `src/styles/base.css` 의 `--color-warning*` 2개 토큰과 이전 AB-1 상태색 7토큰이 같은 `:root` 블록을 경쟁. 둘 다 살리는 병합 버전으로 resolved.

## 2. CI / 빌드 결과

| 단계 | 결과 |
|---|---|
| Worktree `npx tsc --noEmit` | ✅ |
| Worktree `npx vitest run` | ✅ 16/16 |
| Worktree `npm run build` | ✅ |
| Main repo `npm install` (post-merge sync — resend, vitest, @testing-library, jsdom, @react-email) | ✅ |
| Main repo `npx prisma generate` | ✅ |
| Main repo `npx tsc --noEmit` | ✅ |
| Main repo `npm run build` | ✅ |
| Vercel build | ✅ Ready |

## 3. 배포 대상

- **Project**: `mallagaenge-1872s-projects/aura-board` (region `icn1`)
- **Deploy URL (latest)**: `https://aura-board-qgp4bqqir-mallagaenge-1872s-projects.vercel.app`
- **Alias 재설정**: `https://aura-board-app.vercel.app → aura-board-qgp4bqqir-...` (Canva 앱 + 기존 학부모 링크 호환)

## 4. DB 마이그레이션

- `20260415_parent_class_invite_v2` 적용 성공 (Supabase ap-northeast-2).
- 백필 UPDATE 2건 정상 실행 — 기존 v1 active ParentChildLink 행이 `status='active'` 로, v1 soft-deleted 행이 `status='revoked'` + `revokedReason='classroom_deleted'` 로 전환됨.
- 이후 `prisma migrate status` → "up to date".

## 5. 프로덕션 검증

| 체크 | 결과 |
|---|---|
| Deploy URL 응답 (401 Vercel SSO = expected for protected prod) | ✅ |
| 신규 API 라우트 빌드 로그 등록 (15개 신규 + 3개 410) | ✅ |
| DB 스키마 드리프트 | ✅ 없음 |
| 기존 v1 parent link 마이그레이션 정상 | ✅ (백필 SQL 확인) |

### Core Web Vitals 회귀 측정
phase9 `perf_baseline.json` 은 `measurement_pending: true`. 본 phase 는 static signal 만 기록:
- SWR 60s 폴링(Inbox only)
- 실시간 구독 없음
- 4축 rate-limit in-memory

실측은 Vercel Speed Insights + 교사 실사용 후 수치 확보 (follow-up).

## 6. 롤백 절차

| 단계 | 명령 |
|---|---|
| UI 롤백 | `git revert 6572e38` → push. ~5분 내 Vercel 재배포. |
| DB 롤백 (데이터 손실) | migration `DROP` 순: ParentChildLink 추가 컬럼 drop + ClassInviteCode drop + enum drop. 승인 이력 / 거절 사유 유실. 30일 backup 필수. |
| 이전 배포 re-promote | `npx vercel promote <이전 URL>`. 직전 안정 배포: `aura-board-k4eutq6nu-...` (AC-12/AC-13 머지 버전). |

## 7. 배포 후 사용자 외부 작업 (phase9 qa_report §3 자동 연결)

다음 env 를 Vercel Production/Preview/Development 에 세팅해야 이메일 발송 + Cron 이 실제 동작:

- `RESEND_API_KEY`
- `PARENT_EMAIL_FROM` (예: `aura-board@mail.your-domain`)
- `PARENT_EMAIL_ENABLED=true` (prod만)
- `CRON_SECRET` (없으면 신규 생성)
- Resend 도메인 SPF/DKIM 검증

env 미세팅 상태에서도 **발송 가드 덕분에 서버 crash 없음** — `dispatchParentNotification` 가 `PARENT_EMAIL_ENABLED !== "true"` 이면 로그 후 ok 반환.

## 8. 판정

**DEPLOY OK** — main 머지 + DB 마이그 + Vercel prod + alias 재설정 완료. phase11 doc_syncer 핸드오프.
