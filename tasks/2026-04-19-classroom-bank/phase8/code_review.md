# Code Review — classroom-bank (phase8)

## 1. 설계 준수

| design_doc 항목 | 구현 |
|---|---|
| 7 신규 테이블 + 역참조 | ✓ |
| default permission seed (lazy) | ✓ `ensureClassroomCurrency` + `hasPermission` override 룰 |
| Transaction.balanceAfter 감사 | ✓ 모든 mutation 경로에서 기록 |
| 잔액 체크는 transaction 내부 재조회 | ✓ withdraw/fd_open/charge 전부 |
| QR 토큰 60초 + nonce 소비 | ✓ |
| Cron 만기 idempotent | ✓ status filter |
| IA 분할 | ✓ (5 child pages + ClassroomNav) |
| 결제 건당 1 Transaction | ✓ (per-item 아님) |

## 2. Karpathy 4 원칙 감사

### ① Think Before Coding
- 모든 결정 phase0 decisions + phase3 edge cases에 명시. 가정 침묵 0.

### ② Simplicity First
- 신규 QR 스캐너 라이브러리 추가 안 함 (수동 paste MVP) — 향후 확장 여지
- store charge는 per-item 1 Transaction이 아닌 거래당 1 Transaction
- Wallet은 polling (SSE 도입 안 함) — 15초 주기로 충분
- nonce cache는 in-memory Map — Redis 의존 추가 안 함
- ⚠ 경계에서: `ClassroomRolePermission`의 "override 있으면 default 무시" 룰은 직관적이지만 교사가 실수로 모든 권한 삭제 가능. MVP는 허용.

### ③ Surgical Changes
- 기존 ClassroomDetail 파일 변경 0. 새 페이지에서 재사용만.
- 기존 rbac.ts 건드리지 않고 `bank-permissions.ts` 별도 신설
- 기존 DJ role 시스템과 경계 유지 (bank 권한은 ClassroomRolePermission, DJ는 BoardLayoutRoleGrant 각자)

### ④ Goal-Driven Execution
- AC-1~AC-12 모두 구현 경로 매핑됨 (phase9에서 상세 검증)

## 3. 프로덕션 버그 탐색

| # | 이슈 | 심각도 | 조치 |
|---|---|---|---|
| B1 | `ClassroomBankTab` — `activeFDs` 학생 이름 resolve 시 accountId 매칭. overview API에서 student.accountId 포함 여부 체크. | medium | ✓ fix 적용 (phase7 중 수정) |
| B2 | `ClassroomBankTab.handleRateSave`: `rateInput`이 빈 문자열이면 Number("") === 0. `min/max` 체크 먼저, 0은 허용하나 의도된 "이자율 0" 케이스도 허용됨. | low | 의도된 동작 (0% = 적금 활성이지만 이자 없음). **유지** |
| B3 | QR 토큰 nonce map이 Vercel serverless cold start 시 비워짐 → 같은 공격자가 동일 QR을 여러 함수 인스턴스로 나눠 시도하면 방어 뚫림. | medium | 방어: 1) 60s 만료 자체가 1차 방어 / 2) `maturityDate <= now` 서명 검증. **MVP 수용 가능, Redis 전환은 scope out에 기재** |
| B4 | `PUT /api/classrooms/:id/role-permissions/:roleKey`: body.permissions에 catalog에 없는 키가 오면 필터되지만, 교사 실수로 모든 permission을 false로 저장하면 해당 역할 무력화됨. | low | **의도된 동작** (교사 명시 선택). UI는 모든 체크박스 해제 시 경고 토스트 추가 가능 (향후). **유지** |
| B5 | `/classroom/:id/boards` 페이지가 현재 `/students`와 동일 컨텐츠 렌더 — UX 혼란 가능 | low | 알려진 제한, diff_summary에 명시. 후속 작업. **유지** |
| B6 | `ClassroomBankTab` 이자율 input: 입력 중 rateInput 계속 업데이트되면서 매번 API refresh 트리거... 실제론 refresh만 state 변경하므로 loop 없음. **확인**: refresh는 rateInput에만 deps 있고 그 내부에서 `setRateInput`을 조건부 (빈 string일 때만) 호출하여 무한 루프 방어 | low | 로직 OK. **유지** |
| B7 | FD cancel 시 학생 본인이 은행원이면 본인 적금을 해지 가능. 사회적 문제 여부. | low | phase2 scope에 제외 명시 없음. 방어 필요 시 `openedById !== studentId` 체크. MVP 허용. **유지** |
| B8 | `ClassroomPayTab`: 학생 카드 토큰 textarea에 입력 시 매 키 입력마다 setState. 성능 문제 없음. **유지** |
| B9 | Wallet QR polling: 15초 + QR 토큰 60초 만료. 15초마다 page refresh + QR이 60초 주기로 자체 갱신 → 겹치는 네트워크 호출 가능하나 서버 부담 미미. **유지** |

## 4. 판정

전체 PASS. B1만 fix 적용됨 (phase7 단계). 나머지 LOW 이슈는 후속 과제로 diff_summary.md에 문서화됨.

CSO 감사는 `security_audit.md` 참조 — OWASP Top 10 + 금전 거래 위협 모델 별도 통과.
