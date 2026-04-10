# Phase 2 — Strategist

수집된 리서치를 기반으로 MVP 스코프와 수용 기준을 결정한다.

## 입력

- `phase0/request.json`
- `phase1/research_pack.md`
- `phase1/ux_patterns.json`

## 출력

`phase2/scope_decision.md`

### 필수 섹션

```markdown
# Scope Decision — {slug}

## 1. 선택한 UX 패턴
{ux_patterns.json} 중 어느 것을 채택하는가 + 사유 (research_pack 근거 인용)

## 2. MVP 범위
- 포함 (IN): 이번 task에서 반드시 구현
- 제외 (OUT): 이번 task에서 제외 + 이유 + 후속 task 예정 여부

## 3. 수용 기준 (Acceptance Criteria)
검증 가능한 동사형 체크리스트 5~10개
- 예: "카드 드래그 후 마우스 업 시점에 위치가 DB에 저장된다"

## 4. 스코프 결정 모드
Expansion / Selective Expansion / Hold / Reduction 중 하나

## 5. 위험 요소
구현 전에 알아야 할 리스크 (성능, 동시성, 접근성, 실시간 충돌 등)
```

## 절차

1. `ux_patterns.json`에서 최적 패턴 1개 선정 (선정 사유는 research_pack 근거 인용)
2. MVP/Non-MVP 분리 — 솔로 프로젝트이므로 MVP는 보수적으로
3. 수용 기준은 **사람/기계가 모두 검증 가능한** 형태로
4. 스코프 결정 모드를 명시 (이후 phase3 architect에게 신호)

## gstack 스킬

- `/plan-ceo-review` — 4 모드(Expansion/Selective/Hold/Reduction) 스코프 도전. scope_decision.md 초안 생성 후 실행.

## 금지

- 수용 기준 < 5개
- "nice to have" 열거 (이번 task에서 빠지는 건 명시적 OUT으로)
- 리스크 섹션 공란

## 핸드오프

`scope_decision.md`를 사람 게이트(도입 승인)에 제출. 승인 후 phase3 진행.
