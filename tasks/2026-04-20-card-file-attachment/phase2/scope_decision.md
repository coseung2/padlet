# Scope Decision — card-file-attachment

## 1. 선택한 UX 패턴

`ux_patterns.json`의 4개 패턴을 **모두 채택**한다. 각각이 직교 관심사로, 하나라도 빠지면 feature가 성립하지 않음.

- `modal-attach-toggle-section` — UI entry point (research_pack §3 "기존 패턴 재사용 → 학습 비용 0")
- `dropzone-with-picker` — 입력 메커니즘 (기존 이미지/동영상 섹션 동일 구조)
- `pdf-iframe-inline-viewer` — PDF 뷰어 (research_pack §3 "번들 증가 0, 브라우저 내장 UX 재사용")
- `non-pdf-file-card` — 비-PDF 렌더링 (research_pack §4 "Google Viewer 임베드는 CORS 이슈로 제외")

## 2. MVP 범위

### 포함 (IN)
- **DB 스키마**: `Card` 모델에 `fileUrl`, `fileName`, `fileSize`, `fileMimeType` 4개 nullable 컬럼 추가 (migration)
- **업로드 API** (`/api/upload`): 문서 MIME 7종 (PDF/DOCX/XLSX/PPTX/HWP/TXT/ZIP) 화이트리스트 확장, MIME 매치 외에 확장자 2차 검증, 50MB 상한 유지, PDF는 `content-disposition: inline` 응답 헤더
- **카드 생성 API** (`/api/cards`): `CreateCardSchema` + `UpdateCardSchema`에 4개 파일 필드 추가
- **모달 UI** (`AddCardModal`): "📎 파일" 토글 버튼 + 섹션 (파일 선택 + 드래그드롭 + 업로드 중 상태 + 파일 미리보기)
- **카드 렌더** (`DraggableCard` + 각 보드 컴포넌트의 카드 뷰): PDF → iframe 인라인 뷰어 (10MB 초과 시 경고 배너), 비-PDF → 아이콘+파일명+크기+다운로드 버튼
- **아이콘 매핑**: pdf/doc/sheet/slide/text/archive 6종 이모지 (🗎/📄/📊/📽/📝/🗜)
- **iOS/모바일 UA 감지**: PDF 인라인 대신 다운로드 버튼으로 fallback
- **보드 범위**: freeform/grid/stream/columns/assignment/breakout 6개 레이아웃의 카드 렌더에 파일 UI 노출

### 제외 (OUT)
- **DOCX/XLSX 인라인 미리보기** — 후속 task (Office Viewer 임베드 또는 변환 파이프라인 필요)
- **레거시 .doc/.xls (pre-2007)** — 사용 빈도 낮음, 후속 task 여지
- **파일 버전 관리/교체** — 현재 카드 편집 플로우 범위 밖
- **썸네일 자동 생성** (PDF 1페이지 등) — 추가 서버 작업 필요, 후속 task
- **DJ-queue 보드** — 해당 레이아웃은 YouTube 전용이라 파일 첨부 UX 불필요
- **quiz/plant-roadmap/drawing/event-signup/assessment** — 각각 고유 입력 폼이라 범용 카드 추가 플로우 밖

## 3. 수용 기준 (Acceptance Criteria)

1. **AC-1**: `/api/upload`에 PDF/DOCX/XLSX/PPTX/HWP/TXT/ZIP 각 MIME으로 ≤50MB 파일 POST 시 200 + `{ url, name, size, mimeType }` 반환
2. **AC-2**: 동일 엔드포인트에 `.exe`/`.sh`/`image/svg+xml` 외 비허용 MIME POST 시 400 + `Unsupported file type` 반환
3. **AC-3**: 50MB+1byte 파일 POST 시 400 + `File too large` 반환
4. **AC-4**: AddCardModal에 "📎 파일" 버튼 노출, 클릭 시 토글 섹션 열림, 파일 선택/드래그드롭 후 파일명+크기 프리뷰 노출
5. **AC-5**: 파일 첨부된 카드 생성 후 DB에 `fileUrl/fileName/fileSize/fileMimeType` 4개 필드가 모두 저장됨 (null 아님)
6. **AC-6**: freeform/grid/stream/columns/assignment/breakout 6개 레이아웃에서 PDF 카드는 iframe 인라인 뷰어로 렌더됨 (모바일 UA 제외)
7. **AC-7**: 비-PDF 문서 카드는 MIME별 아이콘 + 원본 파일명 + 사람 친화 크기("2.3 MB") + 다운로드 버튼 3요소 노출
8. **AC-8**: iOS Safari UA 감지 시 PDF 카드도 다운로드 버튼으로 fallback
9. **AC-9**: 10MB 초과 PDF 인라인 렌더 전 "파일이 커서 로딩이 느릴 수 있어요" 경고 배너 1회 표시
10. **AC-10**: 회귀 방어 — 기존 이미지/동영상/링크/라이브러리 4개 첨부 플로우 모두 이상 없이 동작

## 4. 스코프 결정 모드

**Selective Expansion** — 기존 AddCardModal·업로드 API·카드 렌더 인프라를 재사용하고, 새 MIME 경로와 2개 렌더 브랜치(PDF iframe / non-PDF)만 추가. 스키마는 4개 컬럼 수준의 소폭 확장.

## 5. 위험 요소

- **R1 — MIME 스푸핑**: 클라이언트가 `application/pdf`로 위장한 스크립트 업로드. 완화: 서버에서 MIME + 확장자 이중 검증 + Blob은 public read만 허용 (실행 경로 없음).
- **R2 — iOS 내장 PDF 뷰어 미동작**: iOS Safari가 `<iframe>` 내 PDF를 렌더하지 않는 경우 있음. 완화: UA 감지 기반 fallback (AC-8).
- **R3 — 50MB PDF 인라인 성능**: 모바일에서 끊김. 완화: 10MB+ 경고 배너 (AC-9) + 브라우저 내장 뷰어의 점진 로딩에 위임.
- **R4 — Vercel Blob 비용/대역폭**: 문서 파일은 이미지보다 반복 다운로드 많을 수 있음. 완화: 현재 Pro 플랜 한도 내, 모니터링은 phase11에서 체크리스트로.
- **R5 — 회귀 — 기존 카드 렌더**: DraggableCard가 여러 레이아웃에서 공유되므로 파일 분기 추가 시 레이아웃 깨짐 가능. 완화: 각 레이아웃 phase9 QA 체크리스트 포함 (AC-6/10).
- **R6 — 실시간 스트림 (SSE)**: 파일 첨부된 카드가 다른 클라이언트로 SSE 푸시될 때 파일 필드 4개가 payload에 포함되어야 함. 완화: `getFullCardPayload`/`setCardAuthors` 유틸이 있다면 확장, 없으면 선택 쿼리에 4개 추가.

## 오케스트레이터 스코프 검증 (자동)

- ✅ 수용 기준 10개 (≥ 3개 요건 충족)
- ✅ 리스크 분석 6개 존재
- ✅ MVP IN/OUT 분리 명시
- ✅ 스코프 모드 명시 (Selective Expansion)

**게이트 PASS → phase3 진행 허가.**
