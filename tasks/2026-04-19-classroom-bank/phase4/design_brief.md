# Design Brief — classroom-bank

## 1. 화면/상태 목록

### A. `/classroom/:id/students` (학생명부)
기존 ClassroomDetail 학생 테이블 + 역할 드롭다운 이관. empty/loading/ready/error는 기존 그대로.

### B. `/classroom/:id/boards` (학급 보드)
기존 ClassroomDetail 보드 섹션 이관. 보드 카드 그리드 + "새 보드" 버튼.

### C. `/classroom/:id/roles` (학급 역할) — 신규

| 상태 | 내용 |
|---|---|
| empty (role def 없음) | "등록된 역할이 없어요" + 초기 seed 안내 |
| loading | 역할 카드 skeleton 3개 |
| ready | 역할 카드 그리드 (은행원 💰 / 매점원 🏪 / DJ 🎧). 각 카드에 지정된 학생 이름 + 활성 권한 개수. |
| modal open | "은행원 권한 설정" 모달 — 체크박스 그룹 (은행 / 매점 카테고리) |
| saving | 모달 저장 버튼 스피너 |
| DJ 카드 | "권한 편집 불가 — 보드별 관리" 배지, 클릭 불가 |

### D. `/classroom/:id/bank` (은행) — 신규

| 상태 | 내용 |
|---|---|
| empty (거래 0건) | "아직 거래가 없어요" 안내 + "학생에게 입금하기" CTA |
| ready (교사 뷰) | 상단 요약 카드 (총 예치금, 활성 적금 수, 이번달 이자 지급액) + 학생 리스트 (잔액 + 최근 거래) + 전체 거래 타임라인 |
| ready (은행원 뷰) | "학생 선택" 섹션 + 입금/출금/적금 가입/적금 해지 버튼. 거래 감사 타임라인은 본인 처리건만 |
| mutation 진행 중 | 버튼 disabled + 스피너 |
| insufficient balance 에러 | 빨간 토스트 "잔액 부족" + 현재 잔액 표시 |

### E. `/classroom/:id/store` (매점 관리) — 신규

| 상태 | 내용 |
|---|---|
| empty | "상품을 추가해주세요" + "상품 추가" CTA |
| ready | 상품 카드 그리드 (이미지/이름/가격/재고) + "상품 추가" 버튼 |
| 상품 편집 모달 | 이름/가격/재고/이미지 입력 |

### F. `/classroom/:id/pay` (결제) — 신규, 핵심

| 상태 | 내용 |
|---|---|
| empty cart | "상품 선택" 그리드 + 빈 카트 영역 "카트가 비어있어요" |
| cart active | 선택된 상품들 (수량 +/-) + 총액 + "결제" 버튼 활성 |
| scanning | QR 스캐너 모달 (카메라 권한 요청) + "학생 카드를 보여주세요" 안내 |
| confirm | 결제 확인 화면: 학생명 + 현재 잔액 + 카트 총액 + 결제 후 잔액 미리보기 + "결제" 최종 버튼 |
| processing | 버튼 스피너 |
| success | "결제 완료" 모달 + 영수증 (아이템 + 총액 + 시각) + "닫기"로 리셋 |
| error: invalid QR | "유효하지 않은 QR 코드" 재시도 |
| error: insufficient | "잔액 부족. 현재 X원, 필요 Y원" |

### G. `/my/wallet` (학생 내 통장) — 신규

| 상태 | 내용 |
|---|---|
| empty (신규 학생) | "아직 거래가 없어요" + 잔액 0원 |
| ready | 잔액 큰 숫자 + 카드 탭 (QR + 60s 타이머) + 진행중 적금 카드 + 최근 거래 10건 |
| 적금 있음 | "n원 · 만기 D-7" 카드 |
| QR 생성 중 | 카드 섹션 스피너 |

## 2. 정보 계층

### `/my/wallet`
1. **잔액** (최상단, 가장 큰 타이포)
2. **카드 QR** (두 번째 큰 섹션, 타이머 포함)
3. 진행중 적금 (있을 때만)
4. 최근 거래

### `/pay`
1. **카트 총액** (상단 sticky)
2. 상품 선택 그리드 (중앙)
3. "결제" CTA (하단 sticky, 카트 비어있으면 disabled)

### `/bank` (은행원 뷰)
1. **학생 선택** (최상단)
2. 액션 버튼 (입금/출금/적금)
3. 본인 처리 거래 내역 (하단)

### `/roles`
1. 역할 카드 그리드 (메인)
2. 모달 오픈 시 권한 체크박스 (카테고리별 그룹)

## 3. 인터랙션 명세

### 결제 플로우 (가장 중요)
- 매점원 `/pay` 접속 → 상품 선택 → 카트 UI 왼쪽에서 슬라이드 인 (300ms)
- 수량 +/- 클릭 → 총액 업데이트 (optimistic, instant)
- "결제" 버튼 → QR 스캐너 모달 페이드 인 (200ms)
- QR 인식 즉시 → 모달 닫힘 + 확인 화면 slide in
- 확인 화면: 학생명/잔액/총액. 잔액 부족 시 "결제" 버튼 red + disabled
- "결제" 클릭 → 스피너 → 성공/실패 토스트 + 카트 리셋

### QR 로테이트
- `/my/wallet` 카드 탭 진입 → 첫 QR fetch → 60s 타이머 프로그레스 바 (accent color)
- 59초 경과 → 새 토큰 fetch, QR 이미지 교체 (fade 150ms)
- 탭 이탈(visibility hidden) → 타이머 일시정지, 복귀 시 즉시 재갱신

### 역할 권한 모달
- 역할 카드 클릭 → 모달 fade in (200ms) + 체크박스 상태 fetch 표시
- 체크박스 토글 → 로컬 state만 업데이트 (optimistic)
- "저장" → 스피너 → 성공 토스트 → 모달 닫힘
- 취소/바깥 클릭 → 변경사항 버림 (경고 모달은 MVP out)

### 은행 입출금
- 은행원이 학생 리스트에서 클릭 → 금액 입력 모달 + optional 사유 → 확인
- 성공 시 학생 행의 잔액 즉시 갱신 + 거래 타임라인 최상단에 추가 (낙관적)

## 4. 접근성 요구

1. **명도 대비**: 모든 금액 숫자는 `--color-text` (4.5:1 이상). 잔액 부족 경고는 `--color-danger` + 볼드
2. **포커스 가시성**: 결제/저장 같은 위험 액션 버튼은 `:focus-visible` outline 2px `--color-accent`
3. **스크린리더 라벨**: 
   - 카드 QR: `aria-label="내 카드 QR 코드, 60초마다 갱신됩니다"`
   - 잔액: `aria-label="현재 잔액 X원"`
   - 결제 확인 모달: `role="alertdialog"` + `aria-describedby`로 금액/잔액 안내
4. **키보드 내비게이션**: 
   - 카트 수량 +/- 는 탭 순서에 포함
   - 모달은 ESC로 닫힘, 포커스 트랩
5. **prefers-reduced-motion**: 모든 transition/transform은 0ms 대체

## 5. 디자인 시스템 확장

### 기존 토큰으로 커버
- 레이아웃/카드/보더/텍스트/액센트 — 전부 기존 재사용
- 잔액 강조 — `--color-text` + 큰 타이포 (기존 .font-display 활용)
- 거래 타입 뱃지 — 기존 `.status-pill` 패턴

### 신규 토큰 (최소)
| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bank-positive` | `#27a35f` | 입금/만기/환불 (초록) |
| `--color-bank-negative` | `#c62828` | 출금/결제 (빨강) |

> 참고: 기존 `--color-plant-active`(#27a35f)와 동일 hex이나 시맨틱 분리 (경제 도메인용 alias).

### 신규 컴포넌트
- `TabNav` (상단 탭) — 재사용 가능한 primitive 여부는 phase5에서 결정. DJ 보드에도 향후 이식 가능하면 shared.
- QR 스캐너 — `html5-qrcode` 또는 `@zxing/browser` 라이브러리 wrapper
- 금액 입력 필드 — 천단위 콤마 + 숫자 only
