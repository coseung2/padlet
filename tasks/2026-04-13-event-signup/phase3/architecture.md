# Phase 3 — Architecture (Event-signup)

## Data model delta

### Board (add nullable fields)
```
accessMode               String   @default("classroom")  // "classroom" | "public-link"
accessToken              String?  @unique
eventPosterUrl           String?
applicationStart         DateTime?
applicationEnd           DateTime?
eventStart               DateTime?
eventEnd                 DateTime?
venue                    String?
maxSelections            Int?
videoPolicy              String   @default("optional")   // "none" | "optional" | "required"
videoProviders           String   @default("youtube")    // csv: "youtube,cfstream"
maxVideoDurationSec      Int?
maxVideoSizeMb           Int?
allowTeam                Boolean  @default(false)
maxTeamSize              Int?
customQuestions          String   @default("[]")         // JSON — {id,type,label,required,options?}[]
announceMode             String   @default("private")    // "public-list" | "private-search" | "private"
requireApproval          Boolean  @default(false)
askName                  Boolean  @default(true)
askGradeClass            Boolean  @default(true)
askStudentNumber         Boolean  @default(true)
askContact               Boolean  @default(false)
```

### Submission (relax + extend)
```
userId                   String?                    // was NOT NULL → nullable
submitToken              String?  @unique           // cookie-matched self-auth token
applicantName            String?
applicantGrade           Int?
applicantClass           Int?
applicantNumber          Int?
applicantContact         String?
ipHash                   String?
teamName                 String?
teamMembers              String   @default("[]")    // JSON — {name,grade,class,number}[]
answers                  String   @default("{}")    // JSON — {questionId: value}
videoUrl                 String?
videoProvider            String?                    // "youtube" | "cfstream"
videoId                  String?
videoThumbnail           String?
scoreAvg                 Float?
status                   // already exists; new allowed values: "pending_approval" | "submitted" | "approved" | "rejected"
```
**Remove**: `@@unique([boardId, userId])` — app-level duplicate check for logged-in teachers (by userId) and for public (by submitToken).

### SubmissionReview (new)
```
model SubmissionReview {
  id           String   @id @default(cuid())
  submissionId String
  reviewerId   String
  score        Int
  comment      String   @default("")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewer   User       @relation(fields: [reviewerId], references: [id])

  @@unique([submissionId, reviewerId])
  @@index([submissionId])
  @@index([reviewerId])
}
```
Add backrefs: `Submission.reviews SubmissionReview[]`, `User.reviews SubmissionReview[]`.

### Indexes (perf)
- `Submission(boardId, status)` for review dashboard filter
- `Submission(submitToken)` already unique-indexed
- `Board(accessToken)` already unique-indexed

## Routes

### Pages (App Router)
| Path | Purpose | Auth |
|---|---|---|
| `/board/[id]` | Existing board viewer — add EventSignupBoard branch when `layout==='event-signup'` (teacher view) | NextAuth required |
| `/board/[id]/event/edit` | Teacher event metadata + form builder | NextAuth required |
| `/board/[id]/event/review` | Teacher review dashboard | NextAuth required |
| `/b/[slug]` | **Public** signup entry. Validates `?t=<token>` query param against Board.accessToken. Shows form or closed state. | No auth. |
| `/b/[slug]/my` | **Public** self check. Reads `mt` query or cookie. | No auth. |
| `/b/[slug]/result` | **Public** announcement (mode-dependent). | No auth. |

### APIs
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/event/rotate-token` `{boardId}` | Teacher only. Issue new Board.accessToken, return it. |
| POST | `/api/event/submit` `{boardId, token, payload}` | **Public**. Validate token + throttle + create Submission. Return `{submitToken}` and set cookie. |
| PATCH | `/api/event/my` `{boardId, submitToken, payload}` | **Public**. Update own submission if before applicationEnd and status is editable. |
| GET | `/api/event/my` `?boardId=&submitToken=` | **Public**. Read own submission. |
| POST | `/api/event/review` `{submissionId, score, comment}` | Teacher/reviewer. Upsert SubmissionReview. Recompute scoreAvg. |
| PATCH | `/api/event/submission` `{submissionId, status}` | Teacher. status transitions. |
| POST | `/api/event/video-upload-url` `{boardId, token}` | **Public**. Returns Cloudflare Stream direct_upload URL, or 501 when unconfigured. |
| POST | `/api/event/lookup` `{boardId, name, number}` | **Public**. Private-search announce mode. Returns `{accepted: boolean}` only. |
| POST | `/api/event/qr` `{boardId}` → SVG | Teacher. Generate QR SVG for current accessToken. |

### Middleware / throttling
New util `src/lib/throttle.ts`:
- `throttleSubmit(ipHash, boardId)` — in-memory LRU + DB count check on Submission where `ipHash=` and `createdAt > now-1h`. Returns boolean.
- Graceful: no external Redis dependency (dev mode).

### Security review
- `accessToken`: `nanoid(21)` URL-safe, timing-safe compare via `rbac.tokensEqual` (export if needed).
- `submitToken`: same generator, stored per-Submission.
- Public endpoints: **never trust `userId` from payload**. Always resolve via `submitToken` cookie/param.
- hCaptcha verify: server-side only; siteverify with server secret.
- Cookies: `httpOnly: true, sameSite: 'lax', secure: NODE_ENV==='production'`, key `as_submit_<boardId>`, maxAge 60 days.
- No CORS changes (same-origin only).

## Component tree
```
src/components/event/
  EventSignupBoard.tsx            # teacher dashboard landing (layout === "event-signup")
  EventMetaEditor.tsx             # teacher: poster, dates, venue, selections
  CustomQuestionBuilder.tsx       # JSON form builder (add/remove/reorder fields)
  EventSignupForm.tsx             # PUBLIC client component — renders form from Board + customQuestions
  EventMySubmission.tsx           # PUBLIC /my page
  EventResultView.tsx             # PUBLIC /result — 3 mode switch
  EventReviewDashboard.tsx        # teacher /review — virtualized list + detail
  EventReviewRow.tsx
  EventReviewDrawer.tsx           # individual detail + score
  QrShareCard.tsx                 # SVG QR + copy link + rotate button
```
```
src/lib/event/
  tokens.ts         # issueAccessToken, issueSubmitToken, verifyToken
  youtube.ts        # extractYoutubeId, thumbnailUrl
  cfstream.ts       # createDirectUploadUrl (or null)
  hcaptcha.ts       # verify (or skip)
  throttle.ts       # perBoardPerIp
  customQuestions.ts # zod schema + parser
  announce.ts       # DTO masking per announceMode
```

## Tech choices
- **QR**: server `qrcode.toString('svg')` → inline in page. No client bundle bloat.
- **Virtualization**: CSS `content-visibility: auto` for review rows (no dep).
- **hCaptcha**: react component loaded dynamically when `NEXT_PUBLIC_HCAPTCHA_SITEKEY` present; server verify.
- **Cloudflare Stream**: `fetch` to `https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/stream/direct_upload` with bearer `CF_STREAM_API_TOKEN`. Response includes `{ result: { uploadURL, uid } }`.
- **nanoid**: NOT in deps. Use `crypto.randomBytes(15).toString('base64url')` (21 chars) — no new dep.

## Validation strategy
- All inputs go through zod schemas in `src/lib/event/schemas.ts`.
- Public API routes return `{ error: string, code: string }` JSON with appropriate 4xx.
- Server actions not used (keep as REST for clarity & public access).

## Env vars
```
# Required (existing): DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET
# New (optional):
IP_HASH_SALT                         # required when public submits enabled (fallback = ''+NEXTAUTH_SECRET)
CF_ACCOUNT_ID                        # optional
CF_STREAM_API_TOKEN                  # optional — when absent, /video-upload-url → 501
HCAPTCHA_SECRET                      # optional — when absent, skip captcha
NEXT_PUBLIC_HCAPTCHA_SITEKEY         # optional — client widget shown only when set
```
