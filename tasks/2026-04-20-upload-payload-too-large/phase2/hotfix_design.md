# Hotfix Design — upload-payload-too-large

브랜치: `fix/upload-payload-too-large` · 커밋: `b81f5b3`

## 변경 요약

| # | 파일 | 성격 | 역할 |
|---|---|---|---|
| 1 | `src/app/api/upload/upload-policy.ts` | 신규 (pure) | pathname + clientPayload → Blob 토큰 정책 빌더. 테스트 포인트. |
| 2 | `src/app/api/upload/route.ts` | 수정 | JSON 본문 분기에서 `handleUpload` 호출. multipart(레거시) 분기는 무수정 유지. |
| 3 | `src/lib/upload-client.ts` | 신규 (client) | `@vercel/blob/client`의 `upload()` 래퍼. 기존 응답 shape 호환. |
| 4 | `src/components/AddCardModal.tsx` | 수정 | 첨부 업로드 → `uploadFile`. |
| 5 | `src/components/EditCardModal.tsx` | 수정 | 이미지/비디오 교체 업로드 → `uploadFile`. |
| 6 | `src/components/SubmissionModals.tsx` | 수정 | 과제 제출 파일 → `uploadFile`. |
| 7 | `src/components/plant/ObservationEditor.tsx` | 수정 | 관찰 일지 사진 업로드 → `uploadFile`. |
| 8 | `src/app/api/upload/upload-policy.vitest.ts` | 신규 (test) | 9 회귀 케이스. |

## 왜 최소인가 (Karpathy §2·§3)

- **한 가지 문제만 해결한다**: Vercel Functions 요청 본문 4.5MB 한도 우회.
- **레거시 multipart 경로 보존**: route.ts의 기존 formData→put() 코드 블록은 그대로 유지(라인 변동 없음). 새 JSON 분기를 함수 앞에 추가한 형태.
- **호출부 변경은 shape-preserving**: `uploadFile()`는 기존 `/api/upload` 응답과 같은 `{ url, type, name, size, mimeType }`를 반환해 UI 호출부는 `fetch` 호출부만 한 줄씩 교체.
- **스코프 외 접근 안 함**: `/api/student-assets`도 같은 구조적 결함이 있지만 사용자 미보고 + 실사용 영향 미관측 → 이번 핫픽스에서 제외. phase6 follow-up 목록에 남김.
- **추상화 자제**: 파일명 safe-ascii 변환·타임스탬프 접두 등 한 줄씩. 커스텀 큐/재시도 레이어는 만들지 않음.

## 설계 결정 요약

### D1. client-direct upload 패턴

- 서버는 `handleUpload({ body, request, onBeforeGenerateToken, onUploadCompleted })` 를 호출해 **서명된 단기 토큰**을 발급.
- 브라우저는 그 토큰으로 `*.public.blob.vercel-storage.com`에 직접 PUT — Vercel 함수 본문을 통과하지 않음.
- 결과적으로 4.5MB 한도는 Blob 스토리지 상한(5TB)로 대체되며, 프로덕션 한도는 `buildUploadPolicy` 안 `MAX_SIZE = 50MB`가 유일.

### D2. 토큰 발급 단계에서의 방어

| 체크 | 위치 | 강제 |
|---|---|---|
| 인증 | `getCurrentUser()` | 세션 없으면 throw → 500 |
| pathname 접두 | `buildUploadPolicy` | `uploads/...` 한정, 빈 파일명·중첩 디렉터리 거부 |
| MIME 화이트리스트 | `allowedContentTypes` (토큰 바인딩) | Blob 서버가 PUT의 `Content-Type`과 대조해 거부 |
| MIME + 확장자 AND | `isAllowedFileUpload` | 서버 사이드. PDF MIME + .exe 파일명 거부 |
| 크기 상한 | `maximumSizeInBytes` (토큰 바인딩) | Blob 서버 거부 |
| 파일명 충돌 | `addRandomSuffix: true` | Blob이 서픽스 추가 |

### D3. 매직바이트 검증의 손실과 대안

- 기존 multipart 경로에서 서버가 버퍼의 `%PDF-`, `PK\x03\x04`를 검사.
- client-direct에서는 서버가 바이트에 접근하지 않으므로 **이 계층이 사라짐**.
- 대안 방어:
  1. `allowedContentTypes`로 PUT의 Content-Type을 Blob이 검증.
  2. MIME + 확장자 AND 이 토큰 발급 전에 걸림.
  3. Blob은 앱과 **별도 오리진** (`*.public.blob.vercel-storage.com`) → 동일 오리진 XSS로 이어지지 않음.
  4. 파일 kind는 `PutBlobResult.downloadUrl` (쿼리 `?download=1`)을 저장 — 새 탭 렌더 대신 강제 다운로드 → 활성 콘텐츠 실행 위험 억제.
  5. 카드 저장 시 `isAllowedFileUrl` 로 Blob 호스트만 허용 (기존).

현실적 공격 시나리오(MIME 스푸핑 + 저장 XSS)는 3·4가 주 방어선. 손실은 용납 가능 범위로 판단.

### D4. 레거시 multipart 경로 보존

- `BLOB_READ_WRITE_TOKEN`이 없는 로컬 dev에서도 `curl -F file=@x.pdf /api/upload`나 외부 스크립트 연동은 동작해야 함.
- 새 JSON 분기를 route 앞쪽에 추가만 하고, 기존 multipart 블록은 touch 하지 않음 (라인 추가 없음·삭제 없음).

### D5. 응답 shape 호환

- `uploadFile()`는 `{ url, type, name, size, mimeType }` 형태 반환 — 레거시 `/api/upload` multipart 응답과 동일.
- 4개 호출부는 `fetch→res.json`→객체 접근 줄만 `uploadFile()` 한 줄로 교체. 후속 상태 저장·렌더 로직은 **무수정**.

## 검증 체크포인트

1. [x] 회귀 테스트 신규: `src/app/api/upload/upload-policy.vitest.ts` — 9 케이스 PASS
2. [x] 전체 vitest: 11 files · 122 tests PASS
3. [x] `npm run typecheck`: errors 0
4. [x] `next build` (DUMMY DB URL): 정적/동적 라우트 생성 완료
5. [ ] (phase3 검수) `/review` + `/codex`
6. [ ] (phase4 배포) Vercel 프리뷰 → 프로덕션. 5MB/10MB/20MB PDF 업로드 스모크

## 롤백 절차

문제 발생 시:
1. `git revert b81f5b3`
2. `git push origin main`
3. Vercel 자동 재배포. 롤백 후에는 대용량 업로드가 다시 실패(기존 증상 복귀)하지만 이외 경로는 영향 없음.

## 후속 (범위 외 · follow-up)

- `/api/student-assets` 라우트도 같은 구조적 결함. 이번 커밋엔 미포함. 별도 incident/feature 로 처리.
- OneDrive 등에서 여전히 `file.type === ""`인 케이스 — 현재는 client-side `normalizeUploadMime + mimeFromExtension` 으로 역매핑. 이미지/비디오 확장자는 `EXT_TO_CANONICAL_MIME`에 없으므로 `file.type`이 비면 `application/octet-stream` 로 폴백 → 서버에서 토큰 거부. 실제로 OneDrive가 이미지에 빈 type을 주는 케이스가 관측되면 `file-attachment.ts`의 매핑을 확장(별도 task).
