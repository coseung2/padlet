# Phase 3 — Technical Architecture

## Data model additions (prisma/schema.prisma)

### StudentAsset
```prisma
model StudentAsset {
  id              String   @id @default(cuid())
  studentId       String
  classroomId     String   // denormalized for fast classroom gallery scans
  title           String   @default("")
  fileUrl         String
  thumbnailUrl    String?
  width           Int?
  height          Int?
  format          String   @default("image/png") // "image/png" | "image/jpeg" | "image/webp" | "drawpile/ora"
  sizeBytes       Int      @default(0)
  isSharedToClass Boolean  @default(false)
  source          String   @default("upload")    // "upload" | "drawpile"
  drawpileFileId  String?                         // filled by Drawpile postMessage save
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  student       Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  attachments   AssetAttachment[]

  @@index([studentId])
  @@index([classroomId])
  @@index([classroomId, isSharedToClass])
}
```

### AssetAttachment
```prisma
model AssetAttachment {
  id          String   @id @default(cuid())
  assetId     String
  cardId      String?
  observationId String?
  createdAt   DateTime @default(now())

  asset       StudentAsset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  card        Card?            @relation("CardAssetAttachments", fields: [cardId], references: [id], onDelete: Cascade)
  observation PlantObservation? @relation("PlantObservationAssetAttachments", fields: [observationId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([cardId])
  @@index([observationId])
}
```

### Relations (existing models patched)
- `Student.assets StudentAsset[]`
- `Card.assetAttachments AssetAttachment[] @relation("CardAssetAttachments")`
- `PlantObservation.assetAttachments AssetAttachment[] @relation("PlantObservationAssetAttachments")`

### Layout union (app-level zod, not schema)
- `src/app/api/boards/route.ts` → `CreateBoardSchema.layout` enum 에 `"drawing"` 추가
- `src/app/board/[id]/page.tsx` → `LAYOUT_LABEL["drawing"] = "그림보드"`, switch case 추가

## Migration SQL (prisma/migrations/20260413_add_drawpile_student_assets/migration.sql)
```sql
-- StudentAsset
CREATE TABLE "StudentAsset" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "format" TEXT NOT NULL DEFAULT 'image/png',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "isSharedToClass" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'upload',
  "drawpileFileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentAsset_studentId_idx" ON "StudentAsset"("studentId");
CREATE INDEX "StudentAsset_classroomId_idx" ON "StudentAsset"("classroomId");
CREATE INDEX "StudentAsset_classroomId_isSharedToClass_idx" ON "StudentAsset"("classroomId", "isSharedToClass");
ALTER TABLE "StudentAsset" ADD CONSTRAINT "StudentAsset_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE;

-- AssetAttachment
CREATE TABLE "AssetAttachment" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "cardId" TEXT,
  "observationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssetAttachment_assetId_idx" ON "AssetAttachment"("assetId");
CREATE INDEX "AssetAttachment_cardId_idx" ON "AssetAttachment"("cardId");
CREATE INDEX "AssetAttachment_observationId_idx" ON "AssetAttachment"("observationId");
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "StudentAsset"("id") ON DELETE CASCADE;
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE;
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "PlantObservation"("id") ON DELETE CASCADE;
```

## Routes & API

### New: POST /api/student-assets
- auth: `getCurrentStudent()` 필수
- multipart/form-data: `file` (image/*, ≤ 50MB)
- 저장: `public/uploads/asset-{timestamp}-{rand}.{ext}`
- DB: StudentAsset row (studentId, classroomId, fileUrl, thumbnailUrl=fileUrl for now, format, sizeBytes, source="upload")
- 응답: `{ id, fileUrl, thumbnailUrl, title, createdAt }`

### New: GET /api/student-assets?scope=mine|shared
- auth: student or teacher
- `scope=mine`: 현재 학생 본인 자산 (createdAt desc)
- `scope=shared&classroomId=...`: 해당 교실의 isSharedToClass=true 자산 (교사/교실 학생만)
- 응답: `{ assets: StudentAssetDTO[] }`

### New: POST /api/student-assets/[id]/attach
- body: `{ cardId?: string, observationId?: string }`
- auth: 자산 소유자 본인 또는 보드 role=owner 만
- 효과: AssetAttachment row 생성. cardId 지정 시 `Card.imageUrl = asset.thumbnailUrl ?? asset.fileUrl` 업데이트 (기존 값 덮어쓰지 않음: null 이었을 때만).
- 응답: `{ attachment: { id, assetId, cardId, createdAt } }`

## Component tree

```
src/app/board/[id]/page.tsx           ← layout switch 에 'drawing' 추가
  └── DrawingBoard.tsx (client)       ← 신규
       ├── Tabs: 작업실 / 갤러리
       ├── 작업실 Tab
       │   ├── env NEXT_PUBLIC_DRAWPILE_URL 있음 → <iframe sandbox="...">
       │   └── 없음 → <PlaceholderCard>
       ├── 갤러리 Tab
       │   └── GalleryGrid (GET /api/student-assets?scope=shared)
       └── StudentLibrary.tsx (client, 학생 로그인 시만) — 신규
            ├── Upload button → POST /api/student-assets
            └── thumbnail list

src/components/AddCardModal.tsx       ← '내 라이브러리' 버튼 추가
  └── LibraryPickerModal.tsx (client) ← 신규 (경량, AddCardModal 내부 상태)
       └── 썸네일 그리드 → select → attach API → Card.imageUrl 세팅
```

## Env vars
- `NEXT_PUBLIC_DRAWPILE_URL` — optional. Drawpile 서버 루트 (e.g. `https://drawpile.aura-board.app`). 미설정이면 placeholder.

## Security
- 학생 세션 쿠키 확인 `getCurrentStudent()`.
- 업로드 MIME/크기 검증.
- attach API: 자산 소유자 또는 boardOwner 만.
- classroomId 는 세션 student 로부터 유도 — body 입력 받지 않음.

## Deferred (blockers)
- COOP/COEP next.config.ts 설정
- Drawpile postMessage handler (실제 save 수신 → StudentAsset 갱신)
- 자산 공유 플래그 교사 토글 UI
- 갤러리 실시간 업데이트
