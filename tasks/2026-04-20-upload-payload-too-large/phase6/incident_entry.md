# Incident — upload-payload-too-large

| 항목 | 값 |
|---|---|
| 발생 시각 | 2026-04-20T00:00 KST 이전부터 (구조적 결함) · 사용자 체감은 대용량 PDF 업로드 시도 시점 |
| 감지 시각 | 2026-04-20T12:00 KST (사용자 보고: "펑션페이로드 투 라지") |
| 해결 시각 | 2026-04-20T17:51 KST (브라우저 스모크 PASS) |
| severity | high — 핵심 기능(파일 첨부) 불가, 우회 수단 없음 |
| 증상 | 일정 크기 이상 파일(특히 PDF) 업로드 시 브라우저에 `FUNCTION_PAYLOAD_TOO_LARGE` HTML 오류가 그대로 노출되어 첨부 실패 |
| 근본 원인 | Vercel Functions 요청 본문 한도(≈4.5MB)가 `/api/upload` 라우트의 `formData()` 수신 이전 단계에서 페이로드를 리젝트. 라우트 내부 `MAX_SIZE=50MB` 검사 지점에 도달 불가. 플랫폼 구조적 제약이라 라우트 코드로 상향 불가 |
| 수정 내용 | `@vercel/blob/client` **client direct upload** 패턴으로 전환. 서버 `handleUpload`가 토큰을 발급하면 브라우저가 Blob 스토리지에 직접 PUT — Vercel Functions 본문을 경유하지 않음. 정책 게이트(`buildUploadPolicy`)에서 MIME·확장자·pathname·크기 상한을 토큰에 바인딩해 악용 차단. 4개 호출부를 공용 `uploadFile()` 헬퍼로 통일. 레거시 multipart 분기는 `BLOB_READ_WRITE_TOKEN` 없는 dev 호환용으로 유지 |
| 영향 범위 | 카드 첨부(AddCardModal·EditCardModal), 과제 제출(SubmissionModals · 현재 dead code), 식물 관찰 일지(ObservationEditor). 모든 사용자 공통. 데이터 손실·권한 사고 없음 |
| 재발 방지 | 1) 동일 구조의 `/api/student-assets`도 4.5MB 한도 내재 — 후속 task에서 동일 패턴으로 전환 필요. 2) "업로드 엔드포인트의 MAX_SIZE 값이 4.5MB를 초과하면 플랫폼 한도와 불일치" 체크를 PR 리뷰 체크리스트에 추가. 3) Vercel 플랫폼 한도를 넘길 가능성 있는 신규 엔드포인트 설계 시 client-direct 패턴을 기본값으로 |

## 커밋·배포

- 커밋: `b81f5b3` (핫픽스) + `af13208` (Codex 리뷰 반영)
- 머지: main fast-forward · 2026-04-20T17:44 KST
- 배포: Vercel 자동 배포 · 2026-04-20T17:45 KST · 프로브 확인 ≈ 17:50
- 검증: 브라우저 스모크 PASS · 2026-04-20T17:51

## 교훈

### 운영 측

- 사용자 보고 문구("펑션페이로드 투 라지")가 Vercel 플랫폼 에러 HTML 본문과 **문자열 일치** → 플랫폼 레이어 리젝트를 즉시 단정 가능. 비슷한 문구 보이면 함수 본문 한도를 먼저 의심.
- 라우트 내부 로그가 비어 있을 때(=함수가 실행도 안 됨) 플랫폼 리젝트라는 점을 phase1 첫 가설로 삼으면 재현 없이도 신속히 방향 확정 가능.

### 코드 측

- "서버가 바이트를 받는다"가 당연하다고 가정하고 매직바이트 검증을 설계했던 부분(`verifyFileMagic`)이 client-direct 전환으로 무력화됨. 서버 수신을 전제한 보안 검사는 대안 계층(토큰 바인딩 allowlist, 별도 origin, `downloadUrl` 강제 다운로드)으로 대체해야 함.
- 라우트에 하드코딩된 `MAX_SIZE = 50MB`가 실제 플랫폼 한도(4.5MB)보다 훨씬 크게 설정돼 있어 "허용한 적 없는 실패"가 사용자 경험으로 드러남. 엔드포인트 상한은 플랫폼 한도와 명시적으로 정합돼야.
- 레거시 multipart 분기를 "만일의 호환"으로 남기는 결정은 보안 감사 표면을 늘림. 다음 기회에 사용 근거를 재평가할 것.

### 프로세스 측

- 회귀 테스트를 **플랫폼 종속 증상** 대신 **정책 인바리언트**로 잠그는 패턴이 잘 작동했음 (`buildUploadPolicy` unit test). Vercel 함수 본문 한도 자체는 로컬에서 재현 불가하므로, 검증 게이트는 정책 함수의 계약에 둠.
- Codex 리뷰가 MEDIUM(HTTP status 분류) · LOW(encoded separator) 둘 다 실질 가치 있는 지적을 냈음 — 앞으로도 incident phase3에서 `/codex` 병행 유지할 가치 확인.
- phase2 hotfixer 단계에서 dev fallback 제거/보존 판단에 시간이 오래 걸림. 다음엔 먼저 "이 경로의 현재 호출자가 누구인가"를 grep으로 확정한 뒤 설계 결정에 들어가면 더 빠를 것.

## Follow-ups (범위 외)

- [ ] `/api/student-assets` client-direct 전환 (같은 구조적 결함)
- [ ] `src/components/SubmissionModals.tsx` dead code 정리 (import처 0개)
- [ ] `docs/design-system.md` 혹은 runbook에 "업로드 엔드포인트 추가 시 client-direct 기본" 항목 추가
