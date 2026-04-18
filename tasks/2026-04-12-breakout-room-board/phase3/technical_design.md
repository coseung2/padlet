# Phase 3 — Technical Design (BR-1 ~ BR-4)

## 1. 데이터 모델

### 1.1 BreakoutTemplate (신규)
```prisma
model BreakoutTemplate {
  id                     String   @id @default(cuid())
  key                    String   @unique   // "kwl_chart" etc
  name                   String
  description            String
  tier                   String   @default("free")
  requiresPro            Boolean  @default(false)
  scope                  String   @default("system") // system | teacher | school
  ownerId                String?
  structure              Json     // see §2
  recommendedVisibility  String   @default("own-only")
  defaultGroupCount      Int      @default(4)
  defaultGroupCapacity   Int      @default(6)
  createdAt              DateTime @default(now())

  owner       User?                @relation("TemplateOwner", fields: [ownerId], references: [id], onDelete: SetNull)
  assignments BreakoutAssignment[]

  @@index([ownerId])
  @@index([scope])
}
```

### 1.2 BreakoutAssignment (신규)
```prisma
model BreakoutAssignment {
  id                 String   @id @default(cuid())
  boardId            String   @unique
  templateId         String
  deployMode         String   @default("link-fixed")
  groupCount         Int      @default(4)
  groupCapacity      Int      @default(6)
  visibilityOverride String?  // null = use template recommendedVisibility
  status             String   @default("active")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  board    Board                 @relation(fields: [boardId], references: [id], onDelete: Cascade)
  template BreakoutTemplate      @relation(fields: [templateId], references: [id])
  members  BreakoutMembership[]

  @@index([templateId])
}
```

### 1.3 BreakoutMembership (신규)
```prisma
model BreakoutMembership {
  id           String   @id @default(cuid())
  assignmentId String
  sectionId    String
  studentId    String
  role         String?  // "expert" | "home" (Jigsaw) | null
  joinedAt     DateTime @default(now())

  assignment BreakoutAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  section    Section            @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  student    Student            @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([sectionId, studentId])
  @@index([assignmentId])
  @@index([studentId])
}
```

### 1.4 관계 필드 추가
- `User`: `templatesOwned BreakoutTemplate[] @relation("TemplateOwner")`
- `Section`: `breakoutMemberships BreakoutMembership[]`
- `Student`: `breakoutMemberships BreakoutMembership[]`
- `Board` 주석 layout 리스트에 `| "breakout"` 추가

## 2. structure JSON 스키마
```typescript
type TemplateStructure = {
  sectionsPerGroup: Array<{
    title: string;
    role: "group-copy" | "role-expert" | "role-home"; // Jigsaw는 expert/home
    defaultCards?: Array<{ title: string; content: string }>;
  }>;
  sharedSections?: Array<{
    title: string;
    role: "teacher-pool";
  }>;
};
```

## 3. API 설계

### 3.1 `POST /api/boards` 확장
기존 zod enum에 "breakout" 추가. 요청에 `breakoutConfig` 추가 시:
```typescript
breakoutConfig: {
  templateId: string;
  groupCount: number;
  groupCapacity: number;
  visibilityOverride?: "own-only" | "peek-others" | null;
  deployMode?: "link-fixed" | "self-select" | "teacher-assign";
}
```

처리 (단일 트랜잭션):
1. template 로드 + tier 검증 (free user면 requiresPro=true 차단)
2. Board 생성
3. `JSON.parse(JSON.stringify(template.structure))` 로 deep clone
4. BreakoutAssignment 1개 생성
5. group sections: for g in 1..N, for s of sectionsPerGroup → Section 생성 (title = "모둠 ${g} · ${s.title}")
6. teacher-pool: sharedSections 있으면 1개 생성
7. defaultCards → Card INSERT

### 3.2 `POST /api/breakout/assignments/[id]/copy-card` 신규
- body: `{ sourceCardId: string }`
- RBAC: assignment.board owner 필요
- sourceCard 로드 → group sections (teacher-pool 제외) 전체에 해당 카드 deep-copy INSERT
- 트랜잭션으로 일괄 INSERT

## 4. 프론트엔드 컴포넌트

### 4.1 `CreateBreakoutBoardModal.tsx` (신규)
- 3-step:
  1. 템플릿 선택 (8개 그리드, Pro 배지 + 잠금)
  2. 구성 (모둠 수 slider 1-10, 정원 slider 1-6, 열람 모드 라디오)
  3. 확인 + 생성
- Props: `classrooms`, `userTier: "free"|"pro"`, `templates: BreakoutTemplate[]`, `onClose`

### 4.2 `BreakoutBoard.tsx` (신규)
- Props: `boardId`, `assignment`, `sections`, `cards`, `currentRole`, `currentUserId`
- 교사(owner): 모든 모둠을 탭/그리드로 전체 표시
- editor/viewer: 해당 모둠만 (section-scope로 제한 — BR-5/6에서 정교화; foundation은 교사 풀뷰만 지원)
- 각 카드에 ContextMenu: 수정 / 복제 / 삭제 / **"모든 모둠에 복제"** (group-copy 섹션 카드만)
- teacher-pool 섹션은 별도 상단 컬럼으로 분리 표시

### 4.3 `CreateBoardModal` 확장
- LAYOUTS에 `{ id: "breakout", emoji: "👥", label: "모둠 학습", desc: "템플릿 기반 모둠 협력 보드" }` 추가
- breakout 선택 시 CreateBreakoutBoardModal 오픈 (2단계 스텝 확장)

## 5. tier gating (foundation stub)
- `src/lib/tier.ts` 신규: `export const CURRENT_TIER = (process.env.TIER_MODE ?? "free") as "free" | "pro"`
- free 사용자가 Pro 템플릿 선택 → 모달에 "Pro로 업그레이드" CTA 표시 + select disabled
- 서버 /api/boards: free && requiresPro → 403

## 6. 마이그레이션 전략
1. `prisma/schema.prisma` 편집
2. `prisma db push --skip-generate` Dry-run preview
3. `prisma db push` 실제 실행 (비파괴 — 신규 테이블/필드만)
4. `npm run seed:breakout` — 8종 upsert

## 7. T0-① 재사용 확인
- 학생 뷰는 `/board/[id]/s/[sectionId]` 그대로
- teacher-pool section은 accessToken 없이도 교사 전체 접근으로 OK
- BreakoutMembership은 v1 foundation에서는 생성 안 함 (BR-5에서 학생 배정 시 INSERT)

## 8. 테스트 전략
- Unit: 템플릿 structure parse, deep clone 독립성
- Integration: breakout 보드 개설 → DB에 sections N×S+1 존재 확인
- Integration: copy-card → group sections 전체 카드 +1, teacher-pool 변화 없음
- Smoke: 실제 dev 서버에서 kwl_chart로 4모둠 생성, 카드 추가, 모든 모둠에 복제 클릭

## 9. 영향 분석
- Prisma 클라이언트 regenerate 필요 (postinstall 훅)
- 타입 re-export (server 측만 사용)
- 기존 board 레이아웃 처리 로직에 "breakout" 케이스 추가 (`/board/[id]/page.tsx`)
