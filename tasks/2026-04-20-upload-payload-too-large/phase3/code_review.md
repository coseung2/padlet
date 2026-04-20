# Staff Engineer Review — upload-payload-too-large

검수 대상: `fix/upload-payload-too-large` @ af13208 (Codex 피드백 반영 완료본)
검수자: 오케스트레이터(내부) — gstack `/review` 미설치 대체

## 구조적 정합성

| 항목 | 상태 | 근거 |
|---|---|---|
| 근본 원인 매칭 | PASS | diagnosis.md §3 ⇄ 코드 변경: 함수 본문 한도 우회를 위한 client-direct 전환 |
| 경계 계층 | PASS | `buildUploadPolicy` pure 함수 → `handleUpload(onBeforeGenerateToken)` → `upload()` 클라이언트. 책임 분리 명확 |
| 응답 shape 호환 | PASS | `uploadFile()` 반환 shape이 legacy `/api/upload` multipart 응답과 동일 — 4개 호출부가 기존 `data.url/type/name/size/mimeType` 키를 그대로 사용 |
| 에러 HTTP 분류 | PASS | `UploadPolicyError` → 400, 기타 예외 → 500 (Codex F1 반영) |
| 타입 안전 | PASS | `npm run typecheck` errors 0 |
| 빌드 | PASS | `next build` 성공 (dummy DB env) |
| 테스트 | PASS | `npm run test`: 12 files / 124 tests (upload-policy 11 cases 포함) |

## 보안 감사

| 벡터 | 평가 |
|---|---|
| 대용량 DOS | `maximumSizeInBytes` 토큰 바인딩으로 Blob 서버가 50MB 초과 거부. 함수 밖에서 잘리므로 과금 방어도 됨 |
| MIME 스푸핑 | 토큰 `allowedContentTypes` + 확장자 AND. 매직바이트 손실은 downloadUrl + 별도 오리진으로 보완 |
| Path traversal | `uploads/` 접두 + 단일 파일명 + `%2F`·`%5C` 차단 |
| 인증 우회 | `getCurrentUser()` 선행. 세션 없으면 토큰 발급 불가 |
| Stored XSS | 카드 저장 단계 `isAllowedFileUrl` (Blob 호스트 or `/uploads/`) 재검증 유지 |
| 토큰 오남용 | Blob 토큰 기본 1h 만료 + `addRandomSuffix`로 pathname 고정 불가 → 리플레이 무력 |

## Karpathy 4 원칙 감사

- [x] **§1 가정 명시** — `diagnosis.md`에 근본 원인 + 4.5MB 한도 명시. `hotfix_design.md` §D1~D5에 설계 결정 근거와 대안.
- [x] **§2 Simplicity** — 신규 코드 총 ~310 라인. 추상화 레이어 없음 (pure 함수 1 + 클라 래퍼 1). 추가 유연성/구성 없음.
- [x] **§3 Surgical** — 레거시 multipart 경로는 touch 없음(줄 변동 0). 4개 호출부는 `fetch` 호출 한 블록만 `uploadFile()`로 교체. 인접 코드 리팩터 없음. dead `SubmissionModals`는 **지우지 않음** (§3 규칙대로 말만).
- [x] **§4 Goal-Driven** — 회귀 테스트 11 케이스로 정책 게이트(허용/거부 분기, 우회 차단) 잠금. 버그 자체(4.5MB 한도) 재현은 Vercel 환경 필요 — 단위 테스트는 증상→통과 형태가 아닌 **정책 인바리언트** 잠금 형태. incident 맥락상 수용.

## 수용 판정

- `/review` (staff engineer): **PASS**
- `/codex` (cross-model): **SHIP** (MEDIUM·LOW 지적 전원 FIX 또는 FOLLOW-UP으로 처리)
- Karpathy 4 원칙: **PASS**

→ `REVIEW_OK.marker` touch 조건 충족.
