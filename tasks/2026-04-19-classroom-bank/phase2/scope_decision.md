# Scope Decision — classroom-bank

## 1. 선택한 UX 패턴

`phase1/ux_patterns.json`의 P1~P8 **전부 채택**. R1~R4는 명시적 거절 (phase1 §거절 패턴).

## 2. MVP 범위

### 포함 (IN)

#### IA 재구조화
- `/classroom/:id` → `/classroom/:id/students` 리다이렉트
- `/classroom/:id/students` — 학생 명부 (기존 ClassroomDetail 학생 테이블 + 역할 드롭다운 분리 이전)
- `/classroom/:id/boards` — 학급 보드 목록 (기존 ClassroomDetail boards 섹션 분리)
- `/classroom/:id/roles` — 역할 카드 + 권한 모달 (신규)
- `/classroom/:id/bank` — 은행 (신규)
- `/classroom/:id/store` — 매점 상품 관리 (신규)
- `/classroom/:id/pay` — 결제 스캐너 (신규)
- `src/components/classroom/ClassroomNav.tsx` — 공통 상단 탭

#### 데이터 모델 신규 테이블 7개
- `ClassroomCurrency` — 학급 화폐 설정 (단위, 이자율)
- `StudentAccount` — 통장 (balance 필드)
- `StudentCard` — 체크카드 (QR secret)
- `StoreItem` — 매점 상품
- `FixedDeposit` — 적금 상품
- `Transaction` — 거래 원장 (감사 추적)
- `ClassroomRolePermission` — 역할별 권한 오버라이드

#### Seed (migration 내부 idempotent)
- `ClassroomRoleDef` 추가 2개: `banker`(은행원 💰), `store-clerk`(매점원 🏪)
- default `ClassroomRolePermission`: banker=bank.*, store-clerk=store.* (학급 첫 방문 시 seed)

#### API
- **은행**: `POST /bank/deposit`, `POST /bank/withdraw`, `POST /bank/fixed-deposits`, `POST /bank/fixed-deposits/:id/cancel`
- **매점**: CRUD `/store/items`, `POST /store/charge`
- **학생**: `GET /my/wallet`, `GET /my/wallet/card-qr` (60초마다 새 토큰)
- **권한**: `GET /classrooms/:id/role-permissions`, `PUT /classrooms/:id/role-permissions/:roleKey`
- **화폐**: `PATCH /classrooms/:id/currency` (unitLabel, monthlyInterestRate)
- **Cron**: `POST /api/cron/fd-maturity` — 매일 00:05 KST 적금 만기 처리

#### 동시성 방어
- 모든 잔액 변경 API는 `db.$transaction` + `SELECT ... FOR UPDATE` 적절 패턴으로 race 방어
- 결제 시 카드 QR 토큰은 **1회 검증만** 유효 (nonce 캐시) — 이중 결제 방어
- Transaction 레코드의 `balanceAfter` 필드로 감사 추적

#### 권한 시스템
- 신규 `hasPermission(classroomId, studentId, permKey)` 헬퍼
- 기존 classroom-role 시스템(role assignment) 그대로 재사용
- 신규 레이어: `ClassroomRolePermission` 테이블 학급별 오버라이드
- 1인 1역할 유지, UI 드롭다운 unchanged

### 제외 (OUT)

| 항목 | 이유 | 후속 task 후보 |
|---|---|---|
| 학생 간 이체 (Q4-B) | 분쟁 방지 + MVP 축소 | - |
| 신용/여신 상품 | 교육용 과함 | - |
| 주급 자동 cron | 물리 현금 배분으로 운영 | - |
| 저축/소비/기부 3분할 지갑 | 단순 단일 통장 | 향후 확장 |
| 카드 디자인 커스텀 (KakaoBank mini 스타일) | 본질 아님 | 향후 |
| Web push 알림 | 인프라 신규 | 별도 task |
| Apple/Google Wallet Pass | Apple Dev 계정 + 복잡 | 별도 task |
| 자동 퀴즈 보상 훅 (Q3-C) | scope 축소 | 별도 automation task |
| 거래 CSV export | 교사 편의 but MVP 아님 | 향후 |
| 부모 통장 열람 | 향후 | 별도 task |

### 스코프 결정 모드

**Expansion** — data-driven 권한 시스템 신설 + IA 재구조화 + 은행 도메인 신설. 단일 feature 아닌 플랫폼 레벨 확장. phase3 architect가 경계 선을 명확히 그려야 함.

## 3. 수용 기준 (Acceptance Criteria)

### 핵심 기능 (AC-1 ~ AC-8)

- **AC-1**: 교사가 `/classroom/:id/students`에서 학생에게 "은행원" 역할 지정 → DB assignment 생성 + 해당 학생 로그인 시 은행 기능 접근 가능.
- **AC-2**: 은행원 학생이 `/classroom/:id/bank`에서 다른 학생 선택 → "입금" 금액 입력 → 실행 → `StudentAccount.balance` 증가 + `Transaction(type="deposit")` 기록. 잔액은 음수 될 수 없음 (출금/결제 시).
- **AC-3**: 은행원 학생이 같은 UI에서 "적금 가입" → 통장에서 차감 + `FixedDeposit` 레코드 생성 (maturityDate = today + 30일, rate snapshot). 학생 `/my/wallet`에 진행중 적금 카드 렌더.
- **AC-4**: 적금 만기 cron이 매일 00:05 KST 실행 → 만기 건 자동 처리: `balance += principal × (1 + monthlyRate/100)`, `Transaction(type="fd_matured")` 기록. 중복 처리 금지.
- **AC-5**: 학생 `/my/wallet`에서 카드 탭 열면 QR 표시. 60초마다 자동 갱신. 이전 토큰은 서버가 만료로 거부.
- **AC-6**: 매점원 학생이 `/classroom/:id/pay`에서 상품 장바구니 → 학생 카드 QR 스캔 → 총액+학생명+잔액 확인 → "결제" → `balance -= total`, `Transaction(type="purchase")` + `StoreItem.stock -= 1` (nullable stock).
- **AC-7**: 비-은행원 비-매점원 학생이 해당 API 직접 호출 시 403. 권한이 매트릭스에서 해제됐으면 즉시 403 (다음 요청부터).
- **AC-8**: 교사가 `/classroom/:id/roles`에서 역할 카드 클릭 → 모달에 체크박스. 체크 해제 → PUT 저장 → 해당 역할 학생의 다음 요청부터 해당 기능 차단.

### 동시성/무결성 (AC-9 ~ AC-11)

- **AC-9**: 같은 학생 카드 QR을 동시에 2대 기기에서 스캔 → 첫 요청만 성공, 두 번째 nonce 중복 또는 tx 충돌로 실패. 잔액 단 1회만 차감.
- **AC-10**: 잔액 5000원 학생에게 동시 결제 3000원×2 시도 → 1개만 성공, 다른 하나는 "잔액 부족" 400. 음수 잔액 불가 (DB-level check 또는 transaction check).
- **AC-11**: 만기 cron 2회 연속 실행해도 같은 FixedDeposit 중복 만기 처리 없음 (status guard).

### 빌드/배포 (AC-12)

- **AC-12**: typecheck + build 통과. `prisma migrate deploy`가 Vercel Linux에서 성공. Seed(role defs + default permissions) 학급 첫 접근 시 idempotent 삽입.

## 4. 스코프 결정 모드

**Expansion** (§2 §확장)

## 5. 위험 요소

### R1. 잔액 정합성 (금전 시스템 본질)
동시 거래 / 부분 실패 / 클라이언트 재시도 시 잔액이 잘못 계산될 위험. Transaction 테이블 + `balanceAfter` 필드 + DB 트랜잭션으로 방어하되 모든 mutation 경로가 패턴을 지키는지 phase3 설계에서 엄격 락다운.

### R2. QR 토큰 재사용 공격
60초 로테이트만으론 불충분 — 캡처→재사용이 1분 이내 가능. 방어책: **서버가 발급한 토큰을 1회 결제로만 소비** (nonce 캐시 15분). 같은 QR 이미지로 두 번째 결제는 반드시 거부.

### R3. QR 로테이트 시 클라이언트-서버 clock drift
학생 기기 시간이 서버와 다르면 토큰 유효성 판정 엇갈림. 방어: 토큰 자체에 서명된 발급 시각 포함 + 서버가 그 시각만 검증.

### R4. 만기 cron 실행 실패 (Vercel cron 불안정)
cron이 한 번 놓치면 학생 만기일 지나도 돈이 안 들어옴. 방어: cron은 `maturityDate <= now()` 조건으로 필터, 과거까지 소급 처리. Idempotent.

### R5. 역할 권한 변경 propagation 지연
권한 체크 캐시가 있다면 permission toggle이 즉시 반영 안 됨. 방어: 캐시 없이 매 요청 DB 조회 (학급 규모라 성능 영향 미미).

### R6. 기존 ClassroomDetail 분리로 인한 회귀
단일 파일을 3개로 쪼개면서 학생 테이블/보드 목록 기능 회귀 위험. 방어: phase7에서 기존 기능 체크리스트 작성 + phase9 QA에서 회귀 검증.

### R7. 학급 첫 진입 시 currency row 미생성
`ClassroomCurrency`가 없는 학급에서 은행 접근하면 null 처리 에러. 방어: 학급 생성 시 auto-create OR 은행 페이지 접근 시 lazy create (교사 only).

### R8. 카드 QR 도용 책임 소재
학생이 다른 학생 QR을 캡처해 결제 → 피해 학생 분쟁. 완전 방어 불가 (QR 특성). 완화: 결제 영수증에 "매점원+시각" 명시 + 교사 감사 뷰에서 이상 감지.
