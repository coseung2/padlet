# Codex Cross-Model Review — upload-payload-too-large

검수 대상: `fix/upload-payload-too-large` @ b81f5b3 (핫픽스 최초 커밋)
수행: codex:codex-rescue subagent
결과: **SHIP** (CRITICAL/HIGH 없음)

## Findings

| # | Severity | 요약 | 대응 |
|---|---|---|---|
| F1 | MEDIUM | JSON 분기 에러가 전부 500으로 collapse — 정책 거부도 500이라 UX 퇴행 | **FIX** (af13208) `UploadPolicyError` 도입·route에서 400 매핑 |
| F2 | LOW | 매직바이트 검증 손실. 확인된 stored-XSS/RCE 벡터 없음 (downloadUrl + 별도 오리진으로 억제) | **ACCEPT** — hotfix_design.md §D3에 근거 기록 |
| F3 | LOW | `%2F`·`%5C` 인코딩 separator는 명시적으로 막지 않음 | **FIX** (af13208) 정규식 차단 + 회귀 테스트 추가 |
| F4 | LOW | `SubmissionModals`(SubmitModal/FeedbackModal/GradeModal)의 import 처 부재 — 현재 dead code | **FOLLOW-UP** — Karpathy §3 ("관련 없는 dead code 발견 시 말만") · incident entry에 기록 |
| F5 | NIT | 에러 메시지 plumbing 변화는 payload 한도 우회와 느슨하게만 관련됨 / 통합 테스트 부재 | **ACCEPT** — policy 단위 테스트로 가장 깨지기 쉬운 계약을 잠금. E2E는 Vercel 배포 후 실행 필요 (phase4 스모크) |

## 각 질문에 대한 답

1. **MIME 스푸핑**: 구체적 stored-XSS/RCE 경로 미확인. 방어선으로 Blob 별도 오리진 + `downloadUrl` 강제 다운로드 + MIME/확장자 AND + 토큰 `allowedContentTypes` 바인딩 4중. 손실 가능 범위.
2. **Path traversal**: `../`·중첩 `/`·빈 파일명은 차단. `%2F`·`%5C`는 F3로 추가 차단. Blob은 파일시스템 경로가 아니므로 실질 위험은 낮았음.
3. **Auth**: `getCurrentUser()`는 세션 존재만 확인 — 기존 multipart 경로와 동일 정책 유지. 권한 승격 벡터 없음.
4. **`onUploadCompleted` no-op**: 카드/관찰 일지/과제 제출은 각자 save API에서 `fileUrl`을 저장(fileAllowedUrl 재검증 포함). 현재 설계상 정상. `SubmissionModals`는 dead code (F4).
5. **에러 surfacing**: F1로 수정.
6. **`downloadUrl` vs `isAllowedFileUrl`**: `downloadUrl`은 `*.public.blob.vercel-storage.com/...?download=1` 형태라 기존 호스트·경로 검증 통과.
7. **Dead 레거시 multipart 분기**: BLOB 토큰 미설정 dev·외부 연동 호환 목적. 유지 합의.
8. **Karpathy 감사**: F5 NIT 지적 수용. 다만 변경된 줄은 전부 FUNCTION_PAYLOAD_TOO_LARGE 해결·응답 shape 유지 범위 내. surrounding "개선" 없음.
9. **테스트 커버리지**: 4.5MB 한도 자체는 Vercel 환경에서만 재현 → 단위 테스트는 정책 게이트를 잠그고, E2E는 phase4 스모크(5/10/20MB PDF)로 분리. 타당.
10. **Breaking changes**: `/api/upload` 추가 호출자 grep으로 미발견. JSON 분기가 multipart 분기를 대체하지 않고 병존하므로 외부 multipart 호출도 동작 유지.
