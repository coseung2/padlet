# Phase 0 — Question Framer

탐구 질문을 구조화하고 성공/실패 판정 기준을 정의한다.

## 입력

사용자 자연어 질문 또는 가설.

## 출력

`phase0/question.json`

```json
{
  "type": "research",
  "slug": "liveblocks-vs-yjs-for-board",
  "task_id": "2026-04-09-liveblocks-vs-yjs",
  "question": "보드 실시간 동기화에 Liveblocks와 Yjs 중 무엇이 우리 케이스에 나은가?",
  "decision_deadline": "2026-04-16",
  "success_criteria": {
    "adopt_if": ["P95 지연 50ms 이하", "10 동시 접속 오프라인 재동기화 성공", "월 $20 이하 비용"],
    "reject_if": ["위 조건 중 하나라도 미달"]
  },
  "scope_boundary": "보드 1개 기준. 멀티 보드는 out of scope",
  "created_at": "2026-04-09T22:30:00+09:00"
}
```

## 필드 규칙

- `question`: 한 문장의 질문형
- `success_criteria.adopt_if` / `reject_if`: 측정 가능한 조건 (숫자/불리언)
- `scope_boundary`: 이 research의 경계 (스코프 확장 방지)

## 절차

1. 사용자 프롬프트에서 비교 대상/후보 식별
2. 채택/거절 조건을 숫자/불리언으로 명시
3. 스코프 경계 명시 — 모든 시나리오를 다루려 하지 말기
4. 모호 시 사용자에게 1~2개 질문

## gstack 스킬

- `/office-hours` — 질문 재프레이밍 (research 문제로서 충분히 좋은 질문인가)

## 금지

- 추상 기준 ("좋은 성능")
- 스코프 경계 공란
- 여러 질문 묶기 (1 task = 1 질문)

## 핸드오프

`question.json`을 phase1에 전달.
