# Design Decisions — parent-class-invite-v2 (phase5 supplement)

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14 (phase5 재실행 — phase9_user_review/decisions.md #1 반영)
- **역할**: `design_spec.md` 보조 문서. 주요 선택·트레이드오프·토큰 포인터·blocker/assumption 집약.

---

## 1. 화면 목록 (phase4 §1 기준, 11개 + 이메일 9종)

| # | 화면 | 경로/컴포넌트 | 산출 위치 |
|---|---|---|---|
| 1 | S-T1 InviteCodeSection | `/classroom/[id]/parent-access` 우상단 | mockups/v1/README.md §1.1 |
| 2 | S-T2 ApprovalInboxSection | `/classroom/[id]/parent-access` 좌측 | mockups/v1/README.md §1.1, §1.4 |
| 3 | S-T3 LinkedParentsSection | `/classroom/[id]/parent-access` 우하단 | mockups/v1/README.md §1.1 |
| 4 | S-T4 회전 확인 모달 | RotateConfirmModal | design_spec.md §2.1.4 |
| 5 | S-T5 학급 삭제 모달 | ClassroomDeleteModal | design_spec.md §2.1.5 |
| 6 | S-P1 Signup | `/parent/onboard/signup` | mockups/v1/README.md §2.1, design_spec.md §2.2.2 |
| 7 | S-P2 Verify | `/parent/onboard/signup/verify` | design_spec.md §2.2.3 |
| 8 | S-P3 Code Input | `/parent/onboard/match/code` | mockups/v1/README.md §2.1, design_spec.md §2.2.4 |
| 9 | S-P4 Student Pick | `/parent/onboard/match/select` | mockups/v1/README.md §2.2, design_spec.md §2.2.5 |
| 10 | S-P5 Pending | `/parent/onboard/pending` | mockups/v1/README.md §2.3, design_spec.md §2.2.6 |
| 11 | S-P6 Rejected | `/parent/onboard/rejected` | mockups/v1/README.md §2.4, design_spec.md §2.2.7 |
| E1~E9 | 이메일 9종 공통 레이아웃 | `src/emails/*.tsx` | design_spec.md §2.3, mockups/v1/README.md §3 |

> 11개 UI 화면 + 9개 이메일 템플릿 모두 저해상도(ASCII/마크다운) 와이어프레임 형태로 `mockups/v1/README.md` 에 포함. 픽셀 단위 스펙은 `design_spec.md` 에 동반. phase6 reviewer 의 이미지 요청 시 HTML 렌더 변환을 후속 gstack `/design-html` 로 수행 권고.

---

## 2. 핵심 선택 (Self-Selection: v1 Inbox-First 2-Column)

### 2.1 선택 이유 요약 (comparison.md §6 축약)

1. **계약 충실도**: design_brief §2.1 정보 계층(인박스 > 코드 > 연결됨) 을 2-column 에 1:1 매핑.
2. **동시 참조 플로우**: 교사가 "대기 목록 확인 + 코드 공유" 를 한 화면에서 완결.
3. **디자인 시스템 확장 최소**: 신규 토큰 1개(`--color-warning`), 신규 컴포넌트 10개 (모두 task-local).
4. **Karpathy Simplicity**: v3 스와이프·v4 triage·v2 탭은 MVP scope 초과. v1 은 요구 범위 내 최소 구성.
5. **반응형 degradation 수용 가능**: 태블릿 세로는 stack 으로 degrade. PC 우선 가정 기반.

### 2.2 트레이드오프

| 축 | v1 수용 | 비용 |
|---|---|---|
| 2-column 밀도 | 데스크탑 이점 극대화 | 태블릿 세로에서 LinkedParents 가 화면 밖으로 밀림 |
| QR 192px 고정 | 이미지 품질 보장 | 모바일에서 "QR 보기" 버튼 on-demand 전환 필요 (카드 1-클릭 비용) |
| dot stepper (v1) | 시각 부하 최소 | 구간별 진행률 % 표시는 없음 (bar% 원할 경우 v2 재검토) |
| warning 신규 토큰 | D+N 3색 분기 명확 | docs/design-system.md §1.8 신규 섹션 필요 (phase8 후 반영) |

### 2.3 phase6 reviewer 결정 포인트 (`design_spec.md` §5.5 복제)

1. 교사 주 사용 디바이스 PC/태블릿 가정 — 현재 PC 우선으로 v1 선택. 태블릿 우선이면 v3 재검토.
2. `--color-warning` hex `#f59e0b` 수용 여부 (대안 `#b45309` 대비 더 높음).
3. Toast 컴포넌트 공식 정의 여부 (design-system §7 에 없음).
4. `OnboardingStepper` 전역 승격 시점.

---

## 3. 사용된 디자인 시스템 토큰 (포인터)

### 3.1 기존 토큰 재사용 (docs/design-system.md)

| 용도 | 토큰 | docs 섹션 |
|---|---|---|
| 페이지 배경 / 카드 표면 | `--color-bg`, `--color-surface`, `--color-surface-alt` | §1.1~§1.3 |
| 텍스트 계층 | `--color-text`, `--color-text-muted`, `--color-text-faint` | §1.4~§1.6 |
| Accent (CTA·링크·progress·체크) | `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-accent-tinted-text` | §1.7 |
| Danger (거부·경고 banner·D+6↑) | `--color-danger`, `--color-danger-active` | §1.9 |
| Border | `--color-border`, `--color-border-hover` | §1.10 |
| Radius / Shadow / Border | `--radius-card`, `--radius-btn`, `--radius-pill`, `--shadow-card`, `--shadow-card-hover`, `--shadow-accent`, `--shadow-accent-hover`, `--border-card` | §2, §3, §4 |
| 타이포 scale | Display 26 / Title 20 / Subtitle 16 / Section 15 / Body 14~15 / Label 13 / Badge 12 / Micro 11 | §5 |
| 간격 (8pt grid) | spacing 4 / 8 / 12 / 16 / 24 / 32 / 48 | §6 |
| 패턴 | 카드, 모달, SidePanel, 버튼 3종, Input, Badge/Pill | §7 |
| 접근성 | focus-visible 2px `#097fe8` outline, AA 대비 | §8 |
| 모션 | 180ms box-shadow / 150ms bg / 200ms modalIn / 1.4s shimmer | §9 |

### 3.2 신규 토큰 (phase5 제안 → `tokens_patch.json`)

| 토큰 | 값 | 용도 | 근거 |
|---|---|---|---|
| `--color-warning` | `#f59e0b` | D+3~5 배지 전경, 경고 상태 | brief §5.4 option (a), D+N 3단계 시각 분기 필수 |
| `--color-warning-tinted-bg` | `#fef3c7` | D+3~5 배지 배경, 경고 banner | AA 대비 4.82:1 (Badge 12 허용) |

### 3.3 docs/design-system.md 갱신 계획 (phase8 후)

- §1.8 Warning 섹션 신규 (`--color-warning` + `-tinted-bg`)
- §11 체크리스트에 "터치 타깃 44px (태블릿 우선 surface)" 항목 추가

---

## 4. 컴포넌트 (10개 신규 · 모두 task-local)

- `<DPlusBadge />` · `<CodeInput8 />` · `<StudentPickerCard />` · `<OnboardingStepper variant="dot" />` (brief §5.3 4개) + `<PendingRow />` · `<LinkedRow />` · `<InviteCodeCard />` · `<RotateConfirmModal />` · `<ClassroomDeleteModal />` · `<FilterBar />` (v1 구현 세부)
- 글로벌 승격 없음. `OnboardingStepper`, `FilterBar` 는 후속 task 에서 재평가.
- Toast 는 design-system §7 공식 정의 부재 → task-local 추가 후 phase6 reviewer 가 글로벌 승격 여부 판단.

---

## 5. 이름 노출 규칙 (중요 — 2026-04-14 변경)

### 5.1 결정 출처

- phase9_user_review/decisions.md §1 **"이름 마스킹 전면 제거"**
- phase3_amendment/architecture_amendment.md (§8.5 DELETE, maskedName 필드 삭제)
- phase4/design_brief.md v2 (업데이트판)

### 5.2 영향 범위

- 교사 PendingRow, LinkedRow: 자녀 이름 원본(`김보민` 등)
- 학부모 P4 StudentPickerCard: `김보민` 원본 노출
- 학부모 P5 Pending 신청 정보 테이블: `자녀    김보민`
- 이메일 템플릿: (변화 없음 — 교사 PII 는 여전히 비노출, 자녀 이름은 원본)

### 5.3 aria-label 변경

- 삭제: `aria-label="가려진 이름 김O민"` (스크린리더용 마스킹 안내) 전부 제거
- 변경: `aria-label="{maskedName} 학부모 승인"` → `aria-label="{studentName} 학부모 승인"`
- 유지: D+N 배지 `aria-label="신청 후 N일 경과"` (마스킹 무관)

### 5.4 감사 이력

`mockups/v1/README.md`, `mockups/comparison.md`, `design_spec.md` 는 본 결정 반영하여 갱신. `rejected/v{2,3,4}/README.md` 는 역사적 기록으로 보존하고 `rejected/README.md` 헤더에 주의 추가.

---

## 6. 성능 제약 (Tab S6 Lite baseline)

- 모든 트랜지션 `@media (prefers-reduced-motion: reduce)` 시 instant 전환 (design-system §7 SidePanel 패턴 동일).
- 스와이프/복잡 gesture 미도입 (v3 탈락 근거).
- InviteCode QR 은 데스크탑/태블릿 192×192 SVG (raster 아님, 렌더 비용 저), 모바일 on-demand.
- 이미지 자산 없음(로고 SVG 24px 1개). Tab S6 Lite stutter risk 최소.
- 60s 교사 폴링 / 30s 학부모 폴링 — React key 안정 + diff 기반 row slide/fade (전체 re-render 금지).

---

## 7. Author chip style (user memory 준수)

본 task 에는 카드 작성자 표시 surface 없음(학부모 액세스 관리/온보딩). 향후 학부모가 자녀 보드를 볼 때 사용하는 카드 패턴은 v1 보존 (brief §1.3 에서 scope out 확인). 따라서 author chip 규칙 직접 적용 surface 부재. 단 LinkedRow/PendingRow 의 "학부모 이메일 + 자녀 이름" 세트는 pill chip 이 아닌 row-level 표현을 채택 (계층이 chip 이 아니라 "행 단위 2인 정보" 이기 때문 — chip 은 개별 엔티티 1개에 적합).

---

## 8. Blockers / assumptions

### 8.1 Blockers

없음. 모든 입력(phase2 scope_decision.md, phase3 architecture/data_model/api_contract, phase3_amendment, phase4 design_brief, phase9_user_review/decisions.md) 확보 후 재실행 완료.

### 8.2 Assumptions

1. **교사 주 사용 디바이스 PC 우선** — v1 선택의 전제. phase6 reviewer 가 태블릿 우선으로 뒤집으면 v3 재검토 필요. (phase6 에서 결정)
2. **이메일 예시 이름**: `parent-rejected-*.tsx` 템플릿 본문의 자녀 이름은 원본 노출 (마스킹 없음). 교사 이름(담임)은 노출 금지(design_spec.md §2.3 교사 PII 비노출 유지).
3. **DPlusBadge 노랑 대비** `#f59e0b` on `#fef3c7` = 4.82:1 AA — phase6 reviewer 가 수용하지 않으면 `#b45309` (더 진한 오렌지, 대비 7.0:1) fallback 준비.
4. **Toast** 기존 design-system 에 공식 정의 없음 → task-local 임시 구현 가정. phase6 에서 글로벌 승격 여부 판단.
5. **이름 아바타 대체**: 마스킹 제거로 "가려진 이름" SR 힌트가 없어졌으므로, 리스트에서 동명이인 구분은 `반-번호` (예 `3-2-15`) 로 일차 식별 + 이름 병기 구조 유지. 별도 프로필 사진/이니셜 아바타 도입은 **scope out** (추가 구현 비용 불필요).

---

## 9. phase6 reviewer 전달 사항

1. `design_spec.md` 가 주 산출물. 본 `design_decisions.md` 는 요약 + 업데이트 로그.
2. v1 이 self-selection — phase6 에서 최종 결정. 태블릿 우선 가정 시 v3 재검토 문서(`rejected/v3/README.md`) 참고.
3. 마스킹 제거 반영이 본 재실행의 핵심 차이점. 검수 시 원본 이름 노출에 대한 교사/학부모 UX 영향 재확인 권장 (개인정보 노출 허용 범위는 phase9 decisions #1 에서 이미 합의됨).
4. 신규 토큰 2개는 docs/design-system.md 에 phase8 후 반영 예정. 선 도입 허용 여부 확인.

---

## 10. 변경 로그

- 2026-04-13 22:32 초기 phase5 designer 산출 (commit `565dfb7`, 4 variants + v1 선택)
- 2026-04-14 재실행 (phase9_user_review/decisions.md #1 마스킹 제거 반영)
  - `design_spec.md`: maskedName 언급 6건 → studentName / 이름 원본으로 교체, self-pass 체크리스트 1건 문구 교체
  - `mockups/v1/README.md`: 와이어프레임 내 `김O민 / 이O준 / 박O서 / 한O수` 등 마스킹 예시 → `김보민 / 이도준 / 박서연 / 한민수` 등 원본 포맷으로 교체, 헤더에 업데이트 노트 추가
  - `mockups/comparison.md`: 헤더에 마스킹 제거 노트 추가 (비교 결과 v1 불변)
  - `rejected/README.md`: 헤더에 주의 사항 추가 (탈락 변형 내 마스킹 예시는 역사 기록)
  - 본 `design_decisions.md` 신규 추가
  - `tokens_patch.json`, `rejected/v{2,3,4}/README.md` 본문: 변경 없음 (토큰은 결정과 무관, rejected 본문은 감사 이력으로 원형 보존)
