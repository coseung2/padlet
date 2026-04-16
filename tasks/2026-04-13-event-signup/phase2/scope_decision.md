# Phase 2 — Scope Decision (Event-signup)

**task_id**: 2026-04-13-event-signup
**slug**: event-signup
**branch**: feat/event-signup
**change_type**: feature_major (schema + multi-route UI + public endpoints)

## In-scope (ES-1 ~ ES-11)
1. **ES-1** Prisma schema additions — Board event-signup fields + accessMode/accessToken + Submission applicant/video/review fields + new `SubmissionReview` model.
2. **ES-2** `Board.layout = "event-signup"` renderer + teacher create/edit page for event metadata.
3. **ES-3** Custom question form builder (JSON) + runtime renderer.
4. **ES-4** QR generation (server-rendered SVG) + accessToken rotation endpoint.
5. **ES-5** Public signup page `/b/[slug]?t=[token]` (no login) + `my` page with `mt` cookie token.
6. **ES-6** YouTube link path — URL validation + thumbnail derivation.
7. **ES-7** Cloudflare Stream signed upload URL endpoint (graceful 501 when env absent).
8. **ES-8** Teacher review dashboard + approval workflow (`pending_approval` → `submitted`).
9. **ES-9** `SubmissionReview` model + multi-reviewer aggregation (scoreAvg).
10. **ES-10** Result announcement modes: `public-list` | `private-search` | `private`.
11. **ES-11** Spam defense — ipHash throttle (1h/5) + hCaptcha graceful.

## Out-of-scope (explicit defer)
- ES-12 team signup advanced UX (schema fields included, minimal UI)
- ES-13 voting
- ES-14 timetable
- ES-15 Canva autofill posters (use `eventPosterUrl` field only)

## Acceptance criteria (verified in phase9)
- [ ] AC1: 교사가 새 보드 → layout "event-signup" → 폼/포스터/일정/선발인원 설정 → 게시 시 QR + 공개 링크 자동 생성
- [ ] AC2: 학생이 QR 스캔 → 로그인 없이 보드 접근 → 신청폼 작성 → 제출 → 확인 토큰(쿠키) 저장
- [ ] AC3: 확인 토큰으로 `/b/[slug]/my?mt=[token]` 본인 제출 상태 조회/수정 작동 (마감 전)
- [ ] AC4: 교사가 토큰 재발급 시 이전 `accessToken`은 무효 → 기존 QR 접근 시 404
- [ ] AC5: 교사 심사 리스트: 100건+ 대비 가상화 + 개별 상세 + 상태 변경(pending_approval / submitted / rejected)
- [ ] AC6: 승인 필요 모드 ON 시 신규 제출은 `pending_approval` → 교사 승인 전 공개 명단 미노출
- [ ] AC7: ipHash + 쿠키 throttling — 1시간 내 5건 초과 시 429
- [ ] AC8: 공개 명단 모드는 합격자 이름만, 비공개 검색은 이름+학번 일치 시에만 결과 노출, 비공개는 결과 UI 숨김
- [ ] AC9: Cloudflare Stream 환경변수 존재 시 영상 업로드 URL 발급, 없으면 YouTube 링크만 허용
- [ ] AC10: 갤럭시 탭 S6 Lite Chrome에서 신청폼 TTI < 2s, 제출 flow 성공
- [ ] AC11: `npx tsc --noEmit` + `npm run build` PASS
- [ ] AC12: 기존 assignment/freeform/quiz/plant 보드 레이아웃은 회귀 없음

## Risks & mitigations
| ID | Risk | Mitigation |
|---|---|---|
| RS-1 (privacy) | 공개 명단에서 연락처/이메일 노출 | DTO에서 명시적으로 제외, 테스트로 검증 |
| RS-2 (spam) | 무제한 공개 신청 → 서비스 남용 | ipHash+cookie 1h/5 throttle + 옵션 hCaptcha |
| RS-3 (migration) | `Submission.userId` NOT NULL → NULLABLE 변환이 Supabase에서 실패 | ALTER DROP NOT NULL은 postgres non-destructive. Prisma `db push`로 반영. `@@unique([boardId,userId])` 제약 제거(partial unique 불가). 앱 레벨 중복 체크로 대체. |
| RS-4 (회귀) | 기존 assignment 보드가 같은 Submission 테이블 사용 | 모든 쿼리에 board.layout 조건 추가, 기존 API는 userId NOT NULL 가정 제거 |
| RS-5 (CF Stream) | 환경변수 없을 때 500 | 라우트 시작에서 env 체크 → 501 응답 |
| RS-6 (토큰 노출) | 링크가 카카오톡 등에서 누출 | 교사 수동 회전(AC4) + (옵션) 행사 종료 후 만료 |
| RS-7 (JSON injection) | customQuestions 악성 JSON | zod 스키마로 구조 검증, 렌더 시 허용 타입만 |
| RS-8 (타임존) | applicationStart/End 한국 시간 혼동 | DB는 UTC 저장, UI는 Asia/Seoul 포맷 강제 |
| RS-9 (성능) | 100건+ 리스트 렌더 느림 | `content-visibility:auto` + pagination(page=50) |

## Migration strategy
1. `prisma db push` (non-destructive) — new columns + new `SubmissionReview` 테이블 추가
2. `Submission.userId` NOT NULL → NULLABLE: Prisma가 `ALTER COLUMN DROP NOT NULL` 생성 (Supabase 반영 안전)
3. `@@unique([boardId, userId])` 제거: `ALTER TABLE DROP CONSTRAINT` — 비파괴
4. 시드 불필요(기능 테스트는 수동 QA)
5. 롤백 시나리오: 새 필드는 null 허용이라 스키마만 revert + `prisma db push` 재실행 (데이터 손실 없음, unique 제약 복구만 주의)

## Change summary (for phase3 input)
- schema.prisma: +20 필드 (Board), +10 필드 (Submission), +1 모델 (SubmissionReview)
- new routes: `/b/[slug]`, `/b/[slug]/my`, `/board/[id]/review`, `/api/event/*` (4개)
- new components: EventSignupBoard, EventSignupForm, CustomQuestionBuilder, ReviewPanel
- design tokens: 기존 재사용 + AC 위해 추가 없음
