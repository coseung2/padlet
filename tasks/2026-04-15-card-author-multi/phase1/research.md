# Phase 1 — Researcher · card-author-multi

## 1. 현재 작성자 표현 구조

### 1.1 Card 스키마 (prisma)
```prisma
model Card {
  authorId           String  // User.id (교사, always)
  studentAuthorId    String?
  externalAuthorName String?
  canvaDesignId      String?
  ...
}
```
세 필드 조합:
- `authorId` (User FK) — 실제 카드 만든 행위자. 교사 권한으로 insert 함. 학생이 publish 해도 `authorId = classroom.teacherId`.
- `studentAuthorId` (Student FK, nullable) — publish 한 학생. parent-viewer 연결 anchor. 단일 학생.
- `externalAuthorName` (free text, nullable) — 화면 표시용. Canva 앱 publish 시 `student.name` 복사. 교사 수동 카드는 null.

### 1.2 렌더 경로
`src/lib/card-author.ts#pickAuthorName(external, student, author) → external ?? student ?? author ?? null`.
단일 문자열 반환. 공동 작성자 표현 구조적으로 불가능.

`CardAuthorFooter.tsx` 가 이 함수 결과를 chip 하나로 렌더.

### 1.3 POST 경로 3곳 (writer)
| 경로 | studentAuthorId 설정 | externalAuthorName 설정 |
|---|---|---|
| `POST /api/cards` (teacher UI FAB, 학생 FAB) | student path: student.id | student.name |
| `POST /api/external/cards` (Canva publish) | OAuth student 또는 PAT cookie student | student.name, 없으면 input.authorName |
| Assignment board create (`POST /api/boards`) | 트랜잭션 내 Card 생성 시 student.id | student.name |

### 1.4 parent-scope.ts
현재 `requireParentScope` 는 **childIds 집합만** 반환. Card 에 직접 쿼리 안 함. 자녀 카드 조회는 /parent/(app)/child/[sid]/* 각 페이지가 자체 수행. `studentAuthorId` 기준 쿼리 경로가 **현재 코드베이스에 없음** (assignment 외 카드 피드가 없음).

### 1.5 Identity × card-permissions (2026-04-15 role-cleanup)
`canEditCard(id, b, c)` 가 `c.studentAuthorId === id.studentId` 로 primary 기준 판정. 공동 작성자 중 primary 가 아닌 학생은 편집 불가 — 이 설계 유지 (scope OUT-1).

## 2. 공동 작성자 가능한 surface

- **Columns board** 에서 발표/모둠 과제 카드 (실사례: 2026-04-14 서현우+오경민)
- **Freeform / Grid / Stream board** 에서 교사가 공동 활동 카드 수동 작성
- **Assignment board AB-1** 은 slot = 학생 1명 구조라 공동 작성자 불가 (scope OUT-2)

## 3. 요구사항 분해

### A — 작성자 재지정
교사가 이미 있는 카드의 primary student + display name 을 변경. 사용 사례:
- Canva publish 때 학생이 다른 학생 계정으로 들어가 실수로 올려 author 가 틀림 → 교사 보정
- 교사가 manual 로 만든 카드에 학생 이름 attach

### C — 공동 작성자 (여러 학생)
- 모둠 과제, 공동 발표 카드
- 학부모 관점: 내 자녀가 공동 작성한 카드도 자녀 카드로 보이게 하고 싶음 (직접 feed 는 현재 없으나, 미래 대비)
- 학생 관점: primary 만 편집 가능 (단일 책임), 공동 author 는 display 전용

## 4. 설계 후보 비교

### 4.1 Option α — comma 최소 (빠른 길)
```
Card.externalAuthorName = "오경민, 서현우" (공동)
Card.studentAuthorId    = primary (1명)
```
- 장점: schema 변경 없음
- 단점: (a) 부모 뷰 미래 확장 시 primary 만 보임, (b) 학생 삭제/전학 시 이름 stale, (c) display 파싱 규칙 없음

### 4.2 Option β — join table (정식)
```prisma
model CardAuthor {
  id          String   @id @default(cuid())
  cardId      String
  studentId   String?           // nullable: 학급 밖 이름만 등록 가능
  displayName String
  order       Int      @default(0)
  createdAt   DateTime @default(now())

  card    Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  student Student? @relation("StudentCardAuthors", fields: [studentId], references: [id], onDelete: SetNull)

  @@unique([cardId, studentId])  // 같은 학생 중복 금지
  @@index([cardId, order])       // 카드별 정렬 쿼리
  @@index([studentId])            // 학생별 기여 카드 쿼리 (parent v2)
}
```
- 장점: (a) parent-scope 확장 쉬움, (b) 학생 삭제 시 SetNull 로 이름 남기고 링크만 끊김, (c) order 필드로 primary 명시, (d) 향후 per-author 메타(기여 설명, 승인 상태) 확장 여지
- 단점: migration + 기존 Card 필드 mirror 유지 복잡도

**권장: β**. user directive "정교하게" 에 부합 + 시간 여유 있음.

### 4.3 primary mirror 전략
- `Card.studentAuthorId` + `Card.externalAuthorName` 은 **derived** (읽기 편의 + 하위 호환)
- source of truth = `CardAuthor` rows
- PUT /api/cards/[id]/authors 가 두 층 모두 업데이트 (트랜잭션 내 atomic)
- 기존 Card 필드 쿼리하는 callsite 들은 그대로 작동 (primary 만 보임)

## 5. 영향 파일 분류

### 5.1 스키마 (HIGH)
- `prisma/schema.prisma` — NEW `CardAuthor` + `Card.authors[]` + `Student.cardAuthors[]` 관계
- `prisma/migrations/20260415_add_card_author/migration.sql` — CREATE TABLE + 백필

### 5.2 library (HIGH)
- `src/lib/card-author.ts` — `pickAuthorName` 확장: `(authors: AuthorDTO[] | null, ...fallbacks) → display string`. 예: 1명 = "이름", 2-3명 = 쉼표, 4+명 = "이름 외 N명"
- `src/lib/card-authors-service.ts` NEW — 서버측 helper: `setCardAuthors(cardId, authors[])` 트랜잭션

### 5.3 API (HIGH)
- `PUT /api/cards/[id]/authors` NEW — replace-all. teacher-only. 트랜잭션: delete + batch create + Card primary mirror update.
- `POST /api/cards` — 기존 student path 에 CardAuthor 1행 자동 생성 추가.
- `POST /api/external/cards` — 동일.
- `POST /api/boards` (assignment layout) — slot Card 생성 시 CardAuthor 1행 자동 (AB-1 정합 유지).

### 5.4 parent-scope (MED)
- `requireParentScope` 시그니처에 `authoredCardIds(limit?)` 헬퍼 추가? 지금 당장 호출자 없으므로 **본 task 에서는 확장만** — 실제 카드 피드 페이지는 별 task.

### 5.5 page.tsx + 카드 props (HIGH)
- `src/app/board/[id]/page.tsx` — `db.card.findMany` 에 `include: { authors: { include: { student: { select: { name } } }, orderBy: { order: 'asc' } } }` 추가
- `cardProps` 매핑에 `authors: [...]` 포함
- `DraggableCard.CardData` 타입에 `authors` 필드 추가
- `CardAuthorFooter` 가 `authors` 기반으로 렌더

### 5.6 UI (HIGH)
- `src/components/cards/CardAuthorEditor.tsx` NEW — modal. 학급 학생 multi-select + reorder + free-form 입력
- `src/app/api/classroom/[id]/students/route.ts` — GET 엔드포인트 추가 (학급 학생 리스트)
- 4 board 컨텍스트 메뉴 (columns/freeform/grid/stream) 에 "작성자 지정" 항목 추가
- `CardDetailModal` 에도 노출 (모달 내부에서 접근 가능)

### 5.7 tests (MED)
- `src/lib/__tests__/card-author.vitest.ts` — `pickAuthorName` 다중 formatter
- `src/lib/__tests__/card-authors-service.vitest.ts` — mock 기반 트랜잭션 검증 (or integration smoke via tsx)

## 6. 엣지케이스

- **E1**: 교사가 같은 학생을 두 번 추가 — `@@unique([cardId, studentId])` 로 DB-level 차단
- **E2**: 학생이 삭제되어 CardAuthor.student = null 로 SetNull 됨 — displayName 으로 fallback 렌더
- **E3**: teacher 가 authors=[] 로 모두 제거 — primary mirror `studentAuthorId=null, externalAuthorName=null`. 허용. 카드는 교사 author 만 남음
- **E4**: order 중복/비연속 — server 가 정규화 (0부터 재배치)
- **E5**: Canva publish 가 기존 카드에 대해 재publish — 현재 새 Card 생성 (update 안 함). CardAuthor 도 새 카드에 붙음. 영향 없음
- **E6**: parent-v2 narrowing 과 충돌 — CardAuthor 는 parent-scope 에 직접 영향 없음 (childIds 만 반환). parent feed 확장 시 별도 쿼리에서 `CardAuthor.studentId IN childIds` 로 연결
- **E7**: 학급 없는 보드에서 작성자 편집 — CardAuthor 는 가능하되 studentId=null, displayName 만. UI 에서 학생 multi-select 숨기고 free-form 만 노출

## 7. 블로커 (phase2 결정)

| # | 질문 | 권장 답 |
|---|---|---|
| B1 | Card.studentAuthorId 유지? | **YES** — primary mirror. 하위 호환 완결 |
| B2 | CardAuthor.studentId nullable? | **YES** — 학급 밖 이름(외부 게스트, 타반 학생) 수용 |
| B3 | order 0=primary? | **YES** — 관례 명확 |
| B4 | order 중복 허용? | **NO** — server 정규화 |
| B5 | authors 최대 개수 | **10명** — UI 과밀 방지 + DB 용량 제한 |
| B6 | PUT replace-all vs PATCH individual | **PUT replace-all** — transactional simplicity |
| B7 | parent-scope 확장 깊이 | **선언만** — authoredCardIds helper 명시, 호출자는 별 task |
| B8 | 학생이 공동 author 카드 편집 가능 | **NO (primary만)** — canEditCard 현 정의 유지 |

## 8. Phase 1 판정

**PASS** — 영향 파일 5티어 + 요구 분해 (A+C) + Option β 선택 근거 + 8 blocker 답 모두 확보. phase2 scope 확정 가능.
