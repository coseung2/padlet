# Design Doc — student-portfolio

## 1. 데이터 모델 변경

### 신규 모델: `ShowcaseEntry`

scope_decision R4 결정대로 학생-카드 슬롯을 별도 테이블로 분리. `Card.isShowcased boolean` 안 채택 — 공동작성자 케이스에서 학생별 슬롯 카운트가 어색해짐 (한 카드를 두 학생이 각자 자기 자랑해요로 등록).

```prisma
model ShowcaseEntry {
  id        String   @id @default(cuid())
  cardId    String
  studentId String   // 어느 학생의 자랑해요 슬롯에 매핑되는지
  classroomId String // 학급 메인화면 highlight 쿼리 가속용 (denorm)
  createdAt DateTime @default(now())

  card     Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  student  Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([cardId, studentId])
  @@index([studentId])
  @@index([classroomId, createdAt])
}
```

`Card` 와 `Student` 양쪽에 reverse relation 추가:

```prisma
model Card {
  // ... 기존 ...
  showcaseEntries ShowcaseEntry[]
}

model Student {
  // ... 기존 ...
  showcaseEntries ShowcaseEntry[]
}
```

### 마이그레이션

- 신규 테이블 생성만. 기존 row touch X. zero-downtime FF.
- 마이그레이션 이름: `20260426_showcase_entry`
- 롤백: `prisma migrate resolve --rolled-back 20260426_showcase_entry` 후 테이블 drop. `Card.showcaseEntries` 관계는 사용처가 신규 코드 한정이라 백워드 안전.

### 인덱스 사유

- `@@unique([cardId, studentId])` — 한 학생 한 카드 1슬롯 강제 (R3 race condition + R4 공동작성자)
- `@@index([studentId])` — 학생별 슬롯 카운트 쿼리 (한도 체크)
- `@@index([classroomId, createdAt])` — 학급 dashboard highlight 정렬 (CreatedAt DESC, LIMIT N)

---

## 2. API 변경

### 신규 라우트

#### `GET /api/student-portfolio/:studentId`

학생의 카드 모음 (포트폴리오 페이지 우측 그리드용).

- **인증**: NextAuth user (교사) 또는 student session (같은 학급 학생) 또는 parent session (자녀 연결된 경우)
- **권한 가드**: `viewerKind` 별 분기
  - student: 자기 학급 학생만 조회 가능
  - parent: `ParentChildLink.status=approved` 자녀거나, 자녀 학급의 자랑해요만
  - teacher: 보드 owner면 학급 내 모두
- **응답**:
  ```ts
  {
    student: { id, name, number },
    cards: Array<{
      id, title, content, color, imageUrl, linkUrl, linkTitle,
      linkImage, videoUrl, fileUrl, fileName, fileMimeType,
      attachments: AttachmentDTO[],
      sourceBoard: { id, slug, title, layout },
      sourceSection: { id, title } | null,  // 주제별 보드만 non-null
      isShowcasedByMe: boolean,  // 호출자가 등록한 자랑해요 여부
      createdAt: ISO8601,
    }>,
  }
  ```
- **쿼리 한 번**: Prisma `include: { board: true, section: true, attachments: true, showcaseEntries: { where: { studentId: ctx.studentId } } }` (R2 N+1 방지)

#### `GET /api/student-portfolio/roster?classroomId=:cid`

좌측 학생 리스트 + 학생별 작품 수.

- **인증**: 위와 동일
- **응답**:
  ```ts
  {
    classroom: { id, name },
    students: Array<{ id, name, number, cardCount, showcaseCount }>,
  }
  ```
- **단일 쿼리**: Prisma raw `groupBy` 또는 `_count` aggregation.

#### `POST /api/showcase`

자랑해요 토글 ON.

- **요청**: `{ cardId: string }`
- **세션**: student session 만 허용 (학생 본인 카드 또는 공동작성자)
- **권한 가드**:
  1. `Card.studentAuthorId === me OR me ∈ Card.authors[].studentId` (작성자/공동작성자)
  2. `Card.boardId` 의 `board.classroomId === me.classroomId`
- **트랜잭션** (R3 race):
  ```sql
  BEGIN;
  SELECT COUNT(*) FROM ShowcaseEntry WHERE studentId = $me FOR UPDATE;
  -- count >= 3: ROLLBACK + 409 { error: "limit_exceeded", current: [{cardId, title}, ...] }
  -- count < 3: INSERT, commit
  COMMIT;
  ```
- **응답 성공**: `201 { entry: { id, cardId, studentId, createdAt } }`
- **응답 실패**: `409 { error: "limit_exceeded", showcased: [{cardId, title, ...}] }` — 클라이언트가 모달 노출
- **realtime publish**: `publish(classroomShowcaseChannelKey(classroomId), { type: "showcase_added", cardId, studentId })` (no-op placeholder 그대로)

#### `DELETE /api/showcase/:entryId` (또는 `DELETE /api/showcase?cardId=X&studentId=me`)

자랑해요 토글 OFF.

- **세션**: student session, 본인 슬롯만 해제 가능
- **응답**: `204 No Content`
- **realtime**: `{ type: "showcase_removed", cardId, studentId }`

#### `GET /api/showcase/classroom/:classroomId`

학급 메인 dashboard highlight 영역 데이터.

- **인증**: 학급 학생 또는 학급 자녀의 학부모 또는 교사
- **응답**:
  ```ts
  {
    entries: Array<{
      cardId, studentId, studentName, studentNumber,
      card: { id, title, content, color, imageUrl, ... 카드 동일 },
      sourceBoard, sourceSection,
      createdAt: ISO8601,
    }>,
  }
  ```
- 정렬: `createdAt DESC LIMIT 30` (페이지네이션은 v2)

#### `GET /api/parent/portfolio?childId=:sid`

학부모 뷰. 자녀 카드 ∪ 자녀 학급 자랑해요.

- **인증**: parent session
- **권한 가드**: `ParentChildLink.status=approved AND parentId=me AND studentId=$childId`
- **응답**: 자녀 본인 카드 (전부) + 자녀 학급의 ShowcaseEntry (자녀 외 학생 것 포함하되 카드 자체가 자랑해요여야)
- AC-8 보장: 자녀 외 학생의 비-자랑해요 카드는 응답 0건

### 실시간 이벤트

기존 `src/lib/realtime.ts` 패턴 재사용. 신규 채널 키 헬퍼:

```ts
// src/lib/realtime.ts 추가
export function classroomShowcaseChannelKey(classroomId: string) {
  return `classroom:${classroomId}:showcase`;
}
```

이벤트 타입 (delivery: best-effort, dashboard 페이지가 구독):
- `showcase_added` — `{ cardId, studentId, classroomId, createdAt }`
- `showcase_removed` — `{ cardId, studentId, classroomId }`

`publish()` 는 현재 no-op 이라 SSE 인프라 미존재. v1 은 dashboard 페이지가 진입 시 1회 fetch + 30초 폴링으로 fallback (success_metric "< 3s" 만족 → 200ms refetch는 토글 즉시 자기 화면에서만, 다른 학생 화면 반영은 폴링 또는 다음 진입 시).

### 권한 가드 패턴

`src/lib/portfolio-acl.ts` (신규):

```ts
export type PortfolioViewer =
  | { kind: 'student'; id: string; classroomId: string }
  | { kind: 'parent'; id: string; childIds: string[]; childClassroomIds: string[] }
  | { kind: 'teacher_owner'; id: string; classroomIds: string[] };

export async function resolvePortfolioViewer(): Promise<PortfolioViewer | null>;
export function canViewStudent(viewer, targetStudentId, targetClassroomId): boolean;
export function canToggleShowcase(viewer, card): boolean;
```

기존 [`rbac.ts`](../../../src/lib/rbac.ts) 보드/섹션 패턴과 분리 — 포트폴리오는 학급 단위 권한이라 별도 helper.

---

## 3. 컴포넌트 변경

### 신규 페이지

```
/student/portfolio
  └─ src/app/student/portfolio/page.tsx     [server component]
      └─ <PortfolioPage />                  [client]
          ├─ <PortfolioRoster />             좌측 학생 리스트
          ├─ <PortfolioStudentView />        우측 그리드
          │   ├─ <PortfolioCardItem />       카드 1개 (출처 라벨 + 🌟 배지)
          │   └─ <ShowcaseLimitModal />      4번째 토글 시 한도 모달
          └─ (모바일) <PortfolioMobileStack /> ≥768px 미만 stack 뷰

/student (기존)
  └─ <ShowcaseHighlightStrip />              [신규] 상단 가로 carousel
      └─ <ShowcaseCardChip />                자랑해요 카드 압축형

/parent/portfolio
  └─ src/app/parent/portfolio/page.tsx       [server]
      └─ <ParentPortfolioPage />             [client]
          ├─ <ParentChildSelector />          다자녀 시 셀렉터
          └─ <PortfolioStudentView />         (재사용)
```

### 신규 디렉토리 구조

```
src/components/portfolio/
├── PortfolioPage.tsx              메인 컨테이너
├── PortfolioRoster.tsx            좌측 학생 리스트
├── PortfolioStudentView.tsx       우측 그리드
├── PortfolioCardItem.tsx          카드 1개 (출처라벨 + 🌟 + 메뉴)
├── ShowcaseLimitModal.tsx         한도 초과 모달
├── ShowcaseHighlightStrip.tsx     /student dashboard 상단 영역
├── ShowcaseCardChip.tsx           highlight 영역 카드
├── ParentChildSelector.tsx        다자녀 셀렉터
├── useShowcaseToggle.ts           토글 훅 (낙관적 + 409 롤백)
├── usePortfolioRoster.ts          로스터 훅
└── source-label.ts                출처 라벨 빌더 ({보드}·{칼럼})
```

### 상태 위치

- **server (page.tsx)**: 초기 로스터 + 본인 자랑해요 카운트 SSR
- **client (PortfolioPage)**: 선택된 studentId, 자랑해요 모달 상태, optimistic showcase toggle
- **realtime (channel)**: `classroom:{cid}:showcase` (publish는 no-op이라 v1 폴링)

### 재사용

- `CardBody` (이미 비대 정리됨) — 기본 카드 본문 렌더
- `ContextMenu` — 카드 우클릭 메뉴 (자랑해요 토글 항목 추가)
- 학부모 뷰는 `PortfolioStudentView` 재사용 (권한 필터는 API에서)

---

## 4. 데이터 흐름 다이어그램

### 포트폴리오 페이지 (학생 진입)

```
[학생 브라우저]
   │ GET /student/portfolio
   ▼
[page.tsx server component]
   │ resolvePortfolioViewer() → { kind:'student', id, classroomId }
   │ fetch roster (Prisma _count groupBy)
   ▼
[PortfolioPage client]
   │ defaultStudentId = self
   │ ↓ click 다른 학생
   │ GET /api/student-portfolio/{otherId}
   ▼
[API route]
   │ canViewStudent() guard
   │ Prisma findMany cards include board/section/attachments
   ▼
[response]
   │ cards[].sourceBoard / sourceSection 메타 동봉
   ▼
[PortfolioStudentView 렌더]
   │ sourceLabel(card) 빌드 → "{보드 제목} · {칼럼}"
   │ isShowcasedByMe → 🌟 배지 표시
```

### 자랑해요 토글

```
[학생 카드 우클릭 → "🌟 자랑해요"]
   │
   ▼
[useShowcaseToggle 훅]
   │ optimistic: cards[i].isShowcasedByMe = true
   │ POST /api/showcase { cardId }
   ▼
[API route 트랜잭션]
   │ COUNT WHERE studentId=me FOR UPDATE
   │ ├─ < 3: INSERT, commit, publish
   │ └─ ≥ 3: ROLLBACK, return 409 { showcased: [...] }
   ▼
[클라이언트]
   │ ├─ 201: confirm optimistic
   │ └─ 409: rollback + ShowcaseLimitModal 노출
   │      └─ 사용자가 1개 선택 → DELETE 후 재시도
```

### 학부모 뷰

```
[학부모] GET /parent/portfolio?childId=X
   ▼
[API route]
   │ session: parent.id
   │ assert ParentChildLink(parentId, X, status=approved)
   │ Prisma:
   │   - cards WHERE studentAuthorId=X OR authors.studentId=X
   │   - showcaseEntries WHERE classroomId=child.classroomId
   ▼
[response: 자녀 카드 union 학급 자랑해요]
```

---

## 5. 엣지케이스 (≥5)

| # | 케이스 | 처리 |
|---|---|---|
| E1 | 학급 학생 0명 (신규 학급) | 좌측 리스트 빈 상태 안내 + "교사가 학생 추가 후 사용 가능" |
| E2 | 본인이 자기 학급 아닌 다른 학급 학생 portfolio 직접 URL 접근 | API 403, 페이지에서 "접근 권한 없음" |
| E3 | 학생 카드 0개 | 우측 빈 상태 일러스트 + (본인이면) "보드에서 카드 만드세요" CTA |
| E4 | 카드 삭제 직후 자랑해요 stale 참조 | DB cascade (`onDelete: Cascade`) — ShowcaseEntry 자동 삭제. 클라 페이지가 stale 캐시면 다음 fetch 시 사라짐 |
| E5 | 동시 4번째 자랑해요 race (R3) | 트랜잭션 + `FOR UPDATE` lock — 한 쪽이 먼저 INSERT, 두 번째는 COUNT 시 3 봐서 409 |
| E6 | 학부모가 자녀 학급 변경된 직후 (학년 진급) | `ParentChildLink` 는 학생 따라감. `child.classroomId` 가 새 학급으로 바뀌었으면 학부모는 새 학급 자랑해요만 노출 (자동 follow). 기존 학급 데이터 누출 X |
| E7 | 카드의 출처 보드가 archived 상태 | API 응답에 `sourceBoard.archivedAt` 포함, UI에서 "📦 종료된 보드" 배지 + 카드 클릭 deep-link 비활성 |
| E8 | 자랑해요 등록자 ≠ 카드 작성자 (서버 위조 시도) | API 권한 가드 (canToggleShowcase) 차단, 403 |
| E9 | 다자녀 학부모인데 자녀 모두가 다른 학급 | ParentChildSelector 노출, 셀렉트 시 자녀의 classroomId 컨텍스트로 fetch |
| E10 | 모바일 폭 < 768px 두 칼럼 깨짐 (R7) | CSS breakpoint stack — 좌측 리스트 → 클릭 시 학생별 페이지로 push (라우터 진입) |

---

## 6. DX 영향

- **타입**: `PortfolioViewer`, `ShowcaseEntryDTO`, `PortfolioCardDTO` 신규. 기존 `CardData` 와 분리 (포트폴리오 컨텍스트는 source 메타 추가, sectionId/boardId 외 보드 슬러그·제목까지 동봉)
- **린트**: 신규 디렉토리 [`src/components/portfolio/`](../../../src/components/portfolio/). 기존 룰 그대로 적용
- **테스트**:
  - Unit: `source-label.ts` (보드 layout 별 라벨 생성)
  - Integration: API 권한 (AC-8 학부모 leak 0건 검증), showcase 한도 race
  - E2E: phase9 QA 가 Playwright 시나리오로 AC-1~AC-9
- **빌드**: Prisma migrate 신규 1건. CI build 단계에서 `prisma migrate deploy` 자동 실행
- **배포**: zero-downtime. 신규 테이블이라 기존 코드 영향 X

---

## 7. 롤백 계획

### 단계별

1. **코드 롤백**: `git revert {merge_commit}` → 페이지/API/컴포넌트 모두 제거. 기존 보드 기능 영향 X
2. **마이그레이션 롤백** (필요 시):
   ```bash
   npx prisma migrate resolve --rolled-back 20260426_showcase_entry
   psql $DATABASE_URL -c "DROP TABLE \"ShowcaseEntry\" CASCADE;"
   ```
   ShowcaseEntry 외 테이블 변경 없으므로 부수효과 0.
3. **데이터 보존 옵션**: 프로덕션에서 자랑해요 데이터를 살리고 싶다면 `pg_dump -t '"ShowcaseEntry"'` 백업 후 drop. 추후 v2 재출시 시 import 가능.

### 트리거 조건

- AC-8 학부모 leak 검출 시 즉시 롤백 (CRITICAL)
- 자랑해요 race 로 한도 초과 사례 발생 시 hotfix 우선 시도, 실패 시 롤백

---

## 핸드오프

phase4 design_planner 는 다음을 보강해야 한다:
- two-pane breakpoint 정확값 + 모바일 stack 인터랙션 (학생 리스트 → 상세 페이지 push 또는 sheet)
- 자랑해요 한도 모달 워딩 + 선택 UI 디테일
- highlight strip 가로 carousel 디자인 (썸네일 크기, 스크롤 방향, 더보기 토글)
- 출처 라벨 위치 + 타이포 weight (CardBody footer 영역에 padding 1줄 권장)
- 🌟 배지 위치(좌상단) + 색상(brand secondary)
