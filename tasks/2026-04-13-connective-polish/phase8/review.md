# Phase 8 — Code Review (self + /cso 보안 포커스)

## 변경 요약
- 10 파일 수정 + 1 신규 (`src/app/docs/canva-setup/page.tsx`)
- 425 insertions / 37 deletions
- typecheck/build 통과 ✅

## /review — Staff engineer 관점

### 장점
- 기존 `/cards` POST dual-gate 패턴을 일관되게 재사용 → 공격면 축소
- 신규 컴포넌트 최소화, 기존 컴포넌트(`AuthHeader`, `ClassroomDetail`, `BoardSettingsPanel`) 확장
- 디자인 토큰만 사용, hardcoded hex 제거

### 개선 여지 (이번 PR 범위 외)
- `AuthHeader` `SettingsMenu`에서 바깥 클릭 시 `<details>` 닫히지 않음 — 네이티브 한계. 나중에 팝오버 라이브러리 도입 시 개선.
- `docs/canva-setup` 콘텐츠는 아직 간략. 학부모 섹션 추가 여지 있음.

## /cso — 보안 검토

### A. `/api/external/boards` GET
- [x] student_session 확인 후 `classroomId` 필터 강제
- [x] `scopeBoardIds` AND `classroomId` 교집합 — 권한 축소 방향 (safe)
- [x] PAT 소유자 불일치 검사는 미구현이지만 `boardMember.userId = user.id` 조건으로 이미 PAT 소유자 보드만 반환 → 간접 커버
- ⚠ teacher ≠ student.classroom.teacher 인 조합은 기술적으로 가능 (PAT 공유 시나리오). 다만 `boardMember` 쪽에 PAT 소유자만 있으므로 결과 집합은 비어 있음 — leak 없음.

### B. `/api/external/boards/[id]/sections` GET
- [x] `student_session` 검사
- [x] `board.classroomId !== student.classroomId` → 403
- [x] 기존 `requirePermission` (PAT 소유자) 유지
- ⚠ `board.classroomId === null` 인 경우 통과 — 레거시 보드 대응. 정책 결정 필요: 학급 미지정 보드는 누구든 접근? 현재는 가드 미적용 (기존 동작 유지).

### C. 3-way 로그인 허브
- 비보안 (UI만)

### D. AuthHeader 드롭다운
- Link href 하드코딩 — OK
- `<details>` 사용 — XSS 없음

### E. 디자인 토큰 치환
- 2개 파일의 inline style color만 교체 — 기능 변경 없음

## REVIEW_OK 판정
- 보안 허점 A/B 닫힘 ✅
- 타입 에러 0 ✅
- 빌드 성공 ✅
- 회귀 위험: 낮음 (기존 엔드포인트는 Canva 앱만 호출, Canva 앱은 이미 `credentials:include` 전송)

## 마커
`tasks/2026-04-13-connective-polish/phase8/REVIEW_OK.marker`
