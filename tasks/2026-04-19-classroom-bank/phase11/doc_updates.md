# Doc Updates — classroom-bank

## 업데이트된 문서

### `docs/current-features.md`
파일 끝에 `## Classroom Bank (2026-04-19)` 섹션 추가: IA 재구조화, 7 테이블, 권한 시스템, 학생 /my/wallet, POS, cron, 향후 확장 후보

### `docs/architecture.md`
파일 끝에 `## Classroom Bank (2026-04-19)` 섹션 추가: IA, 7 새 테이블, lib, API 14개, concurrency, cron.

### `docs/design-system.md`
수정 없음. tokens_patch.json이 alias 2개만 추가 (기존 `plant-active` / `danger`). 의미적 명명만 다름, 신규 hex 없음.

### `CLAUDE.md`
수정 없음. 오케스트레이션 규칙/경로 변경 없음.

### `README.md`
수정 없음.

## 회고 (3줄)

- **잘된 점**: 금전 거래 파이프라인을 데이터 모델부터 UI까지 1회 풀 사이클 설계. phase3 체크포인트에서 설계 확정 후 구현 → 재작업 0. PERMISSION_CATALOG 패턴으로 향후 권한 추가 시 코드 수정 없이 catalog entry + seed row만 추가하면 되는 구조 확보. IA 재구조화를 bank task에 번들링하여 2회 배포 회피.
- **아쉬운 점**: ClassroomDetail을 분해하지 못해 `/boards`가 현재 `/students`와 동일 내용 렌더 (MVP 한계, 후속 분리 필요). 카메라 QR 스캐너 미포함으로 매점원이 토큰 수동 paste 필요 — 실사용 UX에서 걸림. nonce 캐시가 in-memory라 Vercel cold start 시 초기화됨 (60s 만료가 primary 방어지만 찝찝함). 잔액 race 방어가 `db.$transaction` 내 재조회 수준이라 Postgres serializable isolation까진 안 감 — 학급 규모 실질 문제 없지만 이론적 구멍.
- **다음 task에서 적용할 것**: (1) QR 스캐너는 `html5-qrcode` 또는 `@zxing/browser` 라이브러리 도입하여 실제 카메라 스캔 지원 — 곧 후속 task로. (2) Redis/Upstash 기반 persistent nonce cache. (3) ClassroomDetail 분해 — 학생명부 탭과 보드 탭을 정식 컴포넌트로 쪼개기. (4) cron은 벌크 단위로 처리 시 실패 재시도 패턴 (retry-with-backoff) 필요.

## 학습 포인트

- **PERMISSION_CATALOG 패턴**: 권한을 상수 카탈로그로 선언 + DB 오버라이드로 학급별 커스터마이즈. DJ 보드의 `BoardLayoutRoleGrant`와 경계 분리 유지 (DJ는 layout-level, bank는 classroom-level feature).
- **Transaction.balanceAfter 감사 체인**: 매 거래 직후 잔액을 기록하면 후속 거래의 balanceAfter와 비교해 체인 무결성 검증 가능. 금전 시스템의 표준 패턴 재발견.
- **IA 재구조화 번들링**: 주요 기능 task와 페이지 구조 변경을 한 번에 하면 배포 횟수 줄고 QA 한 번에 끝. 대신 task 스코프 커져 phase3 설계 오래 걸림. 트레이드오프.
- **Cron idempotent by status filter**: `WHERE status='active'` 필터 자체가 idempotency 제공. 별도 "이미 처리됨" 테이블 불필요.
