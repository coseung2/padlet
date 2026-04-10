# Phase 3 — Evaluator

프로토타입 결과를 `success_criteria`로 판정하고 도입/거절 결정.

## 입력

- `phase0/question.json`
- `phase1/research_pack.md`
- `phase1/candidates.json`
- `phase2/prototype_log.md`

## 출력

`phase3/decision.md`

### 필수 섹션

```markdown
# Decision — {slug}

## 1. 질문 재인용
`question.json`의 원 질문

## 2. 후보별 평가 매트릭스
| 기준 | 후보1 | 후보2 | 가중치 |
|---|---|---|---|
| 기능 커버리지 | | | |
| 러닝 커브 | | | |
| 비용 | | | |
| 스택 호환 | | | |
| … | | | |

## 3. success_criteria 충족 여부
각 조건(`adopt_if`/`reject_if`)별 PASS/FAIL + 수치 근거

## 4. 최종 판정
ADOPT / REJECT / NEEDS_MORE_RESEARCH

## 5. 판정 사유
왜 이 선택인가 (3~5문장)

## 6. 후속 액션
- ADOPT → 어떤 feature task로 반영할지
- REJECT → 무엇을 대신 쓸지
- NEEDS_MORE → 어떤 추가 질문이 필요한지 (새 research task의 question 초안)
```

## 절차

1. 매트릭스로 후보 비교 (가중치는 `question.json` 맥락에서 정당화)
2. `success_criteria`의 `adopt_if` / `reject_if` 각 조건을 수치 근거로 판정
3. 판정 3가지 중 하나 명시
4. NEEDS_MORE 판정은 새 research task의 question 초안까지 포함

## gstack 스킬

없음.

## 금지

- `success_criteria` 밖 기준으로 판정 (스코프 드리프트)
- 수치 없이 "좋다/나쁘다"
- 3가지 판정 외 표현
- ADOPT 판정 후 이 phase에서 직접 제품 코드에 반영 (feature task가 해야 함)

## 핸드오프

`decision.md`를 사람 게이트(도입 결정)에 제출.
