# Phase 3 — Architecture (BR-5 ~ BR-9)

## 1. RBAC 확장 — `viewSection` + 새 `viewBreakoutSection`

`src/lib/rbac.ts`에 breakout 가시성 판정을 분리한 헬퍼 추가:

```ts
export type BreakoutAccess =
  | { kind: "owner" }             // teacher (board owner/editor)
  | { kind: "student"; studentId: string; membershipSectionId: string | null }
  | { kind: "shared-token" }      // matched Section.accessToken
  | null;

export async function resolveBreakoutAccess(
  sectionId: string,
  ctx: SectionViewContext
): Promise<BreakoutAccess>
```

- `viewSection`은 유지. 추가로 호출 시점에 `resolveBreakoutAccess`로 breakout-specific gating 사용.
- 학생 섹션 카드 조회 API에서 breakout 보드면:
  - own-only: `membership.sectionId === sectionId` 또는 teacher-pool 섹션일 때만 allow
  - peek-others: 모든 group section allow (teacher-pool 포함)

## 2. API 스펙

### BR-5

#### `PATCH /api/breakout/assignments/[id]`
Body: `{ deployMode?, visibilityOverride?, status?, groupCapacity? }`. Owner only.

#### `POST /api/breakout/assignments/[id]/membership`
Body: `{ sectionId: string, studentId?: string }`
- self-select: 본인 student(쿠키) + sectionId. 이미 해당 assignment에 membership 있으면 409.
- teacher-assign: owner + studentId. 자유롭게 배정.
- link-fixed: "auto upsert" 모드 — `mode: "link-fixed-auto"` 플래그 포함 시 기존 membership 있으면 no-op.

정원 체크: `membership count >= groupCapacity` 이면 400 `capacity_reached` (단, owner force 시 허용 플래그).

#### `DELETE /api/breakout/assignments/[id]/membership/[mid]`
Owner only.

#### `PATCH /api/breakout/assignments/[id]/membership/[mid]`
Body: `{ sectionId: string }`. Owner only. 정원 체크 포함.

#### `GET /api/breakout/assignments/[id]/my-access`
학생의 가시성 기반 섹션 id 리스트 + 채널 key 리스트 반환.

### BR-6
- `src/app/api/sections/[id]/cards/route.ts` 확장: 섹션이 breakout 보드에 속하면 `resolveBreakoutAccess` 추가 검증
- `src/app/board/[id]/s/[sectionId]/page.tsx` 동일 추가 가드

### BR-7
- 교사 배정 관리 컴포넌트: `BreakoutAssignmentManager.tsx`
  - 반 학생 목록 (classroom/[classroomId] API 재사용)
  - 드래그앤드롭 간단 버전: 클릭 → "모둠 N으로 이동" 버튼 (S-Pen 친화)
- 정체 경고: 서버에서 각 섹션의 카드 최신 updatedAt 계산 → 임계치 비교 (client threshold)
- "세션 종료" 버튼: PATCH status="archived"

### BR-8
- `POST /api/breakout/assignments/[id]/roster-import`
- Content-Type: multipart/form-data, field `file`
- 파싱: 경량 CSV 파서 (line split + comma split + quote handling)
- 각 row: `{name, number?}` → classroom에 student upsert (`@@unique([classroomId, number])`)
- 반환: `{ created, existing, failed }` 카운트

### BR-9
- 세션 종료: `PATCH status` 이미 포함 (BR-5)
- `/board/[id]/archive` 라우트 (server component)
  - owner만 접근
  - 모둠별 카드/멤버/타임스탬프 요약
- 간단 분석: API 별도 없이 server component에서 직접 집계

## 3. 컴포넌트 설계

### `BreakoutSelectPage` (self-select)
라우트 `src/app/b/[slug]/select/page.tsx`
- 학생 인증(student cookie) 필요, 반 classroom 소속 체크
- 모둠 목록 + 현재 정원 표시 + 선택 버튼

### `SectionAutoJoin` (link-fixed)
`src/app/board/[id]/s/[sectionId]/page.tsx` 수정: 학생이 보드/섹션 들어올 때 assignment.deployMode==="link-fixed"면 자동 membership insert (이미 있으면 no-op)

### `BreakoutAssignmentManager`
- Props: assignmentId, classroomId, currentMemberships, students, groupSections, groupCapacity, deployMode
- 반 학생 목록 리스트 + 각 학생 옆 "모둠 N" 선택(teacher-assign 모드)

### `BreakoutArchive`
- `/board/[id]/archive` 서버 컴포넌트 렌더

### `BreakoutRosterImport`
- BreakoutAssignmentManager 내 "학생 명단 업로드" 버튼 → 파일 선택 + 업로드

## 4. 데이터 흐름

### self-select 플로우
1. 교사가 보드 생성 시 deployMode="self-select"
2. 교사가 `/b/[slug]/select` 링크를 학생에게 공유 (Board.accessToken + slug 활용)
3. 학생 쿠키 로그인 → 선택 페이지 → POST membership → redirect `/board/[id]/s/[sectionId]`

### link-fixed 플로우
1. 교사 dashboard에서 각 섹션 accessToken 발급/회전
2. 교사가 `/board/[id]/s/[sectionId]?t=...` 링크를 모둠별 배포
3. 학생 방문 → 자동 membership upsert → 해당 섹션 뷰

### teacher-assign 플로우
1. 교사가 BreakoutAssignmentManager 열어 드래그/버튼 클릭으로 배정
2. 학생은 `/board/[id]` 직접 접근 시 membership 기반으로 자기 섹션으로 redirect (혹은 대기 화면)

## 5. 마이그레이션
- 추가 스키마 변경 없음 — Foundation에서 이미 모델 적용됨
- 필요 시 `BreakoutAssignment.updatedAt` 활용 (이미 존재)

## 6. 테스트 전략
- Unit: viewSection breakout 확장, CSV 파서, 정원 체크
- Integration: self-select 2명 동시 → 1명 409
- Smoke: 3 모드 + 2 가시성 각각 dev 서버 확인
