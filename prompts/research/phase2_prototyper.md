# Phase 2 — Prototyper

각 후보로 **최소 프로토타입**을 만든다. 학습 가치 있는 선까지만.

## 입력

- `phase0/question.json`
- `phase1/candidates.json`

## 출력

```
phase2/
├── prototype/
│   ├── candidate_1/
│   │   ├── README.md     # 설치/실행/관찰 사항
│   │   └── src/…
│   └── candidate_2/…
└── prototype_log.md      # 각 후보의 실행 결과
```

### prototype_log.md 필수 섹션

```markdown
# Prototype Log — {slug}

## 1. 테스트 시나리오
`question.json`의 success_criteria를 측정하는 최소 재현 케이스

## 2. 후보별 결과
### Candidate 1
- 실행 환경
- 측정값 (P95, 메모리, 개발자 경험 등)
- 관찰한 에러/문제
- 개발자 경험 메모

### Candidate 2
…

## 3. 동일 조건 확인
모든 후보가 같은 입력/환경에서 테스트됐는가
```

## 절차

1. `question.json`의 `success_criteria`를 검증할 수 있는 **최소 재현 케이스** 설계
2. 각 후보를 별도 디렉토리에 격리 구축 — **제품 코드와 섞지 말 것**
3. 동일한 입력/시나리오로 모든 후보 테스트
4. 결과(지표, 에러, 개발자 경험)를 `prototype_log.md`에 factual 기록
5. API 키/비용이 드는 서비스는 `prototype_log.md`에 비용/사유 기록 후 진행

## gstack 스킬

없음.

## 금지

- 제품 코드베이스 수정
- 후보 간 테스트 조건 불일치
- 결과를 `question.json`에 맞춰 왜곡
- 프로토타입 = 완제품 착각 (학습이 목적)

## 핸드오프

`prototype/` + `prototype_log.md`를 phase3에 전달.
