# Phase6 User Decisions — parent-class-invite-v2

결정 시점: 2026-04-14
결정자: 사용자 (인터뷰 방식, 6개 질문)

## Lane A 연동 (Canva Portal 용 — phase6 범위 밖이지만 병행 기록)

1. **Tagline**: `Publish Canva designs as cards on your classroom board.`
2. **Description**:
   > Aura-board lets students publish their Canva designs directly to their classroom board. Teachers create boards and share a student code; students log in, pick a design, and post it as a card in one tap. Works on tablets and PCs — no student account required.

## Lane B (phase6 reviewer 결정 포인트, design_decisions.md §2.3 응답)

3. **교사 주 사용 디바이스**: **PC-first 확정** → **v1 Inbox-First 2-Column 유지**. v3 재검토 불필요.
4. **`--color-warning` hex**: **`#f59e0b`** 채택 (AA 대비 4.82:1, 디자인 시스템 accent 톤 유지). `#b45309` fallback 불필요.
5. **Toast 전역 승격**: **A 채택** — `components/ui/Toast.tsx` 신규 + `docs/design-system.md §7` 에 Toast 섹션 추가. task-local 구현 금지.
6. **OnboardingStepper 전역 승격**: **A 채택** — `components/ui/Stepper.tsx` 로 전역 승격 + design-system 문서화. 향후 교사 온보딩 등 재사용 대비.

## phase5 assumption 중 수용 (이의 없음)

- 이메일 템플릿 자녀 이름 원본 노출 / 담임 이름 비노출 (§8.2-2) — OK
- DPlusBadge 대비 4.82:1 AA (§8.2-3) — OK (A 채택과 동일)
- 이름 아바타 도입 scope out (§8.2-5) — OK
- rejected/README.md audit history 보존 — OK (명시적 이의 없음)

## phase6 reviewer 에게

- 위 결정은 user 확정. phase6 reviewer 는 위 결정을 **입력**으로 받아 design_spec.md / tokens_patch.json 최종 통과 여부만 판정.
- design-system.md 업데이트 (Toast §7, Stepper §8) 는 phase8 후 반영 — phase6 에서는 token_patch.json + 신규 컴포넌트 계획만 approve.
- phase7 coder 진입 전 블로커 (phase3 architecture 누락·테스트 인프라·env) 는 별도 트랙.
