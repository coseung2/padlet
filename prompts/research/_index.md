# Research Pipeline — Index

신규 기술/라이브러리/UX 도입 검토 절차. 제품 코드와 분리해서 판단만 내린다.

## Phase 순서

| # | Phase | 파일 | gstack 스킬 |
|---|---|---|---|
| 0 | 질문 정의 (question_framer) | `phase0_question_framer.md` | `/office-hours` |
| 1 | 조사 (researcher) | `phase1_researcher.md` | — |
| 2 | 프로토타입 (prototyper) | `phase2_prototyper.md` | — |
| 3 | 평가/결론 (evaluator) | `phase3_evaluator.md` | — |
| ⚙ | **검증 게이트 — 도입 검증** | | |

## 트리거

- "X 라이브러리 써도 될까?"
- "Y 패턴이 우리 케이스에 맞을까?"
- "Z UX가 사용자에 나을까?"
- 기술 스택 변경/추가 후보 탐색
- feature 파이프라인에서 불확실성이 높아 일단 멈추고 검토가 필요할 때

## task 디렉토리

```
tasks/{YYYY-MM-DD-slug}/
├── phase0/question.json
├── phase1/{research_pack.md,candidates.json,source_index.json}
├── phase2/{prototype/,prototype_log.md}
└── phase3/decision.md
```

## 검증 게이트

feature `_index.md`와 동일 (파일 존재 / 필수 필드 / 참조 일관성 / TODO 부재).

## 핸드오프 원칙

- 프로토타입 코드는 **제품 코드와 반드시 분리**. `tasks/{task_id}/phase2/prototype/`에 격리
- 도입 결정 후 실제 반영은 **별도 feature task**에서 (research → feature 완전 분리)
- 도입 거절도 valid 결과. `decision.md`에 사유 기록 후 종료
- `NEEDS_MORE_RESEARCH` 판정 시 새 research task의 `question.json` 초안 포함

## Research 공통 규칙

### 프로토타입 (phase2)
- 빠른 구현 우선, 완성도는 학습 가치가 있는 선까지만
- 외부 API 키나 비용이 드는 서비스는 `prototype_log.md`에 비용/사유 기록 후 진행
- 프로토타입 디렉토리는 `question.json` 결정과 무관하게 감사 이력으로 보존

### 평가 기준 (phase3)
phase3 `decision.md`에는 다음 차원이 반드시 포함:
- 기능 커버리지
- 러닝 커브 / 유지보수 비용
- 라이선스 / 비용 / 벤더 lock-in
- 기존 스택과의 충돌
- 대안 비교 (최소 1개)

### Git
- research task는 브랜치를 만들지 않아도 됨 (제품 코드 무수정 원칙)
- `phase2/prototype/`는 git에 포함 (감사 이력)
