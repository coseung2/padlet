# Scope Decision — student-author-edit

## 1. 선택한 접근 (UX/권한 패턴)

**기존 `canEditCard` 재사용 + per-card 게이트 프롭 추가**. `canEditCard(ids, board, card)`는 이미 "교사 owner OR 학생 studentAuthorId === self"로 정의되어 있음(`src/lib/card-permissions.ts:158`). API에서 이 함수로 통합 게이트, UI는 같은 규칙의 클라이언트-사이드 predicate.

대안(세부 권한 enum 도입, 카드별 role 테이블)은 솔로 프로젝트 규모 대비 과잉 — 기각.

## 2. MVP 범위

### 포함 (IN)
- `PUT /api/cards/:id/authors` — `isTeacherOwner` 게이트 제거, `canEditCard` 단독 게이트
- `CardDetailModal` — `canEditAuthors?: (card) => boolean` 프롭 추가, 버튼 노출이 `onEditAuthors && (canEditAuthors ? canEditAuthors(card) : true)` 로직
- 4개 보드(BoardCanvas/GridBoard/StreamBoard/ColumnsBoard) — `onEditAuthors`는 무조건 전달, predicate는 `(c) => canEdit || c.studentAuthorId === currentUserId`
- 유닛 테스트: `canEditCard` 기존 테스트가 이미 student-own-card 커버. 본 task는 라우트 변경만 추가 테스트.

### 제외 (OUT)
- 공동 저자 알림/감사 로그 — 후속 task
- 학생이 교사를 저자로 추가 가능한가 — 현재 `setCardAuthors`가 `studentId` 필수 클래스룸 소속 확인만 수행. 교사는 studentId가 없는 free-form row로 들어갈 수 있으나, 스코프 OUT (학생 UI는 roster 선택만 노출)
- AssignmentBoard/BreakoutBoard/DrawingBoard 등 CardAuthorEditor 미사용 레이아웃 — 무관

## 3. 수용 기준

1. **AC-1**: 학생 세션으로 자기 카드 열면 '👥 작성자 지정' 버튼 노출
2. **AC-2**: 학생 세션으로 타인 카드 열면 '작성자 지정' 버튼 비노출
3. **AC-3**: `PUT /api/cards/:id/authors`에 학생 세션 + 본인 카드 → 200 + authors 저장
4. **AC-4**: 동일 엔드포인트에 학생 세션 + 타인 카드 → 403 forbidden
5. **AC-5**: 교사(owner) 세션 → 기존 흐름 회귀 없음 (모든 카드에서 버튼 노출, 200 저장)
6. **AC-6**: `setCardAuthors`의 classroomId 게이트가 학생 세션에서도 그대로 작동 (외부 학급 학생은 studentId로 추가 불가 → 400)
7. **AC-7**: 회귀 — 기존 `canEditCard` 유닛 테스트 + `card-authors-service` 테스트 통과 유지

## 4. 스코프 결정 모드

**Selective Expansion** — 권한 게이트를 단일 함수(`canEditCard`)로 수렴, UI는 prop 1개 추가. 라이브러리·스키마 변경 없음.

## 5. 위험 요소

- **R1 — 기존 교사 전용 가정 회귀**: `isTeacherOwner` 게이트 제거 시 authors API는 `canEditCard`만 의존. 교사 권한은 `canEditCard`의 첫 번째 분기에서 보장되므로 회귀 없음 (유닛 테스트 확인).
- **R2 — 학생이 자신을 저자 목록에서 제외 → 소유권 상실**: 학생이 authors 배열에서 본인을 빼면 `Card.studentAuthorId`가 다른 학생으로 바뀌어 이후 편집 권한 상실. 완화: UI에서 학생 본인은 제거 불가 (후속 task로 승격, 지금은 설명 가이드).
  - 현실적으로 그룹 과제에서 순서만 바꾸는 경우가 일반적. 스코프 위험 감수 후 AC-3에 경고 추가.
- **R3 — roster API 노출**: `/api/classroom/:id/students`는 이미 학생 세션에서 같은 반만 반환. 별도 변경 불필요 (확인 필요).
- **R4 — 다른 학생 카드에 코마모되는 저자 지정 오용**: 학생 A가 본인 카드에 B, C를 공동 저자로 지정 → B가 카드를 편집하게 되어 A가 의도치 않게 편집 권한 이전. 완화: 경고 가이드 + 후속 task로 "author co-edit 범위" 재설계 여지.

## 오케스트레이터 스코프 검증 (자동)

- ✅ 수용 기준 7개 (≥ 3개)
- ✅ 리스크 4개
- ✅ MVP IN/OUT 분리
- ✅ 모드 명시

**PASS → phase7 구현 진행.**
