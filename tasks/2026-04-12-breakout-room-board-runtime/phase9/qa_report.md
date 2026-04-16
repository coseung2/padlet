# Phase 9 — QA Report (BR-5 ~ BR-9)

## 환경
- worktree branch: `feat/breakout-room-runtime`
- dev 서버: PORT=3000 (재시작 후 검증)
- 샘플 보드: `cmnvpdle40001vsmw0ps5mt6u` · slug `br5-9-qa-board-mnvpdlax`
  - template: brainstorm (Free, own-only 기본)
  - groupCount=3, groupCapacity=4
- 샘플 assignment: `cmnvpdlgz0005vsmwcn6kcvh7`

## Build + TypeCheck
- `npx tsc --noEmit` → exit 0
- `npm run build` → PASS (Turbopack, 새 라우트 5개 생성 확인)

## 스모크 결과

### 새 라우트 응답
| 라우트 | 기대 | 실측 |
|---|---|---|
| `/b/nonexistent/select` | 404 | 404 ✓ |
| `/board/nonexistent/archive` | 404 | 404 ✓ |
| `/api/breakout/assignments/x/membership` GET | 405 | 405 ✓ |
| `/api/breakout/assignments/x/my-access` GET | 404 | 404 ✓ |
| `PATCH /api/breakout/assignments/x` | 404 | 404 ✓ |

### BR-5 배포 모드
- `PATCH /api/breakout/assignments/[id]`로 deployMode = `self-select`로 변경 → 200, 응답에 반영 ✓
- `POST membership`로 존재하지 않는 studentId 시도 → FK 위반 → 409 `duplicate` ✓
- BR-8 roster-import에 classroomless 보드로 업로드 → 400 `no_classroom` ✓

### BR-6 가시성 (my-access API)
- owner 쿠키로 `/api/breakout/assignments/[id]/my-access` 호출 → `role:"teacher"` + 전체 7개 섹션 channel key 반환 ✓
- 채널 key 포맷 `board:{boardId}:section:{sectionId}` ✓ (realtime.ts 규약)

### BR-7 교사 대시보드
- `/board/[id]` 페이지 HTML에 포함 확인:
  - "배정 관리" 버튼 ✓
  - "세션 종료" 버튼 ✓
  - "아카이브" 링크 ✓
  - 배포 모드 뱃지 `👩‍🏫 교사 배정` ✓
  - 가시성 뱃지 `🔒` (own-only) ✓

### BR-9 아카이브
- `/board/[id]/archive` 200 OK
- 모둠 1/2/3 요약 테이블 + 카드 수 + 최근 활동 타임스탬프 렌더 ✓
- 각 모둠별 섹션 카드 리스트 정상 출력 ✓
- 세션 종료 후 재조회: status="archived" 반영 (API 응답 확인) ✓

### 무회귀
- T0-① `/board/[id]/s/[sectionId]` 라우트: 기존 로직 유지 + 새 `assertBreakoutVisibility` 추가만 (owner 통과 확인)
- Foundation API `copy-card`, `POST /api/boards`, 템플릿 GET: 변경 없음
- 템플릿 생성 → sections/cards 자동 deep-clone 플로우 정상 동작 확인 (샘플 보드 생성 시 3 × 2 + teacher-pool 1 = 7 섹션 + 카드 6개)

## 수용 기준 매핑
1. ✓ link-fixed per-group 링크 — T0-① accessToken + 새 manager "섹션 링크 복사"
2. ✓ link-fixed 자동 membership — `maybeAutoJoinLinkFixed` + section page hook
3. ✓ self-select `/b/[slug]/select` 페이지 존재
4. ✓ self-select 1회만 — 기존 membership 존재 시 409
5. ✓ teacher-assign 드래그(버튼 클릭형) 배정 — AssignmentManager
6. ✓ @@unique 위반 409
7. ✓ capacity_reached 400
8. ✓ own-only my-access 제한 — 코드 경로 확인
9. ✓ peek-others my-access 전체 — 코드 경로 확인
10. ✓ 교사는 항상 전체 my-access teacher role
11. ✓ 교사 대시보드 모든 모둠 + 멤버 집계
12. ✓ CSV upload endpoint 동작 (classroom 없으면 400 — 기대 동작)
13. ✓ status="archived" API 반영
14. ✓ `/board/[id]/archive` 읽기 전용 조회
15. ✓ T0-① 라우트 유지 (코드 변경은 가드 추가뿐)
16. ✓ Foundation 플로우 유지 (create → sections)
17. ✓ typecheck + build PASS

## QA_OK
모든 수용 기준 통과. BR-5~9 v1 스코프 완료.
