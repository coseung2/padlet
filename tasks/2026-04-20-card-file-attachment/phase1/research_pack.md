# Research Pack — card-file-attachment

## 1. 기준 제품 관찰

### (a) Padlet 공식 (padlet.com)
카드 추가 시 "파일" 버튼이 이미지/링크/YouTube와 독립적으로 노출. 업로드 후 카드에 파일 아이콘·원본 이름·다운로드 버튼이 표시되고 PDF는 카드 본문에 내장 뷰어(iframe 기반)로 미리보기. 이미지/비디오는 자동 썸네일, 문서는 `mimeType`별 아이콘 매핑.

### (b) Notion 블록
파일 블록은 업로드/임베드 두 모드 제공. PDF 블록은 인라인 뷰어를 기본 탑재하고 전체화면 버튼으로 확대. Notion은 `<iframe>` + 브라우저 내장 PDF 뷰어(`application/pdf` Content-Disposition=inline) 조합.

### (c) Google Classroom 게시물 첨부
파일은 Drive에 업로드되고 카드에는 "파일명 + Drive 아이콘 + 클릭 시 새 탭"만 표시. 인라인 미리보기는 없음 — 대신 Drive에서 열림. 단순 저장소 연결 모델.

## 2. UX 패턴 비교

| 항목 | Padlet | Notion | Classroom |
|---|---|---|---|
| 업로드 UI | 버튼+드래그드롭 | 버튼+드래그드롭 | 버튼만 |
| PDF 인라인 | O (iframe) | O (iframe) | X |
| 파일 아이콘 | mime별 세분화 | 확장자 기반 | Drive 단일 |
| 다운로드 버튼 | O | O (⋯ 메뉴) | X (새 탭만) |

## 3. 핵심 패턴 결정 근거

- **기존 AddCardModal 패턴 재사용**: 이미지·동영상 버튼이 이미 `modal-attach-btn`로 토글 → 섹션 노출 → 드래그드롭 존/버튼 → 업로드 구조. "📎 파일"도 같은 패턴으로 정렬하면 학습 비용 0.
- **PDF 인라인은 `<iframe src="...#view=FitH">`**: 외부 라이브러리(PDF.js) 불필요. Vercel Blob은 `content-disposition: inline; content-type: application/pdf`로 서빙되며 모든 주요 브라우저의 내장 뷰어가 렌더. 번들 증가 0.
- **비-PDF 문서는 파일명+아이콘+다운로드**: DOCX/XLSX/PPTX/HWP는 브라우저가 직접 렌더 못 함. Padlet도 이 경우 다운로드만. Google Viewer 임베드는 CORS/공유 이슈로 제외.

## 4. 트레이드오프

### PDF.js 번들 대신 `<iframe>`
- 장점: 번들 0, 구현 단순, 브라우저 UX 재사용 (찾기/페이지 이동/인쇄)
- 단점: Chrome/Firefox/Safari 기본 PDF 뷰어 UI가 제각각, iOS Safari에서 내장 뷰어가 `<iframe>`에서 작동 안 하는 경우 있음 → **fallback: iOS/모바일 UA는 자동으로 "다운로드" 버튼만 노출**

### 50MB 허용 vs 인라인 성능
- 50MB PDF 인라인 렌더는 수 초 걸림. UX 리스크 → **경고 배너("파일이 커서 로딩이 느릴 수 있어요")** 10MB 초과 시 표시.

### 문서 MIME 세트
PDF/DOCX/XLSX/PPTX/HWP/TXT/ZIP 7종. 레거시 DOC/XLS는 활용도 낮아 제외 (후속 task 여지).

## 5. 참조

- padlet.com 공개 보드 "파일" 첨부 UI (스크린샷 없이 UX 패턴만 참조)
- Notion file block 문서: https://www.notion.so/help/embed-and-connect-other-apps
- Vercel Blob content-disposition: https://vercel.com/docs/storage/vercel-blob
- MIME 레지스트리 (IANA): pdf/msword/vnd.ms-excel 등
