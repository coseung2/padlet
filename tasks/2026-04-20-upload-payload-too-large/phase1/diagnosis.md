# Diagnosis — upload-payload-too-large

## 1. 재현 절차

1. 로그인 상태에서 보드의 `+ 카드 추가`(AddCardModal) 또는 카드 편집(EditCardModal) 열기.
2. 파일 첨부 입력으로 **~4.5MB를 넘는 PDF**(예: 수업 자료 5~10MB PDF) 선택.
3. 업로드 진행 → 실패 토스트/메시지에 `FUNCTION_PAYLOAD_TOO_LARGE` 노출.
4. 브라우저 DevTools Network 탭에서 `POST /api/upload` 응답이 **413** + HTML body + 헤더 `x-vercel-error: FUNCTION_PAYLOAD_TOO_LARGE`. 서버 로그(`[upload reject] ...`)에는 아무 흔적도 없음 (라우트가 실행되지 않았음을 확증).

(로컬 `npm run dev`는 Next dev 서버라 이 한도를 걸지 않으므로 **로컬에서는 재현되지 않음**. Vercel 프로덕션·프리뷰 환경에서만 재현. 이는 라우트 코드가 아닌 플랫폼 경로임을 역으로 증명한다.)

## 2. 증상 범위

- **영향 받는 사용자/세션**: 모든 사용자 (교사·학생 공통). 권한·세션 상태와 무관.
- **영향 받는 기능**:
  - 카드 추가·편집 첨부(이미지/동영상/문서 공통, 4.5MB 초과 파일 전부).
  - 과제 제출 첨부 (`SubmissionModals`).
  - 식물 관찰 일지 사진 업로드 (`ObservationEditor`).
  - `/api/student-assets`도 구조상 동일 패턴(50MB cap). 다만 이쪽은 캔버스 플래튼 PNG라 통상 < 4.5MB → 실사용에서 관측되지 않았을 가능성.
- **시작 시점**: 해당 코드 경로는 `c9a6600 feat(card-file-attachment)` 이후 계속 유지되어 온 구조적 한계. 실제 사용자 인지는 2026-04-20 대용량 PDF 업로드 시도에서 드러남.

## 3. 근본 원인

**Vercel Functions 요청 본문 한도(4.5MB)와 충돌하는 서버 중계 업로드 구조.**

- 경로: 브라우저가 `fetch("/api/upload", { body: FormData })`로 **multipart 본문 전체**를 함수로 전송.
- 함수 `src/app/api/upload/route.ts:53`의 `await req.formData()` 이전에, Vercel 엣지/런타임이 4.5MB 초과 본문을 리젝트하고 HTML 413 응답을 돌려준다.
- 라우트 내부의 `MAX_SIZE = 50MB`(line 11), `ALLOWED_*`, `verifyFileMagic`, Blob `put` 전 과정은 도달하지 못한다.
- 왜: Vercel 서버리스 함수는 플랫폼 한도상 모든 플랜에서 요청 본문 4.5MB 제한이 있으며, 라우트 코드로 이 한도를 올릴 수 없다.
- 언제부터: 구조는 `1ac0b38 feat(multi-attachment)` 이전(최초 단일 첨부 시점)부터. 증상은 사용자가 큰 PDF를 시도한 순간 표면화.

회귀 커밋은 없음 — 신규 증상이 아니라 이미 있던 제약이 드러난 **구조적 결함**.

## 4. 증거 목록

| # | 파일 | 요약 |
|---|---|---|
| 1 | `evidence/code_upload_route.md` | `/api/upload` 라우트가 `formData()` + `arrayBuffer()`로 전체 본문 수신 구조 |
| 2 | `evidence/client_error_handling.md` | 클라이언트가 Vercel HTML 413 본문을 그대로 `reason`에 담아 노출 |
| 3 | `evidence/vercel_platform_limit.md` | Vercel Functions 요청 본문 4.5MB 한도, 공식 권장 대안: client direct upload |

세 소스 교차 검증:
- **코드 경로**: 증거 1·2에서 실행 경로 직독 확인.
- **플랫폼 문서**: 증거 3에서 한도·에러 이름·권장 해법 확인.
- **사용자 재현**: triage.md의 보고 문구(`"펑션페이로드 투 라지"`)가 증거 2의 HTML 본문 원문과 문자열 일치.

## 5. 수정 방향 (제안만)

**Vercel Blob client-direct-upload 패턴으로 전환** — 함수 요청 본문 한도를 우회.

### 제안 경로 (phase2에서 확정·구현)

1. **서버**: `src/app/api/upload/route.ts`를 `handleUpload({ request, onBeforeGenerateToken, onUploadCompleted })` 기반으로 재작성.
   - `onBeforeGenerateToken`:
     - 기존 `getCurrentUser()` 인증 유지.
     - 파일명/확장자 기반 MIME 정상화 + 화이트리스트(`ALLOWED_IMAGE/VIDEO`, `ALLOWED_FILE_MIMES`)로 **토큰 발급 단계에서 MIME/확장자 선검증**.
     - 최대 크기·파일 수 제한은 `tokenPayload` + `allowedContentTypes` + `maximumSizeInBytes` 옵션으로 바인딩.
     - 응답 `Content-Disposition`(attachment)·최종 경로 접두(`uploads/`)·`addRandomSuffix` 정책을 이 단계에서 고정.
   - `onUploadCompleted`:
     - Blob 저장이 끝난 **후** 서버 콜백에서 URL·pathname·contentType 수신. 필요 시 DB 기록(현재는 카드 저장 단계에서 fileUrl을 받기만 하므로 선택 적용).
     - **매직바이트 검증은 client-direct 구조에서는 서버 사이드로 미룰 수 없다**(서버가 바이트 접근을 하지 않음). 대신 현재 `isAllowedFileUrl`(Blob 호스트 한정) + MIME/확장자 화이트리스트 + Blob의 `addRandomSuffix` + `contentDisposition: attachment` + 업로드 시 contentType 고정으로 stored-XSS 공격 표면을 유지/축소. (phase2 설계에서 손실·득실 검토 후 명시)

2. **클라이언트**: 4개 호출부(`AddCardModal`, `EditCardModal`, `SubmissionModals`, `plant/ObservationEditor`)에서
   `fetch("/api/upload", { body: FormData })`
   →
   `upload(filename, file, { access: "public", handleUploadUrl: "/api/upload", clientPayload: ... })`
   로 교체. 반환된 `{ url, pathname, contentType }` 로 기존 `{ url, type, name, size, mimeType }` 형태에 **얇은 어댑터 레이어** 유지 (UI 코드 변경 최소화).

3. **`/api/student-assets`**: 동일 구조적 결함이 있지만 실사용 영향 미관측. 이번 핫픽스에서는 **수정 범위 제외**(별도 후속 incident/feature). `BLOCKERS.md` 또는 이번 task의 `TODO_followup.md`에 기록만.

4. **호환·관측**:
   - 업로드 성공 경로의 기존 검증(서버 화이트리스트 + 카드 생성 시 `isAllowedFileUrl`)은 유지.
   - 로컬 개발에서 `BLOB_READ_WRITE_TOKEN` 미설정 분기는 제거 대상 후보 — client-direct는 토큰 필수. 대체 경로(공용 `public/uploads/` fallback)를 남길지 버릴지 phase2에서 결정.
   - 에러 표시: 413 플랫폼 응답 자체가 사라져야 하지만, 혹시 남아 있을 상한 초과(`maximumSizeInBytes` 초과)는 Blob 클라이언트가 JSON 에러를 돌려주므로 기존 `reason` 파싱 경로에 자연스럽게 합류.

phase2는 이 방향을 **단일 옵션**으로 설계·구현. 평면 multipart 한도 상향은 Vercel에 없으므로 대안 검토 불필요.
