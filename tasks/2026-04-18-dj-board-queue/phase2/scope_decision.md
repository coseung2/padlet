# Scope Decision — dj-board-queue

## 1. 선택한 UX 패턴

`phase1/ux_patterns.json`에서 P1~P7 **전부 채택** (R1~R3는 명시적 거절).

- **P1 sticky now-playing + scrollable queue** — YouTube Music/JQBX 공통 보편 패턴 (research_pack §벤치마크 3종 비교 공통 관찰)
- **P2 role-aware affordance** — JQBX booth/floor 분리 모델 (research_pack §벤치마크 3). DJ ↔ 학생 권한 계층이 이 task의 본질
- **P3 status pill** — 기존 코드 `AssignmentBoard.tsx` 패턴 재사용 (benchmark_index.internal_references)
- **P4 submitter attribution** — 기존 Card.authors[] 인프라 재사용 (repo 내 `CardAuthorFooter`)
- **P5 thumbnail-primary identity** — 비디오 기반 UI 보편 (research_pack §1 YouTube Music)
- **P6 mouse drag-reorder** — 기존 `ColumnsBoard.tsx` 로직 재사용 (benchmark_index.internal_references)
- **P7 optimistic mutation + SSE reconcile** — 기존 `trackCardMutation` 재사용

**거절된 패턴 재확인**:
- R1 voting — phase0 queue_semantics=A1 확정으로 out
- R2 synchronized iframe playback — 실시간 엔진 필요, 별도 task
- R3 multi-DJ round-robin — 학급 시나리오 과함. 데이터 모델은 여러 `ClassroomRoleAssignment`로 확장 가능

## 2. MVP 범위

### 포함 (IN)

**데이터 모델 (phase3 architect 확정)**
- `ClassroomRoleDef` 신규 테이블 (key/labelKo/emoji/description)
- `BoardLayoutRoleGrant` 신규 테이블 (classroomRoleId × boardLayout → grantedRole)
- `ClassroomRoleAssignment` 신규 테이블 (classroomId + studentId + classroomRoleId unique)
- `Card.queueStatus` nullable 컬럼 추가 ("pending"|"approved"|"played"|"rejected")
- seed: `dj` ClassroomRoleDef + `(dj × dj-queue → owner)` BoardLayoutRoleGrant 1 row씩

**권한 resolver**
- `src/lib/rbac.ts`에 `getEffectiveBoardRole(boardId, {userId?, studentId?})` 신규 함수
- 기존 `getBoardRole` · `requirePermission` 호출부 17곳은 **그대로 유지** (비-DJ 경로는 불변)
- 정밀 precedence: teacher(BoardMember) > classroom-role-granted-student > classroom-student-viewer > null

**API 엔드포인트 (신규)**
- `POST /api/boards` — `dj-queue` 레이아웃 허용 (기존 라우터 z.enum 확장)
- `POST /api/boards/:id/queue` — 학생/교사 곡 제출 (Card + queueStatus="pending")
- `PATCH /api/boards/:id/queue/:cardId` — 상태 변경(approve/reject/played)
- `PATCH /api/boards/:id/queue/:cardId/move` — 순서 변경 (order 업데이트)
- `DELETE /api/boards/:id/queue/:cardId` — 삭제 (DJ/교사 또는 pending 상태 본인 곡)
- `GET /api/classrooms/:id/roles` — 역할 목록 + 할당 현황 (교사 전용)
- `POST /api/classrooms/:id/roles/assign` — {studentId, roleKey} 할당
- `DELETE /api/classrooms/:id/roles/assign/:assignmentId` — 해제

**API 엔드포인트 (수정)**
- `GET /api/boards/:id/stream` — 학생 세션 인증 허용(`getCurrentStudent`), `queueStatus` wire에 추가

**UI 컴포넌트 (신규)**
- `src/components/DJBoard.tsx` — DJ 큐 보드 셸
- `src/components/dj/DJQueueList.tsx` — 정렬 리스트 렌더
- `src/components/dj/DJQueueItem.tsx` — 1행 (썸네일 + 제목 + 제출자 + status + DJ 액션)
- `src/components/dj/DJSubmitForm.tsx` — URL 입력 모달
- `src/components/dj/DJNowPlayingHeader.tsx` — 최상단 pinned Now-Playing
- `src/components/classroom/ClassroomDJRolePanel.tsx` — 교사용 DJ 역할 할당 패널 (DJ 전용 UI, 범용 패널 아님)
- `src/app/board/[id]/page.tsx` — `case "dj-queue":` renderBoard 분기
- `src/components/CreateBoardModal.tsx` — `{id: "dj-queue", label: "DJ 큐", emoji: "🎧"}` 옵션
- `src/app/classroom/[id]/page.tsx` — DJ 역할 할당 패널 플러그인

**YouTube URL validation**
- 클라이언트: `youtube.com/watch?v=*` · `youtu.be/*` 정규식
- 서버: 동일 검증 + 스토어 전 URL normalize

**성공 측정 자동화**
- typecheck + build 통과
- phase9 QA 브라우저 수동/e2e 각 AC 체크

### 제외 (OUT)

| 제외 항목 | 이유 | 후속 예정 |
|---|---|---|
| 실제 YouTube iframe 동기 재생 | WebRTC/WebSocket 필요, real-time engine 재선정 | 향후 real-time task |
| 업보트/좋아요 | phase0 A1 확정, A2 별도 | 반응 시스템 별도 task |
| 다중 DJ 순번제 | 학급 시나리오 과함 | 동일 모델로 future |
| 범용 "학급 역할 관리" 패널 (사서/은행원 할당 UI 포함) | 이번은 DJ 전용만. 두 번째 역할 도입 시점에 패널 일반화 | "role-admin-panel" task |
| 키보드 드래그 접근성 | MVP 제외, ColumnsBoard와 동일 수준 유지 | a11y 별도 task |
| 부적절 콘텐츠 자동 탐지 | 운영 과제, 현재는 DJ/교사 승인 게이트로 대체 | moderation task |
| YouTube API 메타데이터 (channelName 정확) | oEmbed(공개 엔드포인트) 활용. 딥메타는 out | 필요 시 YouTube Data API task |
| 검색 UI (YouTube 내부 검색) | 학생이 URL을 복사해 붙여넣는 방식 | 검색 UX task |
| 예약/자동 재생 (timeBox) | MVP 포인터 단순 | 향후 |

### 스코프 결정 모드

**Selective Expansion**

- Expansion 요소: classroom-role 시스템 자체가 새로 도입됨 (데이터 모델 3테이블 + resolver 1함수). 순수 UI 기능보다 구조적 의미 큼.
- Selective 요소: UI는 DJ에 한정, 범용 역할 패널은 의도적으로 out. 데이터 모델만 범용이고 UI는 좁게.
- Hold/Reduction 아님: 이 task가 향후 사서/은행원의 **기반 층**이라 지금 결정 지연 = 기술 부채.

## 3. 수용 기준 (Acceptance Criteria)

### 핵심 기능 (AC-1 ~ AC-7)

- **AC-1**: 교사가 `/classroom/:id`에서 특정 학생에게 "DJ" 역할을 부여하면 DB에 `ClassroomRoleAssignment` 1행이 생성되고 UI 목록에 반영된다.
- **AC-2**: DJ 역할 학생이 DJ 큐 보드에 접속하면 드래그 핸들/승인/거부/삭제 컨트롤이 노출된다 (= `effectiveRole === "owner"`).
- **AC-3**: DJ 역할 학생이 큐 항목을 드래그하여 순서를 바꾸면 `Card.order`가 서버에 저장되고 새로고침 후에도 유지된다.
- **AC-4**: DJ 역할 학생이 "승인"/"거부"/"다음으로" 버튼을 누르면 `Card.queueStatus`가 해당 값으로 전이되고 다른 세션에서 3초 이내 SSE로 전파된다.
- **AC-5**: 비-DJ 학생이 동일 학급의 DJ 보드에 접속하면 곡 제출 버튼만 노출되고, curl 등으로 PATCH/reorder API를 직접 호출해도 서버가 403을 반환한다.
- **AC-6**: 비-DJ 학생이 YouTube URL을 제출하면 `queueStatus="pending"`으로 큐에 추가되고 제출자(author)로 학생 attribution이 표시된다.
- **AC-7**: YouTube 외 URL(`https://example.com/song` 등) 제출 시 클라이언트에서 차단되고 서버 POST 요청도 400을 반환한다.

### 확장성/안정성 (AC-8 ~ AC-10)

- **AC-8**: DJ 역할 학생이 같은 학급의 **다른 레이아웃 보드**(columns/assignment 등)에 접속하면 DJ 권한이 적용되지 않고 일반 학생 뷰어로 처리된다 (= `BoardLayoutRoleGrant` 데이터 매칭 없음).
- **AC-9**: 교사가 DJ 역할을 revoke하면 30초 이내(SSE permission recheck 주기 ≤60초) 해당 학생의 DJ 컨트롤이 UI에서 사라지고, 그 사이의 mutation 요청도 서버가 403 반환.
- **AC-10**: typecheck(`npm run typecheck`) + build(`npm run build`) 둘 다 에러 없이 통과. Prisma migration은 `dev` + `deploy` 양쪽 모두 실행 성공.

## 4. 스코프 결정 모드

**Selective Expansion** (§2 참조)

신호 → phase3 architect에게:
- 데이터 모델은 범용 설계 (사서/은행원 추가는 row insert만)
- UI는 DJ 한정
- 기존 rbac 경로는 **절대 수정 금지** (17개 legacy 호출부 불변)

## 5. 위험 요소

### R1. 기존 rbac와 신규 resolver 경계 오염
`getEffectiveBoardRole`이 기존 `getBoardRole`을 호출하는데, 교사 경로는 완전히 기존 경로 그대로여야 함. 새 함수가 어느 이상 비-DJ 경로까지 건드리지 않도록 phase3에서 precedence 테이블 명시.

**완화**: phase3 `design_doc.md §3`에 precedence 테이블 + phase8 `/cso`에서 전부 검증.

### R2. SSE student 인증 확장이 다른 보드에 의도치 않은 노출 유발
현재 `/api/boards/:id/stream`은 교사 세션만 받음. 학생 세션을 허용하면 columns/plant 등 다른 보드도 학생이 stream 접근 가능해짐. 의도된 변경인지 확인 필요.

**완화**: 
- 실제로 다른 레이아웃은 이미 학생 접근 경로가 있음 (page.tsx에서 studentViewer fallback)
- stream에도 학생을 넣되, classroom membership 체크는 유지 (학급 외부 학생은 여전히 403)
- phase3에서 기존 학생 접근 허용 보드와 정합성 검증

### R3. Prisma migration 순서 (seed after table)
`ClassroomRoleDef` 시드 row는 테이블이 존재한 뒤 insert 되어야 함. Prisma seed 스크립트를 migration 이후에 돌리는 순서가 명확해야 prod에서 "DJ role row not found" 에러 방지.

**완화**: phase10 배포 플로우에 `prisma migrate deploy` → `prisma db seed --allow-missing-role` 순서 명시. seed를 idempotent하게.

### R4. YouTube URL 변형 다양성
`https://www.youtube.com/watch?v=ID&list=...`, `https://m.youtube.com/...`, `https://youtu.be/ID?t=30`, playlist URL, shorts URL 등. 정규식 하나로 다 커버하기 어렵고 향후 shorts/live 지원 결정 필요.

**완화**: phase3 `design_doc.md §API §YouTube URL normalize`에 허용 패턴 화이트리스트 + 추출된 `videoId`만 저장. non-standard는 400 rejection + 에러 메시지.

### R5. 동시 reorder race
DJ 2명(이 가능은 낮지만 교사+DJ 학생) 동시 드래그 시 order 충돌. 기존 `ColumnsBoard`가 이미 이 케이스를 `trackCardMutation` + server-side `normalizeOrder(boardId)`로 처리 중.

**완화**: 동일 패턴 재사용. phase7에서 카피.

### R6. classroom 없는 DJ 보드
DJ 보드는 classroom-scoped가 의미 있음 (DJ 역할이 classroom 단위). classroomId=null인 DJ 보드는 어떻게 처리할지 결정 필요.

**완화**: phase3에서 `POST /api/boards`의 dj-queue 분기에 `classroomId` required로 zod 강제. null 보드는 교사만 접근 가능 (role grant 경로가 아예 안 돌아감).

### R7. YouTube 썸네일 fallback
oEmbed가 private/deleted 영상에 실패하는 경우가 있음. 큐에 있는 항목이 삭제되면 썸네일 깨짐.

**완화**: fallback 이미지 + "재생 불가" 상태. 저장 시점에 oEmbed 실패 = 제출 자체 거부. phase7에서 제출 엔드포인트에 oEmbed probe 포함.
