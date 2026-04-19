# Phase 7 — Diff Summary

## 데이터 모델
- Prisma schema: 7 신규 모델 + 3 역참조 추가
- Migration `20260419_classroom_bank`: 7 CREATE TABLE + 2 INSERT (banker/store-clerk seed)
- `Transaction.balanceAfter` 필드로 거래 후 잔액 감사 추적

## Libs
- `src/lib/bank-permissions.ts` — PERMISSION_CATALOG (6 권한) + `hasPermission` (override → default fallback)
- `src/lib/qr-token.ts` — HMAC 서명 카드 토큰 발급/검증, 60초 만료, 15분 nonce 캐시
- `src/lib/bank.ts` — `ensureAccountFor` / `ensureClassroomCurrency` lazy init helpers

## API (14 신규 라우트)
- 은행: POST deposit/withdraw/fixed-deposits, POST fd/:id/cancel, GET overview
- 매점: GET/POST items, PATCH/DELETE items/:id, POST charge
- 권한: GET role-permissions, PUT role-permissions/:roleKey
- 화폐: PATCH currency
- 지갑 (학생): GET wallet, GET wallet/card-qr
- Cron: GET cron/fd-maturity

## IA 재구조화
- `/classroom/[id]/page.tsx` → `redirect('/students')`
- 새 페이지: `/students` (기존 ClassroomDetail 재사용), `/boards` (재사용), `/roles`, `/bank`, `/store`, `/pay`
- 학생 /my/wallet 신규
- 공통 `ClassroomNav` 상단 탭 (5 섹션)

## UI 컴포넌트 (8 신규)
- `ClassroomNav`, `ClassroomRolesTab`, `RolePermissionModal`
- `ClassroomBankTab`, `ClassroomStoreTab`, `ClassroomPayTab`
- `WalletHome`, `WalletCardQR`

## CSS
- `src/styles/classroom.css` 끝에 ~700 lines 추가
- 신규 토큰 2개 (color-bank-positive / negative, 기존 plant-active / danger alias)

## 검증
- `prisma format` + `prisma generate` 통과
- `tsc --noEmit` exit 0
- 동시성: 모든 잔액 변경이 `db.$transaction` 내부에서 수행, 잔액 재조회 후 차감
- QR 재사용 방어: nonce in-memory 캐시 15분 TTL + HMAC 서명

## 알려진 제한
- QR 스캐너 라이브러리 미포함 — POS에선 수동 토큰 paste (학생이 `/my/wallet`에서 "토큰 복사" 버튼으로 클립보드 활용)
- nonce cache는 serverless cold start 시 초기화됨. 1차 방어선은 60s HMAC 만료
- `/classroom/:id/boards`와 `/students`가 현재 같은 내용 렌더 (ClassroomDetail 모노리식, IA 분할 후속 작업 예정)
