# [중대 과제] 레거시 역할 모델 완전 제거

> 분류: **중대 기술 부채** (아키텍처 정합성)
> 생성: 2026-04-22 세션
> 예상 범위: 수 시간 ~ 하루
> 우선순위: HIGH — 현재 두 역할 체계가 공존해 혼선 + UX 누수 유발

## 배경

Aura-board는 `2026-04-15-role-model-cleanup` task에서 역할 모델을
**identity 기반(`teacher | student | parent | anon`)** 으로 리디자인하기로
결정했다. 동기: 레거시 `BoardMember.role = owner | editor | viewer` 는
단일 값이어서 "학생은 자기 카드엔 editor, 남의 카드엔 viewer" 같은
맥락 의존 권한을 표현할 수 없었다.

새 모델은 `src/lib/card-permissions.ts` + `src/lib/identity.ts`로 **이미
구현 완료**되어 있고, 카드 수준 모든 권한은 그 predicate들이 담당.
그러나 구 모델의 **광역 제거는 아직 실행되지 않았다** — 2026-04-22
시점에도 레거시 참조가 88개(42파일)에 잔존.

## 증상 (실사용자 관측)

- 학생 계정으로 보드 접근 시 `김민아 · viewer` 뱃지 노출 — `viewer`는
  레거시 `BoardMember.role` 값이고, 학생은 identity 기반으로는 그냥 "학생"
  이어야 한다. 본 세션에서 뱃지 숨김 임시 패치(옵션 A)만 적용.
- `requirePermission(boardId, userId, "edit")` 등 레거시 API가 학생
  핸들링을 별도 경로로 우회해야 해서 라우트마다 분기 로직이 중복됨.

## 현재 상태 (2026-04-22 a9745e1 기준)

### 활성 사용 중 (제거 대상)
- `src/lib/rbac.ts` — 모듈 헤더 `@deprecated` 표시는 있지만 export 중:
  - `Role`, `Action`, `getBoardRole`, `requirePermission`,
    `getEffectiveBoardRole`, `viewSection`, `assertBreakoutVisibility`
- `src/lib/roles.ts` — `MOCK_ROLE_KEYS`, `MockRoleKey` 타입. `UserSwitcher`
  와 mock-auth 경로에서만 쓰이지만 여전히 "owner/editor/viewer" 문자열 노출.
- Prisma `BoardMember.role` 컬럼 — 값: `"owner" | "editor" | "viewer"`
- 42개 파일이 위 heritage에 의존 (상세 grep 결과는 아래)

### 이미 구축 완료 (대체재)
- `src/lib/card-permissions.ts` — pure predicate (Identity × ownership)
- `src/lib/identity.ts` — `resolveIdentity()` / `resolveIdentities()`
- `src/lib/parent-scope.ts` — parent-only 미들웨어

## 작업 제안 (단계별)

### Phase 1 — 조사 & 매핑
1. 42개 파일을 카테고리 별로 분류:
   - (a) 교사 전용 라우트 (board create, section CRUD, classroom CRUD 등)
   - (b) 학생/교사 혼용 라우트 (card CRUD, assignment submit 등)
   - (c) DJ 큐처럼 `getEffectiveBoardRole` 쓰는 라우트
   - (d) 클라이언트 컴포넌트 (GridBoard, StreamBoard, ColumnsBoard 등)
     가 `currentRole` prop 받는 곳
2. 각 카테고리별 마이그레이션 패턴 정립:
   - (a) `requirePermission` → `resolveIdentity()` + `if (identity.kind !== "teacher") 403`
   - (b) → `resolveIdentities()` + card-permissions predicate
   - (c) → ClassroomRoleAssignment + `isTeacher || hasClassroomRole(studentId)` 패턴
   - (d) → `viewerKind` prop(`"teacher" | "student" | "parent"`)로 이름 변경

### Phase 2 — 점진 치환
각 카테고리별로 한 묶음씩:
- (a) 카테고리 완료 시점에 `rbac.ts` 의 `requirePermission` export 제거
- 모든 클라이언트 `currentRole: Role` prop → `viewerKind: ViewerKind`
- 테스트: 기존 vitest + 새 identity predicate 스냅샷

### Phase 3 — DB 스키마 정리
- `BoardMember.role` 컬럼을 간소화된 `isOwner: boolean`으로 전환 (혹은 삭제 후
  `Classroom.teacherId == Board.classroomId.teacherId` 로 owner 판별)
- 마이그레이션: 기존 row 중 `role = "owner"` → `isOwner = true`, 나머지 삭제
  (editor/viewer가 실제 의미를 갖는 경우는 없음 — 교사는 owner, 학생은
  classroom 멤버십, 학부모는 ParentChildLink)
- `rbac.ts` 모듈 자체 삭제. `roles.ts`는 mock-auth 용 shim으로 축소

### Phase 4 — UI 문구 표준화
- 모든 역할 라벨 display: "교사"/"학생"/"학부모"
- `UserSwitcher` 를 identity 전환 도구로 리디자인 (mock-auth 경로에서만 노출)
- `/board/:id` BoardHeader 뱃지: identity.kind 참조
- `BoardMember` 테이블 owner/editor/viewer 문구가 드러나는 곳 zero

## 현재 우회 조치

본 세션에서 임시 적용된 것:
- `src/app/board/[id]/page.tsx` BoardHeader: `isStudent` prop 추가.
  학생일 땐 `· viewer` 접미 숨김. 교사일 땐 여전히 `· owner` 표시 (무해).

## 관련 이전 작업 참조

- `tasks/2026-04-15-role-model-cleanup/phase1/research.md` — 처음 이 리디자인
  결정이 내려진 문서 (레거시 모델의 근본 한계 분석)
- `src/lib/card-permissions.ts` — 새 모델의 소스
- `src/lib/rbac.ts` — 구 모델 (모듈 헤더에 @deprecated)

## 완료 판정

- [ ] `rg "owner|editor|viewer" src/` 가 `MOCK_ROLE_KEYS`, `UserSwitcher`
      내부, 마이그레이션 SQL 외에 hit 없음
- [ ] Prisma `BoardMember` 모델에 `role` 컬럼 없음 (또는 boolean 단순화)
- [ ] 모든 API 라우트가 `getBoardRole` 대신 `resolveIdentity` 경유
- [ ] 모든 UI 라벨이 한국어 "교사"/"학생"/"학부모" 노출
- [ ] `rbac.ts` 파일 삭제 (관련 export 전부 이전 완료)
- [ ] vitest full suite pass
- [ ] Manual QA: 학생/교사/학부모 각 계정으로 보드 접근 시 원하는 동작

## 리스크

- 42개 파일 동시 수정 — 큰 PR, 충돌 리스크
- `BoardMember.role` drop 은 데이터 마이그레이션 포함 — rollback 난이도 높음
- Breakout board의 `getEffectiveBoardRole` 은 ClassroomRoleAssignment와
  엮여 있어 간단하지 않음 — 별도 서브 작업 필요

## 권장 진행 방식

풀-파이프라인 orchestration 작업. 본 문서가 phase0의 research + plan이
되고, 사용자가 착수 결정 시 별도 `tasks/2026-04-XX-role-model-phase{1-4}`
디렉토리에서 단계별 실행.
