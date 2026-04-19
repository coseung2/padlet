# Deploy Log — classroom-bank

- Branch `feat/classroom-bank` → merged via FF push `8e52ab9..48c08ef` to `origin/main`
- Vercel 자동 재배포 (aura-board 프로젝트)
- Migration `20260419_classroom_bank` — `npm run build`의 `prisma migrate deploy` 경로에서 적용됨 (DJ task에서 추가한 build script 덕분)

## 배포 대상
- Production: aura-board Vercel
- Prisma migration: 7 CREATE TABLE + ClassroomRoleDef seed 2 row
- Cron 추가: `/api/cron/fd-maturity` @ `5 15 * * *` UTC (00:05 KST)

## 롤백
- 코드 revert 후 재배포 (DB 테이블은 보존 — 추가-only라 무해)
- 필요 시 `DROP TABLE` 순서 (FK 고려): Transaction → FixedDeposit → StudentCard → StudentAccount → ClassroomCurrency → StoreItem → ClassroomRolePermission

## 사용자 수동 확인
- Vercel 배포 Ready 후 phase9/qa_report.md 하단 수동 QA 체크리스트 13항목
- `CRON_SECRET` env 설정 (없으면 cron 엔드포인트 공개 상태 — Vercel 자동 cron 호출은 동작하나 악의적 호출도 가능). Vercel Project Settings → Environment Variables에서 추가 후 재배포 권장.

## 환경변수 변경
- **CRON_SECRET** (선택, 권장): cron 엔드포인트 Bearer auth. Vercel cron은 자동으로 이 헤더를 붙이므로 설정만 하면 봇 방어
