# Mockup Comparison — parent-class-invite-v2 (phase5)

4개 변형의 장단점 요약. phase6 design_reviewer 가 최종 결정 가능하며, 본 designer 의 **self-selection 은 v1 (Inbox-First 2-Column)**. 근거는 §6.

---

## 1. 핵심 축별 비교

| 축 | v1 Inbox-First 2-Col | v2 Tabs | v3 SidePanel Drawer | v4 Triage Dashboard |
|---|---|---|---|---|
| 교사 페이지 정보 밀도 | 중 (2-col) | 낮음 (탭 1개씩) | 중 (stack + drawer) | 높음 (3-card + 3 섹션) |
| 인박스 시선 접근성 | 즉시 (좌측) | 탭 클릭 1회 | 즉시 (상단) | 즉시 (triage 하단) |
| 초대 코드 접근성 | 즉시 (우측) | 탭 클릭 1회 | drawer 1클릭 | 즉시 (우측 slim) |
| 태블릿(Tab S6 Lite) 적합도 | 중 | 높음 (동일 UX) | 매우 높음 (스와이프) | 낮음 (밀도↑) |
| 모바일 적합도 | 중 | 높음 | 높음 (bottom sheet) | 낮음 |
| 학부모 stepper 명료성 | 높음 (dot) | 높음 (bar%) | 중 (checklist 세로) | 낮음 (none) |
| P4 자녀 선택 UX | 그리드 4열 | 리스트+검색 | 그리드 3열+검색 | combobox 자동완성 |
| 자녀 이름 모르는 부모 지원 | O (시각 탐색) | O (리스트 스크롤) | O (그리드+검색) | 약함 (검색 필수) |
| 신규 디자인 시스템 토큰 | 1 (warning) | 0 | 1 (warning) | 1 (warning) |
| 신규 패턴 도입 | 적음 | 탭 패턴 신규 | SidePanel 재사용 + 스와이프 | triage card 패턴 신규 |
| 기존 Aura-board 시각 일관성 | 매우 높음 | 중 (탭 신규) | 높음 (SidePanel 재사용) | 중 (triage 카드 신규) |
| 구현 복잡도 | 낮음 | 중 | 중(스와이프 gesture) | 중(combobox + count-up) |
| Karpathy Simplicity 충실도 | 높음 | 높음 | 중 | 중 (stepper 제거는 +, triage 신규는 −) |
| 접근성(SR/키보드) | A | A | A- (스와이프 대안 버튼 필요) | A |

범례: A=무결점, A-=대안 필수, B=조정 필요.

---

## 2. v1 — Inbox-First 2-Column

- **장점**
  - design_brief §2.1 "인박스 1순위, 코드 2순위, 연결됨 3순위" 를 레이아웃에 1:1 매핑.
  - 인박스와 코드를 **동시 참조** 가능 (교사가 대기 건 보면서 코드 공유 링크 복사).
  - 기존 Aura-board 카드 패턴/토큰 거의 그대로 확장 → 학습 비용 ↓.
  - 컴포넌트 수가 최소 (DPlusBadge, CodeInput8, StudentPickerCard, OnboardingStepper 4개).
- **단점**
  - 태블릿 세로에서 2-col 의 이점 사라짐 (세로 스택으로 degrade, 코드 섹션이 화면 밖으로 밀림).
  - 모바일에서 QR 을 숨겨야 함 (on-demand) — 작은 마찰.

---

## 3. v2 — Tabs

- **장점**
  - 반응형 분기 거의 없음 (모든 해상도 동일 UX).
  - Deep link (`?tab=inbox`) 로 교사 이메일 알림 → 직접 진입 가능 (brief §1.4 교사 메일 CTA 구현이 깔끔).
  - 디자인 토큰 추가 0개.
- **단점**
  - 교사가 **인박스 + 코드 동시 참조** 불가 (실 사용에서 흔한 플로우: "어, 이 학부모가 신청 안 했네? 코드 다시 알려줘야겠다" 시 탭 왕복).
  - 탭 기반 UI 가 Aura-board 내 기존 패턴에 없음 (신규 컴포넌트 추가 = 디자인 시스템 영향 +1).
  - D+N 노랑을 accent-tinted 재사용 → **accent 색은 "클릭 가능한 CTA"** 의미라 D+N 과 혼동 위험 (brief §4.2 "색만으로 정보 전달 금지" 는 aria-label 로 보완되나, 시각 layer 의 1차 혼동은 남음).

---

## 4. v3 — SidePanel Drawer

- **장점**
  - 기존 SidePanel 프리미티브 재사용 (design-system §7) — 신규 UI 패턴 최소.
  - 태블릿(Tab S6 Lite) 터치 환경에 최적화된 스와이프 액션.
  - 인박스에 전체 세로 공간 할애.
- **단점**
  - 코드 보기에 1-클릭 비용. 교사가 신학기 초 (코드 자주 공유) 에는 **SidePanel 열어두고 쓰는** 패턴 필요 — 설계 의도와 충돌 (의도는 "on-demand" 인데 실 사용은 "always open").
  - 스와이프 gesture 구현 복잡도 + 접근성 보조(버튼 동등) 이중 유지 비용.
  - 체크리스트 stepper 가 design-system 에 없는 신규 수직 패턴 (화면 폭 압박).

---

## 5. v4 — Triage Dashboard

- **장점**
  - D+6↑ 빨강 카드로 **긴급 인지 최단** (3초 이내).
  - 학부모 stepper 제거 = Karpathy §2 Simplicity 극단 (그러나 피드백 손실).
  - 카운트 애니메이션(CountUp) 이 승인 동작에 미세한 성취감 제공.
- **단점**
  - triage 3-card 가 brief §2.1 의 "단일 정보 계층" 을 깨고 추가 계층을 끼워 넣음 (인지 부하 +1).
  - StudentComboBox 는 **자녀 이름 모호/모름** 케이스(예: 조부모가 신청) 에 취약.
  - 학부모 stepper 제거는 "4단계 중 현재 위치" 피드백 손실 → 심리적 불안.
  - 모바일에서 triage 를 pill 로 축소 시 긴급성 시각 강조 효과 소실.

---

## 6. Self-Selection: v1

근거 (우선 순위):

1. **계약 충실도**: design_brief §2.1 정보 계층(인박스 > 코드 > 연결됨) 을 그대로 시각화. v2/v3 는 이를 탭·drawer 로 간접 표현하고 v4 는 별도 triage 레이어를 추가함.
2. **동시 참조 플로우**: 교사 실 사용에서 "대기 목록 확인 ↔ 코드 공유 링크 복사" 가 세션당 2회 이상 반복 (architecture §7.2 교사 60s 폴링 대시보드 모델 기반 추정). 2-column 이 유일하게 이를 동시 충족.
3. **디자인 시스템 확장 최소**: v1 은 신규 토큰 1개(`--color-warning`), 신규 컴포넌트 4개 — brief §5 에서 권고된 범위.
4. **Karpathy Simplicity**: v3/v4 의 스와이프·triage·combobox 는 "있으면 좋은" 고급 인터랙션이지만 MVP 범위 (scope_decision §2.1 "9종 이메일·3-섹션 페이지·매칭 온보딩") 를 초과. v1 은 요구 범위 내 최소 구성.
5. **반응형 degradation 수용 가능**: v1 의 태블릿 세로 degrade (2-col → 스택) 는 실제로 교사가 주로 **데스크탑에서 사용** (학교 PC) 한다는 가정하에 수용 가능. 태블릿 사용 빈도는 낮음.

v2 는 "deep link 지원" 매력이 있으나 동시 참조 불가가 치명적. v3 는 Tab S6 Lite 최적화 의도가 좋으나 교사 주 사용 기기가 PC 이므로 과잉 투자. v4 는 긴급성 시각화가 좋으나 scope 외 학부모 stepper 제거가 risk.

---

## 7. phase6 결정자에게 전달할 open question

1. 교사 주 사용 디바이스 가정(**PC 우선 vs 태블릿 우선**) 이 최종 변형 선택의 분기점. 현재는 PC 우선 가정 → v1. 태블릿 우선이면 v3 재검토.
2. D+N 노랑 토큰 신규 추가 vs 기존 accent-tinted 재사용 중 design-system 정책 결정. 본 designer 권고: **신규 `--color-warning` 추가** (brief §5.4 옵션 a 및 v1/v3/v4 채택).
3. 학부모 온보딩 stepper 스타일 선호 (dot vs bar% vs checklist vs 없음). 본 designer 권고: **dot stepper (v1)** — 시각 부하 최소, 단계별 명료성 최대.
