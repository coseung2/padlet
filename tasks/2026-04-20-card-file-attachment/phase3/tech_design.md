# Tech Design — card-file-attachment

## 1. 데이터 모델

`Card` 모델에 4개 필드 nullable 추가 (기존 카드 호환 보장):

```prisma
model Card {
  ...
  fileUrl       String?
  fileName      String?
  fileSize      Int?
  fileMimeType  String?
  ...
}
```

**마이그레이션**: `prisma/migrations/20260420_add_card_file_attachment/migration.sql`
```sql
ALTER TABLE "Card" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "Card" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Card" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Card" ADD COLUMN "fileMimeType" TEXT;
```

## 2. 허용 MIME + 확장자

| 유형 | MIME | 확장자 |
|---|---|---|
| PDF | `application/pdf` | `pdf` |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx` |
| PowerPoint | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `pptx` |
| HWP | `application/x-hwp`, `application/haansofthwp`, `application/vnd.hancom.hwp` | `hwp` |
| Text | `text/plain` | `txt` |
| ZIP | `application/zip`, `application/x-zip-compressed` | `zip` |

**서버 검증**: MIME 화이트리스트 + 확장자 화이트리스트 AND 조건 (MIME 스푸핑 R1 방어).

## 3. 업로드 API 응답 확장

`POST /api/upload` → `{ url, type, name, size, mimeType }` — 기존 `{ url, type }`는 name/size/mimeType 추가. 기존 호출부(이미지/동영상)는 새 필드 무시하므로 역호환.

`type` enum 확장: `"image" | "video" | "file"`.

PDF는 Blob `put`에 `contentType: "application/pdf"` + `cacheControlMaxAge: 60 * 60 * 24 * 7` 설정하고, 브라우저 기본 `content-disposition`(Blob 기본 inline)으로 iframe 렌더 가능.

## 4. 카드 생성/수정 API

`POST /api/cards` `CreateCardSchema`:
```ts
fileUrl: z.string().url().nullable().optional(),
fileName: z.string().max(255).nullable().optional(),
fileSize: z.number().int().nonnegative().nullable().optional(),
fileMimeType: z.string().max(100).nullable().optional(),
```

`PATCH /api/cards/:id` `PatchCardSchema`: 동일 4개 필드 추가.

카드 생성 시 `data`에 4개 필드 포함 (`undefined` → Prisma 무시).

## 5. 직렬화 경로 (변경 대상)

파일 필드 4개를 서버→클라이언트 직렬화 경로에 추가:

- `src/app/board/[id]/page.tsx::cardProps` — 초기 로드
- `src/app/api/boards/[id]/stream/route.ts::CardWire` + 매퍼 — SSE 실시간 스냅샷
- `src/app/api/cards/route.ts::POST` 응답 — 카드 생성 직후 상태 업데이트
- `src/components/DraggableCard.tsx::CardData` 타입 — 클라이언트 타입

## 6. UI 컴포넌트 변경

### `AddCardModal.tsx`
- `📎 파일` 버튼 추가 (기존 `modal-attach-btn` 패턴)
- `showFile` 상태 + `modal-attach-section`
- `fileUrl`/`fileName`/`fileSize`/`fileMimeType` 4개 상태
- `handleFileUpload` 확장: type='file'일 때 name/size/mimeType 저장
- `onAdd` 페이로드에 4개 필드 포함

### `EditCardModal.tsx`
- 동일 확장 (파일 교체/제거)

### `CardAttachments.tsx` (렌더)
- 신규 props: `fileUrl`, `fileName`, `fileSize`, `fileMimeType`
- 렌더 분기:
  - `mimeType === "application/pdf"` AND `!isMobileUA()` → `<iframe src={url}#view=FitH>` 내장 뷰어
  - `mimeType === "application/pdf"` AND `isMobileUA()` → 파일 카드 + "열기" 버튼 (새 탭)
  - 비-PDF → 파일 카드 (아이콘 + 이름 + 크기 + 다운로드)
- 10MB+ PDF는 `<details>` 접어두기 + "파일이 커서 로딩이 느릴 수 있어요" 배너

### 아이콘 매핑 유틸 (`src/lib/file-icon.ts` 신규)
```ts
export function fileMimeToIcon(mime: string): string {
  if (mime === "application/pdf") return "🗎";
  if (mime.includes("wordprocessing") || mime === "application/msword") return "📄";
  if (mime.includes("spreadsheet") || mime === "application/vnd.ms-excel") return "📊";
  if (mime.includes("presentation")) return "📽";
  if (mime.includes("hwp")) return "📋";
  if (mime === "text/plain") return "📝";
  if (mime.includes("zip")) return "🗜";
  return "📎";
}
export function formatBytes(n: number): string { /* 12.3 MB */ }
export function isMobileUA(ua: string): boolean { /* iPhone|iPad|Android */ }
```

## 7. CSS 추가 (`src/styles/card.css` + `modal.css`)

- `.card-attach-file` — 비-PDF 파일 카드 (아이콘+이름+크기+다운로드 버튼)
- `.card-attach-pdf` — PDF iframe 래퍼 (aspect-ratio 4/3, min-height 360px)
- `.card-attach-pdf-warning` — 10MB+ 경고 배너
- `.modal-attach-file-section` — 모달 내 파일 섹션

## 8. 검증/테스트

- 기존 `__tests__` 패턴에 맞춰 `src/lib/__tests__/file-icon.test.ts` 추가 (MIME→아이콘/크기 포맷)
- `/api/upload` 정상/거부 시나리오는 기존 패턴 부재 — 수동 QA로 (phase9)
- typecheck: `npx tsc --noEmit`
- build: `npm run build`

## 9. 리스크 대응 확인 (scope §5)

- **R1 (MIME 스푸핑)**: MIME + 확장자 AND 조건 ✅
- **R2 (iOS 미동작)**: `isMobileUA()` UA 감지 후 다운로드 카드 렌더 ✅
- **R3 (50MB 성능)**: 10MB+ 경고 배너 + 접이식 `<details>` ✅
- **R4 (Blob 비용)**: 현재 프로젝트 무변경 (모니터링은 phase11 체크리스트)
- **R5 (회귀)**: `CardAttachments` 기존 분기 무변경, 신규 분기만 추가. 기존 props optional ✅
- **R6 (SSE)**: `CardWire` + 매퍼에 4개 필드 추가 ✅
