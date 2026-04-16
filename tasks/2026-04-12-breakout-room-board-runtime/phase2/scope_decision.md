# Phase 2 — Scope Decision (BR-5 ~ BR-9)

## 목표
BR-1~4 Foundation 위에 실제 배포/가시성/교사 UX/CSV/아카이브를 얹어 v1 기능을 완성한다.

## In Scope

### BR-5 배포 모드 런타임
- 3 모드: link-fixed / self-select / teacher-assign
- 새 API:
  - `POST /api/breakout/assignments/[id]/membership` (학생 자신 또는 교사 대리 INSERT)
  - `DELETE /api/breakout/assignments/[id]/membership/[membershipId]` (교사만)
  - `PATCH /api/breakout/assignments/[id]/membership/[membershipId]` (교사 이동)
  - `PATCH /api/breakout/assignments/[id]` (deployMode/visibility/status 변경)
  - `POST /api/breakout/assignments/[id]/rotate-section-token` (교사 링크 회전 — T0-① rotate 재사용 패턴)
- 새 페이지: `/b/[slug]/select` — 학생 자율 선택
- 섹션 진입 시 link-fixed면 자동 membership upsert 로직
- 정원: soft limit (초과 허용하되 경고) — 기본값, hard cap 10×6=60

### BR-6 가시성 WS 게이팅
- `src/lib/rbac.ts#viewSection` 확장: breakout 보드일 경우 assignment.visibility 반영
  - own-only → student는 자기 membership.sectionId 만 허용 (+ teacher-pool 섹션 허용)
  - peek-others → 전체 group section 허용
  - 교사(owner)는 항상 full
- 서버 가드: `/api/sections/:id/cards` + 섹션 페이지 모두 통과
- 클라이언트: 학생이 구독할 채널 리스트를 서버에서 계산(`GET /api/breakout/assignments/[id]/my-channels`)

### BR-7 교사 대시보드
- BreakoutBoard(owner) 확장:
  - 모둠 카드에 멤버 리스트 표시
  - 각 모둠 카드 내 "배정 관리" 모달: 반 학생 목록 + 드래그 배정(teacher-assign 모드)
  - 모둠별 정체 경고(최근 N분 카드 변화 없음)
  - "세션 종료" 버튼 → archived 상태

### BR-8 CSV 로스터 import
- `POST /api/breakout/assignments/[id]/roster-import` — multipart/form-data
- header: name, number (둘 다 optional이지만 하나 이상 필수)
- 기존 Classroom에 학생 자동 upsert (classroomId 기반 `@@unique([classroomId, number])` 활용)

### BR-9 분석 + 아카이브
- `PATCH /api/breakout/assignments/[id]` status="archived" 처리로 세션 종료
- `/board/[id]/archive` 읽기 전용 라우트: 모둠별 최종 카드 + 멤버 목록 + 타임라인
- 모둠 요약: 카드 수 / 활성 학생 수 / 최근 활동 시각

## Out of Scope (v2)
- 월드카페, 학생 셀프 모둠 이동
- User.tier 실제 결제 엔티티
- CSV 내보내기(교사용 아카이브)
- 실제 WS 엔진(Supabase Realtime 연결 — 별도 research task)

## 수용 기준 (≥12)
1. link-fixed 모드: 교사가 각 모둠 섹션 링크(?t=) 발급 가능
2. link-fixed: 학생이 섹션 링크 방문 → BreakoutMembership 자동 upsert (정원 내)
3. self-select 모드: `/b/[slug]/select` 페이지에서 학생이 모둠 선택 가능
4. self-select: 학생당 1회만 INSERT, 변경 시 409
5. teacher-assign 모드: 교사 드래그로 학생 → 모둠 배정
6. BreakoutMembership @@unique 위반 시 409
7. 정원(groupCapacity) 초과 시 400 (교사 override 옵션 제외하면)
8. own-only: 학생 WS 채널 응답에 본인 섹션 + teacher-pool 만 포함
9. peek-others: 학생 WS 채널 응답에 모든 group section + teacher-pool 포함
10. 교사는 deployMode 무관 전체 모둠 WS 채널 수신
11. 교사 대시보드에 모든 모둠 멤버 리스트 + 카드 수가 실시간으로 집계
12. CSV 업로드: name/number 로 학급에 학생 생성 후 배정 준비 완료
13. 세션 종료: assignment.status="archived"
14. 아카이브 뷰 `/board/[id]/archive` 읽기 전용 렌더
15. 기존 T0-① `/board/[id]/s/[sectionId]` 라우트 무회귀
16. Foundation 템플릿 선택·생성·복제 플로우 무회귀
17. `npm run typecheck` + `npm run build` PASS

## 리스크
- **WS 엔진 미정** → publish는 no-op. 가시성 게이팅을 "서버 read 방어 + 채널 key 리스트 API" 로 한정. 실제 브로드캐스트는 엔진 도입 시 채널 key만 쓰면 됨.
- **viewSection 시그니처 확장** → 기존 호출처(section page, cards route) 호환성 유지 필요. optional 파라미터로 확장하여 기존 호출은 그대로 통과.
- **학생 membership 자동 생성** → 동시 접근으로 정원 race — `@@unique` + 트랜잭션 + `findMany count` 선행 체크로 완화(완벽하지 않으나 교사 override로 복구 가능).
- **CSV 파싱** → 경량 파서로 직접 구현(쉼표 + 큰따옴표 이스케이프만 처리, 복잡 CSV 회피)

## 파이프라인 계약
- phase3: architecture (API 스펙 + 컴포넌트 설계 + RBAC 확장 시그니처)
- phase4-6: design notes(최소) + 실제 구현은 phase7
- phase7: BR-5/6/7/8/9 각 커밋 분리 저장
- phase8: self review + security audit
- phase9: QA (dev smoke 전 배포 모드 + 가시성)
- phase10-11: deploy log + doc sync
