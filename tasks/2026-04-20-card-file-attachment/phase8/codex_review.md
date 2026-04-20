# Codex Code Review — card-file-attachment

## 라운드 1 (HIGH 3건 발견)

### H1. 서버가 클라이언트 공급 fileUrl/fileMimeType/fileName 신뢰 (stored-XSS)
- **위치**: `src/app/api/cards/route.ts`, `src/app/api/cards/[id]/route.ts`, `src/components/CardFileAttachment.tsx`
- **문제**: `/api/upload` 우회한 임의 URL(특히 `image/svg+xml` 공개 URL)을 fileUrl로 POST하면 CardFileAttachment가 raw `href`로 사용 → 같은 오리진 Blob 저장소에서 활성 SVG 실행 가능
- **조치**: `src/lib/file-attachment.ts`에 `isAllowedFileUrl()` + `isAllowedStoredMime()` 추가. `/api/cards` POST/PATCH 진입점에서 검증, 문서 MIME 화이트리스트 밖 MIME은 400 거부.

### H2. MIME+확장자 검증이 클라이언트 multipart 메타만 검사 (스푸핑 가능)
- **위치**: `src/app/api/upload/route.ts`, `src/lib/file-attachment.ts::isAllowedFileUpload`
- **문제**: `file.type`과 `file.name`은 공격자가 조작 가능. 악성 HTML을 `.pdf`+`application/pdf`로 위장 업로드 가능
- **조치**: `/api/upload`에 `verifyFileMagic()` 추가. PDF는 `%PDF-` 5바이트, ZIP 계열(DOCX/XLSX/PPTX/HWPX/ZIP)은 `PK\x03\x04` 4바이트 시그니처 검증. 불일치 400.

### H3. 다운로드 CTA가 Blob raw URL 사용 (inline 서빙 → stored-XSS 확산)
- **위치**: `src/components/CardFileAttachment.tsx`, `src/app/api/upload/route.ts`
- **문제**: Vercel Blob은 기본 `Content-Disposition: inline`으로 서빙, `<a href>` 클릭 시 다운로드 아닌 브라우저 렌더 → 위험 MIME 실행
- **조치**: `/api/upload`의 Blob `put()`에 `contentDisposition` 명시. 파일 업로드 경로 한정, **PDF만 inline**(iframe 뷰어 필요), **그 외 문서는 attachment**(강제 다운로드). RFC 6266 필명 인코딩 포함.

## 라운드 2 (fix 적용 후 재검증)

- H1 fix: `isAllowedFileUrl` 하위도메인 스푸핑 방지 확인 (`*.public.blob.vercel-storage.com`은 endsWith 검사로 `attacker.com`이 끝에 붙은 케이스 차단). 테스트 케이스 `"fake.public.blob.vercel-storage.com.evil.com"` 포함.
- H2 fix: PDF 매직바이트 `%PDF-` 1-2바이트 케이스에 대해 `head.length >= 5` 가드. ZIP 시그니처 빈 바이트 배열 예외 처리.
- H3 fix: 이미지·동영상 경로는 변경 없이 기존 동작 유지 (contentDisposition undefined 분기). 파일 경로만 명시 서빙.

## 라운드 2 결과

HIGH/CRITICAL 추가 이슈 없음. 다음 항목은 후속 task 여지 (이번 스코프 OUT):
- MIME 스니핑이 있는 레거시 브라우저에서의 이미지 경로 방어 강화 (현재 이미지 업로드는 기존 정책 유지, 본 task 스코프 밖)
- fileName 길이 255 제한은 Schema로 강제. 추가로 악성 유니코드 RTL override 문자 필터링은 follow-up 여지.

## 판정

**REVIEW_OK** — 라운드 2까지 반영한 diff는 보안/회귀 관점에서 HIGH 이슈 없음. `phase8/REVIEW_OK.marker` 생성.
