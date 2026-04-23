# Design Doc — question-board

## 1. 데이터 모델 변경

### Board 확장 (기존 테이블)

```prisma
model Board {
  // ...기존 필드
  questionPrompt           String?  // 교사가 설정한 주제 (레이아웃=question-board 일 때만 의미)
  questionVizMode          String   @default("word-cloud")
  // enum 아니라 string — 미래 시각화 추가 시 마이그레이션 불필요
  // 허용값: "word-cloud" | "bar" | "pie" | "timeline" | "list"
}
```

마이그레이션: `20260423_question_board_v1/migration.sql` — ADD COLUMN 2개. 기본값 세팅으로 기존 보드는 영향 없음.

### BoardResponse (신규)

```prisma
model BoardResponse {
  id              String   @id @default(cuid())
  boardId         String
  board           Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  studentId       String?  // student 기반 응답
  student         Student? @relation(fields: [studentId], references: [id], onDelete: SetNull)
  userId          String?  // 교사 시범 응답 허용 (드문 케이스)
  user            User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  text            String   @db.Text
  createdAt       DateTime @default(now())

  @@index([boardId, createdAt])
  @@index([boardId, studentId])
}
```

- `studentId` / `userId` 중 하나 NOT NULL 불변식은 API 가드에서 enforce (Prisma check constraint 생략).
- `onDelete: Cascade` (board) — 보드 삭제 시 응답도 사라짐.
- `onDelete: SetNull` (student/user) — 학생 삭제돼도 응답 텍스트는 남김 (히스토리 보존).

마이그레이션: 동일 `20260423_question_board_v1/migration.sql` 에 CREATE TABLE + 인덱스.

롤백: DROP TABLE BoardResponse + ALTER TABLE Board DROP COLUMN 2개.

## 2. API 변경

### `POST /api/boards/[id]/responses`
- **Req**: `{ text: string }` (min 1, max 500)
- **Auth**: 학생 or 교사 — 보드 멤버 or owner/editor role
- **Rate limit**: 학생당 분당 10회 (`src/lib/rate-limit-routes.ts` 패턴)
- **Effect**: `BoardResponse` insert + SSE `response_created` 브로드캐스트
- **Res**: `{ response: { id, text, studentId, userId, createdAt } }`

### `GET /api/boards/[id]/responses`
- **Req**: 없음 (쿼리 `?limit=100` 정도만)
- **Auth**: 보드 멤버
- **Res**: `{ responses: Array<{...}>, count: number }` — 시간 내림차순, 기본 200개 cap

### `DELETE /api/boards/[id]/responses/[responseId]`
- **Auth**: board owner/editor only
- **Effect**: hard delete + SSE `response_deleted`
- **Res**: `{ ok: true }`

### `PATCH /api/boards/[id]/question-config`
- **Req**: `{ prompt?: string, vizMode?: "word-cloud"|"bar"|"pie"|"timeline"|"list" }`
- **Auth**: owner/editor only
- **Effect**: Board 업데이트 + SSE `question_config_updated` + `touchBoardUpdatedAt`
- **Res**: `{ board: { id, questionPrompt, questionVizMode } }`

### SSE 이벤트 추가 (`/api/boards/[id]/stream`)

| event | data |
|---|---|
| `response_created` | `{ response: {...} }` |
| `response_deleted` | `{ responseId: string }` |
| `question_config_updated` | `{ questionPrompt, questionVizMode }` |

기존 stream route 의 poll 루프에 Board.updatedAt 감지 → diff 전송 포트 재사용.

## 3. 컴포넌트 변경

### 웹

```
src/components/QuestionBoard.tsx            # 레이아웃 entry (client)
├── QuestionBoardTeacherPanel.tsx           # 교사용 주제·모드 컨트롤
├── QuestionBoardStudentInput.tsx           # 학생 응답 입력창
└── QuestionBoardVisualization.tsx          # 모드에 따라 아래 5개 중 하나 렌더
    ├── viz/WordCloudViz.tsx                # d3-cloud (dynamic import, ssr:false)
    ├── viz/BarChartViz.tsx                 # SVG 직접 렌더
    ├── viz/PieChartViz.tsx                 # SVG 직접 렌더
    ├── viz/TimelineViz.tsx                 # 세로 스택
    └── viz/ResponseListViz.tsx             # 리스트
```

진입 경로: `src/app/board/[id]/page.tsx` 의 layout switch 문에 `case "question-board":` 추가 → `<QuestionBoard />` 렌더.

### 모바일

```
apps/mobile/components/layouts/QuestionBoard.tsx
├── 교사 모드: 주제·시각화 선택 드롭다운
├── 학생 입력: TextInput
└── 시각화: BarChartViz + ResponseListViz 만 (워드클라우드·파이·타임라인은 MVP 제외)
```

### 상태 위치

- **Server-fetched (initial)**: `board.questionPrompt`, `board.questionVizMode` — board 페이지 로딩 시
- **Server-fetched (list)**: 응답 배열 — 초기 렌더 때 GET
- **Realtime (delta)**: 신규 응답·모드 변경 → SSE
- **Client-local**: 학생의 드래프트 입력, 시각화 렌더 캐시 (memoize)

### layout-meta 확장

```ts
export type LayoutKey = ... | "question-board";

LAYOUT_META["question-board"] = { emoji: "💭", label: "질문 보드" };
```

## 4. 데이터 흐름 다이어그램

### 학생 응답 제출

```
Student UI → POST /responses → Prisma INSERT → touchBoardUpdatedAt
                                              → SSE poll detects → emit response_created
                                              ↓
Teacher UI ← SSE response_created ← stream route
Other students ← SSE response_created
```

### 교사 모드 변경

```
Teacher UI → PATCH /question-config → Prisma UPDATE Board
                                    → SSE emit question_config_updated
                                    ↓
All students ← SSE question_config_updated → 시각화 컴포넌트 swap
```

### 워드클라우드 렌더

```
responses[] → tokenize (split + 조사 strip + len>=2) 
            → frequency Map 
            → top 60 → d3-cloud layout (requestIdleCallback) 
            → svg render
```

## 5. 엣지케이스 (7개)

### E-1 빈 상태
- 응답 0개 → 각 시각화 컴포넌트는 "아직 응답이 없어요" 플레이스홀더 렌더. 워드클라우드도 빈 SVG 가 아닌 플레이스홀더.

### E-2 네트워크 단절 (학생)
- POST 실패 → 입력창 상단에 "전송 실패, 다시 시도" 인라인 에러. 로컬 draft 는 유지.

### E-3 동시 응답 폭주 (수업 시작 직후)
- 30명이 5초 내 일제 POST → rate limit 은 학생당 10/분이므로 통과. DB INSERT 만 발생해 lock 경쟁 없음.
- SSE 브로드캐스트는 poll 간격(기본 1~2초) 때문에 한 tick 에 묶여서 배치로 송출.

### E-4 교사가 mode 를 연속 전환
- PATCH 여러 번 → 마지막 값이 win. SSE 는 stateless 라 중간 상태가 학생 화면에 깜빡일 수 있으나 최종 수렴.

### E-5 매우 긴 응답
- `text` 500자 제한 (API). 시각화에서 50자 초과는 ellipsis. 워드클라우드는 split 기반이라 자연히 단어 단위로 쪼개짐.

### E-6 같은 학생 중복 입력
- 허용. 같은 단어 N번 입력하면 워드클라우드에서 N번 집계 → 의도된 동작 (학생들이 동의 = 빈도 증가).

### E-7 권한 박탈 중 응답
- 학생이 POST 중 board 탈퇴/밴 → API 가 403 반환. 이미 들어간 이전 응답은 남음 (히스토리).

### E-8 보드 레이아웃 변경
- 보드를 question-board 가 아닌 다른 레이아웃으로 전환 → BoardResponse 는 남지만 UI 에서 안 보임. 다시 question-board 로 바꾸면 되살아남. 데이터 손실 없음.

## 6. DX 영향

- 타입: `LayoutKey` 유니온 확장 → 모든 switch 문이 exhaustive 체크로 컴파일 에러 → 수작업 처리 필요
- Prisma: `npx prisma generate` 필요 (postinstall 에 이미 있음)
- 린트/테스트: 기존 vitest 구조 재사용. 단어 tokenizer 유닛 테스트 추가 (`tokenize.vitest.ts`)
- 빌드: 번들에 `d3-cloud` (~15KB) + `d3-scale`·`d3-selection` 등 deps 포함. `dynamic import` 로 lazy load 해 초기 번들 영향 없음.
- 배포: 마이그레이션 자동 적용 (`build` 스크립트의 `prisma migrate deploy`).

## 7. 롤백 계획

### 코드 롤백
- 프런트: layout switch 에서 `question-board` case 제거, 컴포넌트 삭제, LAYOUT_META 에서 키 제거
- API: `/responses`, `/question-config` 라우트 파일 삭제
- SSE: 추가한 이벤트 타입만 제거 (기존 poll 로직은 유지)

### DB 롤백
- 마이그레이션 되돌리기 (down 스크립트 작성): DROP TABLE BoardResponse + ALTER TABLE Board DROP COLUMN 2개
- 이미 생성된 question-board 보드는 기본값이 다른 layout 로 revert 필요 → SQL 핫픽스 제공

### 롤백 트리거 조건
- 워드클라우드 렌더가 태블릿 기준 5초 초과
- 실시간 SSE 누락률 > 5%
- 학생 응답 rate limit 회피로 DoS 발생

롤백 커밋 템플릿은 phase10 deployer 에서 준비.
