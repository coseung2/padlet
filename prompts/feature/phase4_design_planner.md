# Phase 4 — Design Planner

구현할 화면의 디자인 요구사항을 정리한다. **목업 생성은 phase5의 일.**

## 입력

- `phase2/scope_decision.md`
- `phase3/design_doc.md`
- `docs/design-system.md` (존재 시)

## 출력

`phase4/design_brief.md`

### 필수 섹션

```markdown
# Design Brief — {slug}

## 1. 화면/상태 목록
주요 화면 × 주요 상태 (empty, loading, ready, error, success)
각 상태에서 보여야 할 정보/행동

## 2. 정보 계층
주요 정보 우선순위 (1~3)
시선 흐름

## 3. 인터랙션 명세
사용자 행동 → 시스템 반응 매핑
마이크로 인터랙션 (호버, 드래그, 드롭, 전환)

## 4. 접근성 요구 (최소 3개)
- 키보드 only 동작
- 스크린리더 라벨
- 명도 대비 / 포커스 가시성

## 5. 디자인 시스템 확장 여부
- 기존 토큰/컴포넌트로 가능한가
- 신규 토큰/컴포넌트가 필요하면 목록
```

## 절차

1. 모든 화면 상태(empty/loading/ready/error/success) 빠짐없이 나열
2. 접근성 요구 최소 3개 명시
3. 디자인 시스템 확장이 필요한지 판단
4. 이 단계는 텍스트 중심 — 실제 비주얼은 phase5

## gstack 스킬

- `/plan-design-review` — 0~10점 디자인 차원 평가 + AI slop 감지
- `/design-consultation` — 리서치/크리에이티브 접근/디자인 시스템 제안

## 금지

- 상태 ≥ 1개 누락
- 접근성 섹션 공란
- 실제 목업 첨부 (phase5의 일)

## 핸드오프

`design_brief.md`를 phase5에 전달.
