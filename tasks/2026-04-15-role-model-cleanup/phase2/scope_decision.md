# Phase 2 — Scope Decision · role-model-cleanup

- **task_id**: `2026-04-15-role-model-cleanup`
- **mode**: **Selective Expansion** — phase1 research 가 B1~B8 결정과 영향 파일 3티어 분류까지 끝. phase2 는 그 답을 합의로 채택.

## 1. IN (v1 필수)

### 1.1 신규 라이브러리
- **[IN-L1]** `src/lib/identity.ts` — `Identity` discriminated union + `resolveIdentity()` 서버 헬퍼. per-request 캐시.
- **[IN-L2]** `src/lib/card-permissions.ts` — `canViewCard / canEditCard / canDeleteCard / canAddCardToBoard` 4 함수. 순수 함수, 테스트 용이.

### 1.2 API 통합
- **[IN-A1]** `POST /api/cards` — 기존 student path 유지 + primitive 호출로 통합.
- **[IN-A2]** `PATCH /api/cards/[id]` — **신규 student path**. `canEditCard(identity, board, card)` true 면 허용. 기존 teacher path 보존.
- **[IN-A3]** `DELETE /api/cards/[id]` — student path 정리 (기존 2026-04-15 fix 를 primitive 호출로).
- **[IN-A4]** `POST /api/cards/[id]/move` — `canEditCard` 경유 (학생이 자기 카드 이동 허용).
- **[IN-A5]** `rbac.ts` — `Role` 타입 alias 로 유지 + `@deprecated` JSDoc. `getBoardRole` / `requirePermission` 은 teacher-path 전용으로 용도 축소 + 기존 callsite 보존 (owner/editor/viewer mock 경로 dev-only).

### 1.3 UI 통합
- **[IN-U1]** `board/[id]/page.tsx` — `identity` resolve 후 board 컴포넌트 4종에 prop 전달. 기존 `currentRole` prop 도 당분간 유지 (병렬 전환).
- **[IN-U2]** 4개 보드 (`BoardCanvas/ColumnsBoard/GridBoard/StreamBoard`) — `identity` prop 수용, `canAddCard/canEditCard/canDeleteCard` 를 primitive 로 계산.
- **[IN-U3]** 학생이 자기 카드 수정 UX (CardDetailModal 편집 버튼) — `canEditCard` true 인 카드에 노출.

### 1.4 테스트
- **[IN-T1]** `src/lib/__tests__/card-permissions.test.ts` — 4 identity × 4 함수 × (own/other card) 매트릭스 커버. 최소 20 case.

## 2. OUT (후속 task)

| # | 항목 | 제외 사유 |
|---|---|---|
| OUT-1 | BoardMember 테이블 스키마 drop / migrate | read 경로 전수 확인 + prod migration 필요. 본 task 범위 밖. |
| OUT-2 | `parent-scope.ts` 내부 로직 변경 | parent-v2 방금 배포, status='active' narrowing 깰 위험. primitive 의 parent branch 는 exposed 하되 실제 parent read path 는 기존 유지. |
| OUT-3 | AssignmentBoard / BreakoutBoard / Drawing / Plant / EventSignup layout 내부 UX 변경 | 본 task 는 권한 primitive 통합만. layout 별 UX 리팩터는 별 task. |
| OUT-4 | Dev mock auth (`u_editor`, `u_viewer`) 제거 | dev workflow 보존 — teacher branch 로 흡수 (ownsBoardIds 비어있으면 자연스러운 read-only) |
| OUT-5 | Quiz / Event-signup / Drawing / Plant-roadmap 보드의 currentRole prop 교체 | 최소 변경 원칙 — 우선 4개 카드 레이아웃만 migrate. 나머지는 별 task. |
| OUT-6 | Role 타입 alias 삭제 | 호출 0건 된 뒤 정리. 본 task 는 deprecated 마킹만. |
| OUT-7 | parent 편집 권한 | 기능 자체 없음. 읽기 전용 유지. |
| OUT-8 | Student signup / classroom 변경 시 identity invalidate | 기존 student_session sessionVersion 정합. 추가 작업 없음. |

## 3. 수용 기준 (Acceptance Criteria)

- **AC-1** `src/lib/card-permissions.ts` 가 4 함수 + Identity/CardLike/BoardLike 타입 export, purity 유지 (외부 I/O 없음).
- **AC-2** teacher (classroom owner) 인 identity 에 대해 `canEditCard` / `canDeleteCard` / `canAddCardToBoard` 모두 `true`.
- **AC-3** student 인 identity 가 자기 `studentAuthorId` 카드에 대해 `canEditCard` / `canDeleteCard` `true`, 타인 카드엔 `false`.
- **AC-4** student 가 같은 classroom 보드에서 `canAddCardToBoard` `true`, 다른 classroom 보드엔 `false`.
- **AC-5** anon identity 는 모든 함수 `false`.
- **AC-6** `POST /api/cards` 학생 경로 + teacher 경로 둘 다 primitive 경유해서 판정.
- **AC-7** `PATCH /api/cards/[id]` 학생이 자기 카드 title/content/linkUrl/imageUrl 수정 가능 (신규 기능).
- **AC-8** `DELETE /api/cards/[id]` 학생이 자기 카드 삭제 가능 (기존 기능 primitive 통합).
- **AC-9** `POST /api/cards/[id]/move` 학생이 자기 카드 이동 가능 (신규 기능).
- **AC-10** 4개 카드 보드 UI 가 `identity` prop 수용 + FAB / 삭제 / 편집 버튼이 identity 기반으로 노출.
- **AC-11** CardDetailModal 에서 학생이 자기 카드 클릭 시 편집 가능.
- **AC-12** `src/lib/__tests__/card-permissions.test.ts` 최소 20 case pass (tsx-runner 또는 vitest).
- **AC-13** 기존 교사 flow regression 0 — `npm run build` green + staff-eng smoke (교사 카드 생성/편집/삭제).
- **AC-14** parent viewer 경로 regression 0 — parent v2 변경 사항 그대로 작동.
- **AC-15** assignment board AB-1 flow 변경 0 — 자동 회귀 확인 (unit test 24 그대로 pass).

## 4. Scope Decision Mode

**Selective Expansion** — phase1 B1~B8 답을 그대로 채택. 새 범위 증가 없음.

### 4.1 B1~B8 확정

| # | 질문 | 답 | 근거 |
|---|---|---|---|
| B1 | parent-scope 건드릴까 | OUT | parent-v2 방금 배포, 정합성 보존 우선 |
| B2 | BoardMember 테이블 drop | OUT | DB migration 영향 범위 너무 커 별 task |
| B3 | 학생 PATCH 허용 | IN | 본 task 핵심 가치 |
| B4 | 학생 카드 이동 (자기) | IN | canEditCard 로 자연스럽게 |
| B5 | AB-1 identity 변경 | OUT | 이미 identity-based |
| B6 | 기타 layout currentRole→identity | 4 카드 레이아웃만 IN, 나머지 OUT (scope 축소) | 최소 변경 원칙 |
| B7 | 3-enum 제거 | IN (deprecated 마킹) | 실 호출 0 되면 별 task 에서 물리 삭제 |
| B8 | dev mock auth | OUT (teacher branch 로 흡수) | dev workflow 보존 |

## 5. 위험 요소

### 5.1 R1 parent-scope 정합성 (HIGH)
parent v2 의 `status='active'` narrowing 이 본 task 이후에도 깨지지 말아야 함. primitive 의 parent branch 는 parent-scope 를 **호출만** 하고 내부 쿼리 수정 금지.

### 5.2 R2 mock auth 와 teacher branch 통합 (MED)
dev 에서 `u_editor`/`u_viewer` 쿠키로 접속 시 identity.kind="teacher" 이되 `ownsBoardIds` 가 비어 있어야. 기존 BoardMember.role="editor"/"viewer" 레코드 무시 권장. 만약 dev DB 에 editor 역할 BoardMember 가 있어도 teacher identity 로는 ownsBoard=false → read-only 로 동작 (자연스러움).

### 5.3 R3 API route 전환 중 regression (MED)
17 requirePermission 호출처 중 cards/* 4개만 primitive 로 전환, 나머지(boards, breakout, event, section)는 **기존 requirePermission 유지**. 혼재 상태 안전성은 "requirePermission 은 teacher-only 전용, primitive 는 student 포함" 으로 역할 분리.

### 5.4 R4 CardDetailModal 학생 편집 UX (LOW)
현재 CardDetailModal 은 교사만 편집 가능 가정. 학생 편집 UI 노출 시 삭제 버튼 조차 이미 있음 (student-delete fix 반영). 편집 필드 노출만 primitive 조건으로 감싸면 충분.

### 5.5 R5 보드 외 역 (Quiz, plant-roadmap, event-signup) (LOW)
이번 task 에서 currentRole prop 미변경. 즉 이 레이아웃들은 Role 타입 남겨둔 상태. Role 의 deprecated JSDoc 이 뜨지만 build 실패 아님.

## 6. 판정

**PASS** — IN 14건 / OUT 8건 / AC 15개 / 리스크 5건. phase3 architect 진입 가능.
