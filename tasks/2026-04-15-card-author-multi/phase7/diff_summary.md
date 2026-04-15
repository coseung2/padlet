# Phase 7 Diff Summary · card-author-multi

## 검증
- `npx tsc --noEmit` ✅
- `npx vitest run` ✅ 5 files / 54 tests
- `npm run build` ✅
- `npx prisma migrate deploy` ✅ (20260415_add_card_author 적용됨)

## 구현 요약
phase2 IN 19 전부 수행. β 옵션 (CardAuthor join table) 정식 구현.

### 스키마
- CardAuthor (cardId, studentId?, displayName, order, createdAt) + 3 indexes + FKs (Cascade on cardId, SetNull on studentId)
- 기존 studentAuthorId + externalAuthorName 는 primary mirror 로 보존
- migration 백필 완료 — 기존 student-authored 카드 order=0 CardAuthor 1행 생성

### 서버
- `setCardAuthors(tx, cardId, inputs, opts)` — 트랜잭션 helper. delete+batch create+mirror update. validation: 최대 10명, dup studentId, displayName length, classroomId membership guard (opt).
- `PUT /api/cards/[id]/authors` teacher-only replace-all.
- `POST /api/cards` / `POST /api/external/cards` / `POST /api/boards` (assignment) / roster-sync 전부 CardAuthor 자동 시드.
- `GET /api/classroom/[id]/students` teacher-only roster.

### 클라이언트
- formatAuthorList: 0=pickAuthorName fallback, 1=name, 2-3=comma, 4+="name 외 N명".
- CardAuthorFooter / CardBody 가 authors prop 수용.
- CardDetailModal에 onEditAuthors prop — 교사 호출 시 "👥 작성자 지정" 버튼 렌더.
- CardAuthorEditor 모달: 학급 roster 체크박스 리스트 + 선택된 작성자 reorder + free-form row 추가. 최대 10명 cap.
- 4개 카드 보드 (freeform/grid/stream/columns) 전부 CardAuthorEditor 배선 + classroomId prop.

### Karpathy 감사
- Think: phase1 α/β 비교 후 β 선택 근거 명시. B1~B8 답 전부 phase2/3 추적 가능.
- Simplicity: 최소한의 primitive 확장. Role 타입 미변경. parent-scope 미변경 (미래 hook 만 명시).
- Surgical: 기존 Card 필드 유지, requirePermission 경로 미변경, CardDetailModal에 단일 prop 추가.
- Goal-driven: 21 신규 vitest + tsc + build + migration 모두 green.

## AC 매핑
| AC | 파일 / 결과 |
|---|---|
| AC-1 schema+backfill | migration.sql + 실DB 적용 |
| AC-2 PUT auth | api/cards/[id]/authors — teacher-only, 학생/anon 403 |
| AC-3 validation | setCardAuthors + Zod (max 10, dup, length) |
| AC-4 primary mirror | setCardAuthors Card.update |
| AC-5 POST student stamp | api/cards 학생 path trx |
| AC-6 POST external stamp | api/external/cards 동일 |
| AC-7 POST boards assignment | api/boards/route.ts + roster-sync |
| AC-8 render | CardAuthorFooter + formatAuthorList (10 test cases) |
| AC-9 modal | CardAuthorEditor.tsx |
| AC-10 free-form only | classroomId=null branch 학생 picker 숨김 |
| AC-11 student delete | CardAuthor onDelete SetNull |
| AC-12 student 편집 불가 | canEditCard primary 기준 — 기존 role-cleanup primitive 그대로 |
| AC-13 formatAuthorList tests | card-author.vitest.ts (10 tests) |
| AC-14 service tests | card-authors-service.vitest.ts (11 tests) |
| AC-15 tsc+build+vitest | all green |
| AC-16 regression | assignment AB-1 24 tests + parent v2 16 + card-permissions 17 = 57 tests 전부 pass |

## 미구현 (phase2 OUT 그대로)
- 공동 작성자 편집권
- AssignmentSlot 공동 작성자
- parent 피드 페이지 신설
