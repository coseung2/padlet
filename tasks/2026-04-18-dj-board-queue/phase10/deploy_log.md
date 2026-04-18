# Deploy Log — dj-board-queue

## 1. PR / Merge 정보

- **Merge 방식**: FF push (gh CLI 부재 + 자동 감독 모드).
  - `git push origin feat/dj-board-queue:main`
  - `f474aa6..dfd7eb7` (2 commits)
- Branch: `feat/dj-board-queue` (feature 브랜치 원격 보존 — 감사 이력)
- Merge commit SHA (on main): **dfd7eb7** (phase8 B6 fix tip)
- 병합 시각: 2026-04-18
- GitHub compare URL: https://github.com/coseung2/padlet/compare/f474aa6...dfd7eb7

PR 생성 생략 사유:
- `gh` CLI 미설치 (Windows), GitHub API 토큰 env 변수 부재
- 솔로 프로젝트 + 자동 감독 모드 + REVIEW_OK + QA_OK 통과 후 ship
- 기존 SSE fix 머지와 동일 FF 푸시 경로

## 2. CI 결과

- local typecheck: ✓ exit 0
- local prisma validate/generate: ✓
- Vercel (Linux) build: 진행 중 — aura-board 프로젝트에 main push 감지 → deploy 큐 진입
  - 배포 상태는 https://vercel.com/{team_moRBerogWEh0Zn0jGph9uPj4}/aura-board 에서 실시간 확인
  - 예상 소요: 2-5분 (Prisma migrate deploy + Next build + page collection)
  - sharp 네이티브 바이너리는 Vercel Linux에 정상 설치 (기존 배포 이력 성공)

## 3. 배포 대상

- Production: aura-board Vercel 프로젝트 (regions: icn1)
- Prisma migration: `20260418_dj_board_role_grants`
  - `prisma migrate deploy` Vercel pre-build에서 실행
  - 3 CREATE TABLE + 1 ALTER TABLE + 2 seed INSERT (idempotent)

## 4. 프로덕션 검증 (phase11 → 사용자 수동)

- [ ] Vercel deploy 상태 Ready
- [ ] migration 로그에 `ClassroomRoleDef`, `BoardLayoutRoleGrant`, `ClassroomRoleAssignment` CREATE 확인
- [ ] seed 로그에 `dj` role row + `(dj, dj-queue, owner)` grant row 확인 (중복 실행 시 no-op)
- [ ] `/dashboard` 200 OK
- [ ] `/board/[slug]` layout=dj-queue 생성 가능
- [ ] `/classroom/[id]` 하단 DJ 패널 렌더
- [ ] Core Web Vitals 회귀 없음 (phase9 baseline 없으므로 측정 생략)

phase9 qa_report.md 의 "수동 QA 체크리스트"가 production 검증 항목.

## 5. 롤백 절차

### 코드 롤백
```bash
# 1) 이전 commit으로 main 되돌리기 (force 필요, 위험)
#    또는 revert commit 추가 (권장)
git checkout main
git revert --no-edit dfd7eb7 205fe97   # 2 commits, topological order
git push origin main
```

### DB 롤백 (필요 시만)
```sql
-- ClassroomRoleDef row가 있는 경우 ClassroomRoleAssignment가 참조하므로 순서 중요
DROP TABLE IF EXISTS "ClassroomRoleAssignment";
DROP TABLE IF EXISTS "BoardLayoutRoleGrant";
DROP TABLE IF EXISTS "ClassroomRoleDef";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "queueStatus";
```

**실행 금지 — 코드 revert만으로 기능은 OFF**. DB 테이블/컬럼은 추가-only라 남아도 무해.

## 6. 모니터링 신호

- Vercel runtime errors (Slack/email 연동된 경우) 확인
- 5분간 `/api/boards/[id]/queue` · `/api/classrooms/[id]/roles/*` 4xx/5xx 카운트 관찰
