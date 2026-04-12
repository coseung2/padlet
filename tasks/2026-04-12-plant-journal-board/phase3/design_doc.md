# Design Doc — plant-journal-board

> 스택 변경 없음. Next.js 16 App Router + Prisma(Postgres) + NextAuth + 기존 student-auth 쿠키 세션 + 기존 `/api/upload` 재사용. 첫 feature task 때 잠긴 스택을 그대로 사용.

## 1. 데이터 모델 변경

### 신규 모델

```prisma
model PlantSpecies {
  id           String   @id @default(cuid())
  key          String   @unique            // "tomato", "strawberry" — 프로그램 식별자
  nameKo       String                      // "토마토"
  emoji        String                      // "🍅"
  difficulty   String   @default("easy")   // "easy" | "medium" | "hard" (validated in app)
  season       String   @default("spring") // "spring" | "summer" | "fall" | "winter" | "all"
  notes        String   @default("")       // 재배 유의사항 요약

  stages       PlantStage[]
  allows       ClassroomPlantAllow[]
  studentPlants StudentPlant[]

  createdAt    DateTime @default(now())
}

model PlantStage {
  id            String   @id @default(cuid())
  speciesId     String
  order         Int                         // 1..10 (species 내 유일)
  key           String                      // "seed", "sprout", ...
  nameKo        String                      // "씨앗"
  description   String   @default("")
  icon          String                      // "🌰"
  observationPoints String                  // JSON encoded string[] — 관찰 포인트 3~5개

  species       PlantSpecies @relation(fields: [speciesId], references: [id], onDelete: Cascade)
  observations  PlantObservation[]

  @@unique([speciesId, order])
  @@index([speciesId])
}

model ClassroomPlantAllow {
  id           String   @id @default(cuid())
  classroomId  String
  speciesId    String
  createdAt    DateTime @default(now())

  classroom    Classroom    @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  species      PlantSpecies @relation(fields: [speciesId], references: [id], onDelete: Cascade)

  @@unique([classroomId, speciesId])
  @@index([classroomId])
}

model StudentPlant {
  id             String   @id @default(cuid())
  boardId        String                      // 보드 단위로 독립 — 같은 반이라도 보드가 바뀌면 새 plant
  studentId      String
  speciesId      String
  nickname       String                      // 1~20자 (app validation)
  currentStageId String                      // 항상 존재 — 선택 시 stage 1
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  board          Board         @relation(fields: [boardId], references: [id], onDelete: Cascade)
  student        Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  species        PlantSpecies  @relation(fields: [speciesId], references: [id])
  currentStage   PlantStage    @relation("CurrentStage", fields: [currentStageId], references: [id])
  observations   PlantObservation[]

  @@unique([boardId, studentId])   // 한 보드/학생당 1개 plant
  @@index([boardId])
  @@index([studentId])
}

model PlantObservation {
  id              String   @id @default(cuid())
  studentPlantId  String
  stageId         String
  memo            String   @default("")       // ≤500자 (app validation)
  noPhotoReason   String?                      // 사진 미첨부 사유
  observedAt      DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  studentPlant    StudentPlant @relation(fields: [studentPlantId], references: [id], onDelete: Cascade)
  stage           PlantStage   @relation(fields: [stageId], references: [id])
  images          PlantObservationImage[]

  @@index([studentPlantId])
  @@index([stageId])
  @@index([studentPlantId, stageId])
}

model PlantObservationImage {
  id             String   @id @default(cuid())
  observationId  String
  url            String                          // /uploads/... 또는 외부 URL
  thumbnailUrl   String?                         // 없으면 url 사용
  order          Int      @default(0)            // 0..9
  createdAt      DateTime @default(now())

  observation    PlantObservation @relation(fields: [observationId], references: [id], onDelete: Cascade)

  @@index([observationId])
}
```

### Board 확장
`Board.layout`에 `"plant-roadmap"` 추가 (string enum — 앱 단 zod 검증). 스키마 자체 변경 불필요(기존 `String @default("freeform")`).

### 마이그레이션 전략
- `prisma migrate dev --name plant_journal_schema` 또는 `db push` 비파괴 모드
- DEV DB는 포스트그레 연결, 본 worktree에서는 `prisma generate`만 실행해 타입 갱신 후 push/migrate는 메인에서 승인 받아 실행. 롤백은 다음 model 6개 drop + 컬럼 없음(기존 테이블에 컬럼 추가 없음 — Board.layout은 이미 String).
- `--force-reset` **금지**(memory rule). 마이그레이션 실패 시 백업 덤프 후 수동 롤백.

## 2. API 변경

모든 라우트는 Next.js route handler, `route.ts`. 권한 열: S=student, U=user(NextAuth), R=role. 실시간 이벤트 없음(후속 research task).

| # | Method | Path | 권한 | Req | Res |
|---|---|---|---|---|---|
| 1 | GET | `/api/species` | U or S | — | `PlantSpecies[]` (id, key, nameKo, emoji, difficulty, season, stages=[]) |
| 2 | GET | `/api/classrooms/[id]/species` | U(teacher of classroom) or S(same classroom) | — | allowed `PlantSpecies[]` |
| 3 | PUT | `/api/classrooms/[id]/species` | U(teacher) | `{ speciesIds: string[] }` | `{ ok: true }` |
| 4 | GET | `/api/boards/[id]/plant-journal` | U/S(member of board) | — | `{ board, species: allowed[], studentPlant: StudentPlant|null, canEdit }` |
| 5 | POST | `/api/student-plants` | S | `{ boardId, speciesId, nickname }` | `StudentPlant` 201 |
| 6 | GET | `/api/student-plants/[id]` | S(owner) or U(teacher of classroom) | — | `StudentPlant` + stage + observations[] |
| 7 | GET | `/api/student-plants/[id]/observations` | same | — | `PlantObservation[]` with images |
| 8 | POST | `/api/student-plants/[id]/observations` | S(owner) | `{ stageId, memo?, noPhotoReason?, images?: [{ url, thumbnailUrl? }] }` | `PlantObservation` 201 |
| 9 | PATCH | `/api/student-plants/[id]/observations/[oid]` | S(owner) | `{ memo?, images? }` | `PlantObservation` |
| 10 | DELETE | `/api/student-plants/[id]/observations/[oid]` | S(owner) | — | `{ ok: true }` |
| 11 | POST | `/api/student-plants/[id]/advance-stage` | S(owner) | `{ noPhotoReason?: string }` | `{ currentStageId }` — 현재 단계의 사진 없으면 noPhotoReason 필수 |
| 12 | GET | `/api/classrooms/[id]/matrix` | U(owner of classroom) + viewport≥1024 헤더 | — | `{ stages: [], students: [{ ... row data }] }` |

### 권한 규칙 요약
- 학생 세션(쿠키)은 `studentId + classroomId` 확인 → 해당 classroom 소속 board만 접근 가능
- NextAuth 세션은 user → BoardMember(role) 확인
- 매트릭스 라우트는 `X-Client-Width` 헤더 + owner role 둘 다 만족해야 통과(없으면 403)

## 3. 컴포넌트 변경

```
src/components/
├── PlantRoadmapBoard.tsx            // 레이아웃 분기 루트 (server wrapper) — *new*
├── plant/
│   ├── PlantSelectStep.tsx          // 식물 선택 화면 — *new*
│   ├── RoadmapView.tsx              // 학생 메인 — SVG 노선도 + 상세 시트 — *new*
│   ├── StageDetailSheet.tsx         // 하단 시트 — *new*
│   ├── ObservationEditor.tsx        // 추가/수정 모달 — *new*
│   ├── NoPhotoReasonModal.tsx       // 사진 없음 사유 — *new*
│   ├── TeacherSummaryView.tsx       // 교사 요약 — *new*
│   ├── TeacherMatrixView.tsx        // 교사 매트릭스 — *new*
│   └── PlantAllowListModal.tsx      // 교사 allow-list — *new*
```

`board/[id]/page.tsx`에 `case "plant-roadmap"` 분기 추가. 데이터 fetch는 기존 `Promise.all` 라운드에 `plantJournalPromise`를 추가.

### 상태 위치
- 서버: `StudentPlant`, `Observation` 초기 로드 + SSR
- 클라이언트: 모달/시트 오픈 상태, drag(없음), optimistic 업데이트
- 실시간: 없음(후속 research)

## 4. 데이터 흐름

```
[Student]
  Browser → GET /board/{id} (RSC)
           → Promise.all(board, user, student, role, plant-journal data)
           → renderBoard(): PlantRoadmapBoard
               ↓
  StudentPlant가 없음 → <PlantSelectStep /> (client) 
               ↓ POST /api/student-plants
  StudentPlant 존재 → <RoadmapView />
               ↓ 노드 tap
               ↓ <StageDetailSheet />
               ↓ "관찰 추가" → <ObservationEditor />
               ↓ 이미지 각각 POST /api/upload → url 받음
               ↓ POST /api/student-plants/[id]/observations (url들 포함)
               ↓ 응답 → optimistic list 갱신
               ↓ "다음 단계로" → POST /api/student-plants/[id]/advance-stage
                     → 사진 0 && no reason → 400 → 클라 NoPhotoReasonModal 오픈

[Teacher = board owner]
  /board/{id} → layout=plant-roadmap → <TeacherSummaryView />
  toolbar 버튼 "매트릭스 뷰" → /classrooms/{id}/matrix (new page)
             → GET /api/classrooms/{id}/matrix (auth + desktop check)
```

## 5. 엣지케이스

1. **학생 세션은 있는데 해당 보드의 classroomId와 다름** → 403 (기존 board page 로직 재사용)
2. **교사가 allow-list에서 기존 학생이 선택한 종을 제외시킴** → 학생 `StudentPlant`는 유지(historical), 선택 단계에서만 필터. 교사 요약에 "비활성 종" 뱃지
3. **업로드 중 네트워크 끊김** → 실패 시 observation 트랜잭션 롤백. 클라는 "다시 시도" 토스트
4. **단계 11번째 시도(마지막 단계에서 다시 advance)** → 서버 400 "마지막 단계입니다"
5. **동시에 같은 학생이 두 탭에서 observation 추가** → 두 row 생성. 중복 방지 OUT(허용), 단 각각 10장 제한은 독립
6. **매트릭스 뷰에서 학생이 plant 없음** → 해당 column empty placeholder
7. **Observation에 이미지 0 & memo 0** → 서버 400 (둘 중 하나는 필수)
8. **nickname이 이모지/공백만** → trim 후 1자 이상 검증, 실패 시 400

## 6. DX 영향

- Prisma client 재생성 필요(`postinstall`에 이미 포함) — 타입 자동 갱신
- Zod 스키마 파일 신규: `src/lib/plant-schemas.ts`
- `docs/architecture.md` 섹션 추가 필요
- 신규 CSS 변수 1개: `--color-plant-active` (PLant accent), 기존 `--color-accent`와 별도 선택 — tokens_patch에 기록

## 7. 롤백 계획

1. `git revert` 머지 커밋 — 코드 원복
2. DB: 신규 6개 테이블 `DROP` (의존 없음, Board/Student/Classroom은 손대지 않음)
   ```sql
   DROP TABLE "PlantObservationImage";
   DROP TABLE "PlantObservation";
   DROP TABLE "StudentPlant";
   DROP TABLE "ClassroomPlantAllow";
   DROP TABLE "PlantStage";
   DROP TABLE "PlantSpecies";
   ```
3. `Board.layout="plant-roadmap"`인 레코드는 drop 전에 `UPDATE ... SET layout='grid'` 수동 교정
4. 업로드된 이미지(`public/uploads/`)는 cleanup cron 스크립트로 비참조 이미지 삭제 (후속 작업)
