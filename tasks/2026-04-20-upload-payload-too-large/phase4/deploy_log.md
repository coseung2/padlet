# Hotfix Deploy — upload-payload-too-large

## 1. PR/머지 정보

- 브랜치: `fix/upload-payload-too-large`
- PR: 없음 (solo 프로젝트 · main 직접 push 합의)
- 커밋:
  - `b81f5b3` fix: FUNCTION_PAYLOAD_TOO_LARGE on PDF upload
  - `af13208` fix: map upload-policy rejects to HTTP 400 + block encoded path separators
- main fast-forward 머지: 2026-04-20T17:44 KST (b8ef068 → af13208, 18 files · +1225 / −65)
- origin/main push: 2026-04-20T17:45 KST — `b8ef068..af13208  main -> main`

## 2. 배포 파이프라인

- CI: 없음 (repo에 `.github/workflows/` 부재). Vercel GitHub 통합이 단일 배포 경로.
- 빌드 트리거: main push에 의한 Vercel 자동 배포.
- 배포 ID: Vercel dashboard 참조 (CLI 미설치 · 프로브로 확인). 배포 전파 체감 시간 ≈ 3분.

## 3. 프로덕션 검증

### (a) 배포 전파 확인 (API 프로브)

- 프로덕션 URL: https://aura-board-app.vercel.app
- `/api/upload` 무인증 POST 시 구버전은 고정 문자열 `"Upload failed"`를 반환. 신버전(af13208)은 `getCurrentUser()`의 throw 메시지(`"Unauthenticated"`)를 그대로 반환.

```
$ curl -s -X POST -H 'Content-Type: application/json' -d '{}' \
    https://aura-board-app.vercel.app/api/upload
{"error":"Unauthenticated"}   # HTTP 500
```

→ **af13208 전파 확정**. 레거시 multipart 브랜치도 유지됨(동일 응답).

### (b) 재현 절차 확인 (브라우저 UI · 사람이 필요)

`phase1/diagnosis.md §1` 재현 절차의 자동화는 불가(로그인 + 파일 선택 필요). 아래 스모크는 **실사용자(운영자)** 수행 필요. 완료 후 phase5 canary_report에 기록.

스모크 체크리스트:
- [ ] 교사 세션으로 보드 → `+ 카드 추가` 모달에서 5~10MB PDF 업로드 → 성공(카드에 첨부 프리뷰 표시)
- [ ] 20~40MB PDF 업로드 → 성공
- [ ] 60MB PDF 업로드 → 서버 정책 거부(400) 메시지 노출 ("파일이 너무 큽니다" 또는 Blob `maximumSizeInBytes` 초과 메시지)
- [ ] 확장자 위조(`evil.exe`를 PDF 버튼으로) → 400 거부 (MIME+확장자 AND 차단 확인)
- [ ] 네트워크 탭: `POST /api/upload` 응답이 JSON(client-token). 브라우저가 `*.public.blob.vercel-storage.com` 으로 별도 PUT을 수행하는지 확인
- [ ] 학생 세션으로 `SubmissionModals`/식물 관찰 일지 이미지 업로드 → 성공

### (c) 핵심 페이지 헬스

- `GET /` → HTTP 307 → `/login` (기대값, 로그인 필요)
- Vercel `X-Vercel-Id` 헤더 수신 → 에지 도달 정상

### (d) 초기 모니터링 (첫 5분)

- `/api/upload` 500 "Unauthenticated" 응답만 관찰됨 (내 프로브) — 정상 동작.
- 사용자 측 에러 보고: 아직 없음 (배포 직후).
- 실제 에러율 지표는 Vercel Analytics/Logs 대시보드에서 phase5에서 관찰.

## 4. 롤백 절차

### 조건

다음 중 하나라도 충족 시 즉시 롤백:
- 업로드 성공률이 배포 전 대비 20%p 이상 하락
- `/api/upload` 5xx 비율이 배포 전 평균의 3배 초과
- 사용자 "다른 파일도 업로드 안 됨" 보고 2건 이상
- Blob 토큰 누수·XSS 재현 보고 (즉시)

### 명령 (어느 쪽이든 가능)

**(A) 로컬 revert → push (표준)**
```bash
git checkout main
git pull --ff-only origin main
git revert --no-edit af13208 b81f5b3
git push origin main
# → Vercel 재빌드 → 기존 코드로 복귀 (대용량 업로드는 다시 실패 = 기존 증상)
```

**(B) Vercel 대시보드 Instant Rollback**
- Deployments → 이전 배포(b8ef068 대응) → `Promote to Production`
- 소스 커밋 히스토리는 그대로. 재push 없이 1클릭 복귀.

### 파급 영향

- 롤백 시 대용량 PDF 업로드는 `FUNCTION_PAYLOAD_TOO_LARGE`로 다시 실패.
- 이외 경로(카드 작성, 작은 이미지 업로드, 전체 UI)는 영향 없음.
- DB 스키마 변경 없음 → 데이터 마이그레이션 롤백 절차 불필요.
