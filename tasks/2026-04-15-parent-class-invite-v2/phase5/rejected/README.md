# Rejected Variants — phase5 audit archive

탈락 변형 감사 이력. **삭제 금지** (prompts/feature/phase5_designer.md §금지).

> **주의 (2026-04-14)**: 아래 변형들은 마스킹 규칙(김O민 포맷)이 유효했던 시점(2026-04-13)에 생성됨. 이후 phase9_user_review/decisions.md #1 로 마스킹 전면 제거가 결정됨. **본 아카이브의 와이어프레임 내 마스킹 예시(김O민 등)는 역사적 기록**이며, 재채택 시에는 원본 이름 포맷으로 전환 필요. 탈락 근거 자체(탭 동시 참조 불가, SidePanel anti-pattern, Triage 인지 부하)는 마스킹 여부와 무관하게 유효.

| 변형 | 컨셉 | 탈락 사유 (요약) |
|---|---|---|
| `v2` | Tabs (인박스/코드/연결됨 탭 분리) | 교사의 인박스 + 코드 동시 참조 플로우 불가. accent-tinted 를 D+N 노랑에 재사용하면 CTA 색과 의미 충돌. |
| `v3` | SidePanel Drawer (코드 on-demand) + 스와이프 | 코드 접근 1-클릭 비용 상시 발생(교사가 항상 열어두는 anti-pattern 유발). 스와이프 gesture 구현·a11y 대안 이중 비용. |
| `v4` | Triage Dashboard (3-card 긴급 요약) + combobox | brief §2.1 단일 정보 계층을 어기고 triage 레이어 추가(인지 부하 +1). 자녀 이름 모호 케이스 취약 combobox. 학부모 stepper 제거는 시각 피드백 손실. |

상세 근거는 `mockups/comparison.md` §3~§5. 최종 선택 = `mockups/v1`, 근거는 `design_spec.md` §1.
