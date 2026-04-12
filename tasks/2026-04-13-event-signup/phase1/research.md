# Phase 1 — Research (Event-signup)

## A. 경쟁/유사 UX 패턴 요약
| 플랫폼 | 공개 신청 | 폼 커스터마이징 | 심사 | 영상 | 스팸 방어 |
|---|---|---|---|---|---|
| Google Forms | 링크 + 로그인 선택 | 섹션/분기 | 없음 | Drive 링크 | reCAPTCHA 옵션 |
| Padlet | 링크 공개 보드 | 제한적 | 댓글로만 | YouTube 임베드 | 모더레이션 |
| Typeform | 링크 | 풍부 | 없음 | 외부 | 없음 |
| Submittable | 로그인 필요 | 폼 빌더 | 협업 심사 | 업로드 | — |
| **Aura-board 목표** | QR + 토큰 링크 | JSON 기반 custom questions | reviewer 점수+평균 | YouTube / CF Stream | ipHash + hCaptcha |

## B. 핵심 기술 결정 포인트
1. **공개 신청 인증** — NextAuth 세션 없이 작동하는 엔드포인트 필요. URL `?t=<accessToken>` + 보드 `accessMode="public-link"` 조건으로만 열림.
2. **신원 식별(로그인 없음)** — 쿠키 `as_submit_token_<boardId>` 에 랜덤 UUID v4 저장. 서버는 `Submission.submitToken` 필드(이미 명시된 "my 조회" 토큰)와 매핑.
3. **토큰 회전** — 교사가 `POST /api/boards/[id]/rotate-token` 호출 시 새 `nanoid(21)` 생성 → 이전 QR은 즉시 404. `Board.accessToken @unique`.
4. **ipHash** — `crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT).digest('hex')`. raw IP 저장 금지.
5. **QR 렌더** — 기존 `qrcode` 패키지 재사용 (classroom QR에 이미 쓰임). 서버에서 SVG 문자열 생성 → 클라이언트 inline.
6. **가상화** — 100건+ 리스트에 `react-virtual` 또는 CSS `content-visibility: auto`. 의존성 추가 없이 후자 우선.
7. **영상 업로드** — Cloudflare Stream `direct_upload` API: POST `https://api.cloudflare.com/client/v4/accounts/{acc}/stream/direct_upload` with Bearer token → `{ uploadURL, uid }`. 클라이언트는 tus/multipart로 직업로드. ENV 없으면 501.
8. **YouTube ID 추출** — `https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})` 패턴. 썸네일 `https://i.ytimg.com/vi/{id}/hqdefault.jpg`.
9. **hCaptcha graceful degrade** — `HCAPTCHA_SECRET` 미설정 시 skip. 설정 시 `h-captcha-response` 필수 & `POST https://hcaptcha.com/siteverify`.

## C. 기존 자산 재사용
| 자산 | 경로 | 재사용 방식 |
|---|---|---|
| `tokensEqual` timing-safe compare | `src/lib/rbac.ts` | Board accessToken + Submission submitToken 비교 |
| `Section.accessToken` rotation pattern | 위 파일 + `SectionShareClient.tsx` | 동일 패턴을 Board 레벨로 승격 |
| `qrcode` 패키지 + `QRPrintSheet` | `src/components/QRPrintSheet.tsx` | Board QR에도 동일 SVG 렌더 활용 |
| Prisma `db.ts` singleton | `src/lib/db.ts` | 그대로 |
| auth helpers `auth()` / `authConfig` | `src/lib/auth.ts` | 교사 화면만 보호, 공개 라우트는 auth 생략 |

## D. 위험 신호
- R1: `Submission` 모델은 `@@unique([boardId, userId])`. public 신청은 userId가 null → unique 제약 해제 필요 (중요 migration). `userId: String?`로 바꾸고 unique를 (boardId, userId) where userId not null partial index로 변환 — Prisma 미지원 → 제약 제거 + 앱 레벨 검사.
- R2: 기존 assignment 제출 데이터와 event-signup 제출 데이터가 같은 테이블에 섞임 → 쿼리 시 `board.layout` 조건 필수.
- R3: Cloudflare Stream 직업로드 URL은 CORS preflight가 민감. 브라우저 업로드 시 `Access-Control-Allow-Origin: *` 반환하는지 검증 필요(실제 API는 허용함, 문서 확인됨).
- R4: Next.js 16 RSC + `cookies()` 는 async. 서버 컴포넌트에서 `await cookies()` 패턴 준수.
- R5: 교사 폼 빌더 JSON의 유효성 검증 — zod 스키마 필수. 악성 JSON으로 렌더 크래시 방지.

## E. 결론 (phase2로 넘길 권고)
- 스키마 변경은 추가형(nullable)으로 안전 — `prisma db push`로 Supabase 반영 가능.
- `Submission.userId`를 NOT NULL → NULLABLE로 변경하는 것은 Postgres에서는 비파괴 연산(ALTER COLUMN DROP NOT NULL). 데이터 손실 없음.
- Cloudflare Stream은 optional path. 1차 배포는 YouTube만 확실히 작동시키고 CF는 wire-up까지만.
