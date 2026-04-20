# QA Log — card-file-attachment

## 자동 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 에러 없음 |
| `npx next build` | ✅ 번들 생성 성공 |
| `npx vitest run src/lib/__tests__/file-attachment.vitest.ts` | ✅ 23 passed |
| 회귀 테스트 (`src/styles/dj-board-layout.vitest.ts`) | ✅ 3 passed (별건 작업의 회귀 방어) |

## 수용 기준 매핑 (scope §3)

- **AC-1** 문서 7종 업로드 → `verifyFileMagic` PDF/ZIP 계열 통과 + HWP·TXT는 MIME+확장자 기반. 단위 테스트 `isAllowedFileUpload` 7종 모두 커버.
- **AC-2** 비허용 MIME 거부 → `/api/upload`가 `isImage/isVideo/isFile` 3개 모두 false 시 400.
- **AC-3** 50MB 초과 400 → `MAX_SIZE` 상수 + 경계 검사 기존 로직 유지.
- **AC-4** `📎 파일` 버튼 노출 + 토글 + 드래그드롭 → `AddCardModal.tsx` 구현.
- **AC-5** 4필드 모두 저장 → `CreateCardSchema` + DB create data + `fileUrl` 존재 시 나머지 3개 필수 가드.
- **AC-6** 6개 레이아웃에서 PDF 렌더 → `CardAttachments` 경로는 `CardBody`와 `CardDetailModal` 공통이므로 freeform(BoardCanvas)·grid·stream·columns·assignment·breakout 모두 동일 렌더.
- **AC-7** 비-PDF 파일 카드 형식 → `CardFileAttachment.FileCard`.
- **AC-8** iOS fallback → `isMobileUA()` + `useMemo`로 클라이언트만.
- **AC-9** 10MB+ 경고 → `LARGE_PDF_WARN_BYTES` + `card-attach-pdf-warning`.
- **AC-10** 회귀 → `CardAttachments` 기존 분기(image/video/link/canva) 무변경, 신규 분기만 추가. 기존 CardBody·CardDetailModal 호출 시그니처에 파일 props 선택적 추가라 호환.

## 수동 QA 체크리스트 (사용자 수행 권장)

(현재 집 밖이라 사용자가 수행 불가능 — 배포 후 집에서 체크)

1. 데스크톱 Chrome 풀스크린에서 `/board/{slug}` 진입 → `+ 카드 추가` → 📎 파일 → PDF 업로드 → 카드에 iframe 인라인 렌더 확인
2. 같은 흐름으로 DOCX 업로드 → 카드에 📄 아이콘 + 파일명 + 크기 + 다운로드 버튼 확인
3. 10MB+ PDF 업로드 → 카드에 경고 배너 + "펼쳐서 보기" 버튼 확인, 클릭 시 iframe 마운트
4. 다운로드 버튼 클릭 → 실제 파일 저장되는지 (Content-Disposition attachment 동작 확인)
5. iOS Safari에서 PDF 카드 → iframe 대신 파일 카드로 fallback 렌더
6. 기존 이미지/동영상 카드 추가 흐름 회귀 없음 (image/video/link 토글 정상)

## 판정

**자동 검증 PASS** — 수동 QA는 프로덕션 배포 후 사용자 세션에서 수행. `QA_OK.marker` 생성.
