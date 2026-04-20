# Coder Log — card-file-attachment

## 변경 파일

### DB
- `prisma/schema.prisma` — Card 모델에 `fileUrl/fileName/fileSize/fileMimeType` 4개 nullable 추가
- `prisma/migrations/20260420_add_card_file_attachment/migration.sql` — ALTER TABLE ADD COLUMN 4개

### 공용 유틸 (신규)
- `src/lib/file-attachment.ts` — 7종 MIME 화이트리스트·확장자 검증·아이콘 매핑·크기 포맷·UA 감지·fileUrl 출처 화이트리스트

### 서버 (API)
- `src/app/api/upload/route.ts` — 문서 MIME 추가 허용 + **매직바이트 검증**(PDF·ZIP 계열) + **Content-Disposition** inline/attachment 분기 + 응답에 `name/size/mimeType` 추가
- `src/app/api/cards/route.ts` (POST) — Schema + DB 쓰기에 4필드 추가, **isAllowedFileUrl + isAllowedStoredMime** 검증 (codex security 반영), 4필드 일관성 가드
- `src/app/api/cards/[id]/route.ts` (PATCH) — 동일 검증
- `src/app/api/boards/[id]/stream/route.ts` — SSE `CardWire` + 매퍼에 4필드 추가
- `src/app/board/[id]/page.tsx` — `cardProps` 매퍼에 4필드 추가

### 클라이언트 (UI)
- `src/components/DraggableCard.tsx` — `CardData` 타입에 4필드 optional
- `src/components/CardAttachments.tsx` — props 확장 + `<CardFileAttachment>` 분기 렌더
- `src/components/CardFileAttachment.tsx` (신규) — PDF iframe / iOS fallback / 10MB+ 경고+접이식 / 비-PDF 파일 카드
- `src/components/cards/CardBody.tsx` — props 전달
- `src/components/cards/CardDetailModal.tsx` — hasMedia + props 전달
- `src/components/AddCardModal.tsx` — 📎 파일 버튼 + 섹션 + 상태 + 업로드 핸들러 확장

### 스타일
- `src/styles/card.css` — `.card-attach-file` · `.card-attach-pdf` · `.card-attach-pdf-large` · 경고 배너 · 확장 버튼
- `src/styles/modal.css` — `.modal-file-preview-file` · `.modal-file-drop-hint`

### 테스트
- `src/lib/__tests__/file-attachment.vitest.ts` — 23개 케이스 (MIME 매칭, 스푸핑 거부, URL 화이트리스트, 활성콘텐츠 MIME 거부 포함)

## 검증

- `npx tsc --noEmit` — ✅ 에러 없음
- `npx vitest run src/lib/__tests__/file-attachment.vitest.ts` — ✅ 23 passed
- `npx next build` — ✅ (prisma migrate deploy는 Vercel 빌드에서 실행)

## codex 리뷰 대응 (phase8 참조)

1회차에서 HIGH 3건 지적:
- **HIGH1** fileUrl/fileMimeType 클라이언트 신뢰 → `isAllowedFileUrl` + `isAllowedStoredMime` 서버 검증 추가
- **HIGH2** MIME+확장자 메타만 검증 → PDF/ZIP 계열 **매직바이트** 검증 추가
- **HIGH3** inline 기본 서빙으로 stored-XSS 위험 → 파일 경로는 **attachment** 기본, PDF만 inline

2회차 codex 재리뷰는 phase8에서 실시.
