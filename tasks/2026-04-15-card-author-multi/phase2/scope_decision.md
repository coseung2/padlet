# Phase 2 — Scope Decision · card-author-multi

- **mode**: **Selective Expansion** — phase1 이 Option β(join table) 선택 + B1~B8 답 확정.

## 1. IN

### 1.1 데이터 모델 (IN-D)
- **[IN-D1]** NEW `CardAuthor` 모델. Fields: `id, cardId, studentId?, displayName, order, createdAt`.
- **[IN-D2]** Indexes: `@@unique([cardId, studentId])`, `@@index([cardId, order])`, `@@index([studentId])`.
- **[IN-D3]** Relations: `Card.authors[]`, `Student.cardAuthors[] (onDelete SetNull on studentId)`.
- **[IN-D4]** 마이그레이션 `20260415_add_card_author/migration.sql`:
  - CREATE TABLE `CardAuthor`
  - 백필: 기존 `Card.studentAuthorId` 가 있는 카드들은 `CardAuthor (cardId, studentId, displayName=externalAuthorName||student.name, order=0)` 1행 생성
  - 백필 멱등성 — WHERE NOT EXISTS 로 중복 insert 방지

### 1.2 라이브러리 (IN-L)
- **[IN-L1]** `src/lib/card-author.ts` 확장 — `formatAuthorList(authors, fallbacks)`:
  - 1명 → `"이름"`
  - 2-3명 → `"이름1, 이름2[, 이름3]"`
  - 4+명 → `"이름1 외 N명"`
  - 0명 + fallback → `pickAuthorName` 결과
- **[IN-L2]** `src/lib/card-authors-service.ts` NEW — server-only:
  - `setCardAuthors(tx, cardId, authors: SetInput[])` 트랜잭션 helper
  - 기존 행 삭제 → batch create → `Card.studentAuthorId`·`Card.externalAuthorName` mirror 업데이트
  - 최대 10명 검증, order 정규화 (0..N-1 재배치)

### 1.3 API (IN-A)
- **[IN-A1]** `PUT /api/cards/[id]/authors` NEW — teacher-only (canEditCard + identity.kind='teacher' + ownsBoard).
- **[IN-A2]** `POST /api/cards` — student path 에서 `setCardAuthors` 호출해 CardAuthor 1행 생성 (primary).
- **[IN-A3]** `POST /api/external/cards` — Canva publish path 도 동일.
- **[IN-A4]** `POST /api/boards` assignment branch — slot Card 생성 시 CardAuthor 1행.
- **[IN-A5]** `GET /api/classroom/[id]/students` — teacher-only 학급 학생 리스트 (CardAuthorEditor 용).

### 1.4 page.tsx + props (IN-P)
- **[IN-P1]** `src/app/board/[id]/page.tsx` card 쿼리에 `include: { authors: { orderBy: { order: "asc" } } }`.
- **[IN-P2]** `cardProps` 에 `authors: AuthorDTO[]` 추가.
- **[IN-P3]** `DraggableCard.CardData` 타입에 `authors?: AuthorDTO[]`.

### 1.5 UI (IN-U)
- **[IN-U1]** `src/components/cards/CardAuthorFooter.tsx` — `authors` prop 받아 `formatAuthorList` 로 렌더. 기존 `pickAuthorName` fallback 유지.
- **[IN-U2]** `src/components/cards/CardAuthorEditor.tsx` NEW — modal:
  - 학급 학생 multi-select (체크박스 리스트, 번호순)
  - 선택된 학생 reorder (위/아래 화살표 버튼, order=0 primary 표시)
  - optional free-form 추가 이름 (`studentId=null`, displayName 자유)
  - 최대 10명 클라이언트 측 가드
  - 저장 → `PUT /api/cards/[id]/authors`
- **[IN-U3]** ContextMenu 항목 "작성자 지정" 추가:
  - `ColumnsBoard.tsx` 카드 context menu
  - `BoardCanvas.tsx` DraggableCard 호버 메뉴 (현재 × 버튼만 있음 → 작성자 지정 버튼 추가)
  - `GridBoard.tsx` + `StreamBoard.tsx` 동일 패턴
- **[IN-U4]** `CardDetailModal` 에도 "작성자 지정" 버튼 (모달 내에서 접근 가능).

### 1.6 권한 (IN-R)
- **[IN-R1]** `canEditCard` 정의 보존 — primary studentAuthorId 기준. 공동 작성자 중 primary 만 편집 가능.
- **[IN-R2]** `PUT /api/cards/[id]/authors` 는 teacher-only 강제 — student identity 가 author 재지정 못 함.

### 1.7 테스트 (IN-T)
- **[IN-T1]** `src/lib/__tests__/card-author.vitest.ts` — `formatAuthorList` 8+ case (0/1/2/3/4+명, fallback, null student).
- **[IN-T2]** `src/lib/__tests__/card-authors-service.vitest.ts` — mock Prisma TX 로 `setCardAuthors` 멱등성·order 정규화·primary mirror 검증 (8+ case).

## 2. OUT

| # | 항목 | 사유 |
|---|---|---|
| OUT-1 | 공동 작성자 학생에게 편집권 부여 | primary 단일 책임 원칙 유지. v2 |
| OUT-2 | AssignmentSlot 공동 작성자 | AB-1 설계 철학 (slot = 1 학생) 유지 |
| OUT-3 | `/parent/child/[sid]/cards` 피드 페이지 신설 | 카드 피드 UX 자체 부재. CardAuthor 는 쿼리 준비만. 별 task |
| OUT-4 | event-signup 공동 신청 | 별 모델 |
| OUT-5 | 학생이 CardAuthor.displayName 편집 | 오남용 방지 — teacher-only |
| OUT-6 | CardAuthor 별 per-author 메타 확장 (기여 설명, 승인 상태) | YAGNI, v2 |
| OUT-7 | Bulk "한 번에 여러 카드 작성자 일괄 변경" | 사용 빈도 낮음. v2 |

## 3. Acceptance Criteria

- **AC-1** `CardAuthor` 테이블 생성 + 기존 `studentAuthorId` 1:1 backfill.
- **AC-2** `PUT /api/cards/[id]/authors` teacher → 200, student → 403, anon → 401.
- **AC-3** PUT 바디: `{ authors: [{ studentId?, displayName }, ...] }`. 최대 10명. 중복 studentId 400.
- **AC-4** PUT 후 Card.studentAuthorId = authors[0].studentId, Card.externalAuthorName = 1명이면 해당 이름·2+명이면 `formatAuthorList` 결과.
- **AC-5** `POST /api/cards` 학생 publish → CardAuthor 1행 (studentId=me, displayName=me.name, order=0) 자동 생성.
- **AC-6** `POST /api/external/cards` Canva publish → 동일.
- **AC-7** `POST /api/boards` assignment layout 트랜잭션 → slot 마다 CardAuthor 1행.
- **AC-8** 카드 렌더 footer: 1명="김철수", 2명="김철수, 이영희", 3명="김철수, 이영희, 박민수", 4+명="김철수 외 3명".
- **AC-9** ⋯ 메뉴 "작성자 지정" → CardAuthorEditor 모달 → 학급 학생 multi-select + reorder + 추가 이름.
- **AC-10** 학급 연결 없는 보드는 학생 picker 대신 free-form 입력만.
- **AC-11** 학생 삭제 시 CardAuthor.studentId = null 유지, displayName 은 남아 렌더됨.
- **AC-12** 공동 작성자 학생은 PATCH /api/cards/[id] 거부 (403) — primary 만 편집 가능.
- **AC-13** `formatAuthorList` unit tests 8+ pass.
- **AC-14** `setCardAuthors` service unit tests 8+ pass.
- **AC-15** Vitest 전체 + tsc + build 모두 green.
- **AC-16** 기존 parent v2 / assignment AB-1 / role-cleanup regression 0.

## 4. 위험 요소

### 4.1 R1 (HIGH) primary mirror 일관성
`Card.studentAuthorId` 와 `CardAuthor[order=0].studentId` 가 항상 일치해야 하는데, PUT 외 경로에서 어긋나면 렌더 깨짐.
- 대응: `setCardAuthors` 만이 두 필드 쓰도록 강제. 다른 경로(legacy create)는 1 author 기본 생성으로 커버.

### 4.2 R2 (MED) 마이그레이션 순서
CardAuthor 테이블 생성 → 백필 → Card.studentAuthorId 유지. 배포 실수로 백필이 누락되면 기존 카드의 작성자 footer 가 빈 값.
- 대응: migration SQL 에 백필 UPDATE 를 CREATE 직후 포함 (role-cleanup Gap A 교훈).

### 4.3 R3 (MED) 학생 삭제 cascade
`Student onDelete: Restrict` + CardAuthor `onDelete: SetNull on studentId` — 학생 삭제 차단됨 (AssignmentSlot 제약). 기존 제약 그대로 유지, 문제 없음.

### 4.4 R4 (LOW) CardAuthor 쿼리 N+1
page.tsx 에서 `include: authors` 사용 → Prisma 가 JOIN 으로 1 쿼리로 처리. N+1 없음.

### 4.5 R5 (LOW) UI 성능
카드마다 authors[] 병렬 렌더 — 평균 1-2명 예상. 보드당 최대 100 카드 × 평균 2 = 200 entry. 영향 미미.

## 5. Phase 2 판정

**PASS** — IN 19건 / OUT 7건 / AC 16개 / 리스크 5건. phase3 architect 진입.
