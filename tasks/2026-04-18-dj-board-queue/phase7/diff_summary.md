# Phase 7 — Diff Summary

## 1. Prisma 스키마 + migration

- `Card.queueStatus String?` 추가 (nullable, 기존 데이터 영향 없음)
- 3개 신규 모델: `ClassroomRoleDef`, `BoardLayoutRoleGrant`, `ClassroomRoleAssignment`
- `User.roleAssignmentsGranted`, `Classroom.roleAssignments`, `Student.roleAssignments` 역참조 추가
- migration SQL: 20260418_dj_board_role_grants — idempotent seed 포함
  - `ClassroomRoleDef {key:"dj", labelKo:"DJ", emoji:"🎧"}` 1 row
  - `BoardLayoutRoleGrant {classroomRole:dj, boardLayout:"dj-queue", grantedRole:"owner"}` 1 row
- `prisma validate` 통과, `prisma generate` 통과

## 2. RBAC 확장

- `src/lib/rbac.ts`에 `getEffectiveBoardRole(boardId, {userId?, studentId?})` 신규 export
- 기존 `getBoardRole` · `requirePermission` 그대로 유지 (17개 legacy 호출부 불변)
- Resolution: teacher(BoardMember) → classroom-role-grant 매칭 → classroom student viewer → null

## 3. API 라우트

### 신규
- `POST /api/boards/:id/queue` — YouTube URL validation + oEmbed fetch + Card 생성 (queueStatus=pending)
- `PATCH /api/boards/:id/queue/:cardId` — status 전이 (DJ/교사 only)
- `DELETE /api/boards/:id/queue/:cardId` — 삭제 (DJ/교사 OR pending-본인)
- `PATCH /api/boards/:id/queue/:cardId/move` — order 변경
- `GET /api/classrooms/:id/roles` — 역할 정의 + 할당 현황 (교사 only)
- `POST /api/classrooms/:id/roles/assign` — 역할 부여 (교사 only)
- `DELETE /api/classrooms/:id/roles/assign/:assignmentId` — 해제

### 수정
- `POST /api/boards`: `layout` z.enum에 `"dj-queue"` 추가 + dj-queue는 classroomId 필수
- `GET /api/boards/:id/stream`:
  - 학생 세션 인증 허용 (`getCurrentStudent` fallback)
  - `getEffectiveBoardRole`로 권한 체크
  - `CardWire`에 `queueStatus` 필드 추가

## 4. UI 컴포넌트

### 신규
- `src/components/DJBoard.tsx` — SSE 구독 + 낙관 mutation + now-playing/queue 분리
- `src/components/dj/DJNowPlayingHeader.tsx` — 상단 pinned 카드
- `src/components/dj/DJQueueList.tsx` — 드래그 재정렬 wrapper
- `src/components/dj/DJQueueItem.tsx` — 행 1개 (썸/제목/제출자/status/액션)
- `src/components/dj/DJSubmitForm.tsx` — YouTube URL 제출 모달
- `src/components/dj/DJEmptyState.tsx` — 빈 상태
- `src/components/classroom/ClassroomDJRolePanel.tsx` — 교사용 DJ 할당 패널

### 수정
- `src/components/DraggableCard.tsx`: `CardData`에 `queueStatus?: string | null` 추가
- `src/components/CreateBoardModal.tsx`: `LAYOUTS` + classroom-required 분기에 dj-queue 추가
- `src/app/board/[id]/page.tsx`:
  - `LAYOUT_LABEL`에 `"dj-queue": "DJ 큐"` 추가
  - 역할 resolver를 `getEffectiveBoardRole`로 교체 (기존 studentViewer fallback은 identity용으로만 유지)
  - renderBoard switch에 `case "dj-queue"` 추가 → `<DJBoard>` 렌더
  - cardProps 매핑에 `queueStatus` 포함
- `src/app/classroom/[id]/page.tsx`: 교사 뷰에 `<ClassroomDJRolePanel>` 삽입

## 5. 유틸

- `src/lib/youtube.ts` 신규 — URL 호스트 화이트리스트(youtube.com/youtu.be) + videoId 추출(11-char) + oEmbed fetch(24h cache). SSRF 방지.

## 6. CSS

- `src/styles/boards.css`에 `.dj-*` 클래스 일괄 추가 (~300 lines)
- 기존 토큰 최대 재사용. 신규 hex는 `.dj-nowplaying` linear-gradient 1곳만 인라인 (tokens_patch 설계의 `--color-dj-nowplaying-bg`에 해당하되 CSS 직접 값으로 간략화)
- `@media (prefers-reduced-motion: reduce)` + `@media (max-width: 640px)` 분기 포함

## 7. 검증

- `prisma validate` ✓
- `prisma generate` ✓
- `tsc --noEmit` ✓ (exit 0)
- migration SQL은 phase10에서 실제 DB에 apply
