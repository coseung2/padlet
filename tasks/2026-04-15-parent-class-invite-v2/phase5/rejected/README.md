# Rejected Variants — phase5 audit archive

탈락 변형 감사 이력. **삭제 금지** (prompts/feature/phase5_designer.md §금지).

| 변형 | 컨셉 | 탈락 사유 (요약) |
|---|---|---|
| `v2` | Tabs (인박스/코드/연결됨 탭 분리) | 교사의 인박스 + 코드 동시 참조 플로우 불가. accent-tinted 를 D+N 노랑에 재사용하면 CTA 색과 의미 충돌. |
| `v3` | SidePanel Drawer (코드 on-demand) + 스와이프 | 코드 접근 1-클릭 비용 상시 발생(교사가 항상 열어두는 anti-pattern 유발). 스와이프 gesture 구현·a11y 대안 이중 비용. |
| `v4` | Triage Dashboard (3-card 긴급 요약) + combobox | brief §2.1 단일 정보 계층을 어기고 triage 레이어 추가(인지 부하 +1). 자녀 이름 모호 케이스 취약 combobox. 학부모 stepper 제거는 시각 피드백 손실. |

상세 근거는 `mockups/comparison.md` §3~§5. 최종 선택 = `mockups/v1`, 근거는 `design_spec.md` §1.
