# Phase 0 — Analyst

요구사항을 측정 가능한 feature 명세로 변환.

## 입력

사용자 자연어 프롬프트.

## 출력

`tasks/{task_id}/phase0/request.json`

```json
{
  "type": "feature",
  "slug": "card-drag-drop",
  "task_id": "2026-04-09-card-drag-drop",
  "change_type": "new_feature",
  "motivation": "Wall 레이아웃에서 카드를 자유 배치하려면 드래그 필요",
  "user_story": "사용자로서 카드를 마우스로 잡고 원하는 위치에 놓을 수 있다",
  "success_metric": "카드 이동 후 새로고침 시 위치 유지, 이동 중 60fps 이상",
  "affected_surfaces": ["/board/:id"],
  "created_at": "2026-04-09T22:00:00+09:00"
}
```

## 필드 규칙

- `change_type`: `new_feature` | `enhancement` | `copy_only` | `style_only`
- `user_story`: "사용자로서 … 할 수 있다" 한 문장
- `success_metric`: 측정 가능한 숫자/동사 ("개선" 같은 추상 표현 금지)
- `affected_surfaces`: 영향받는 라우트/컴포넌트 경로

## 절차

1. 사용자 프롬프트에서 "누구(persona)", "무엇(기능)", "왜(동기)", "어떻게 검증(성공 기준)" 추출
2. 정보 부족 시 사용자에게 1~2개 질문 (3개 이상 필요하면 task 보류)
3. 성공 기준은 측정 가능한 형태로 번역

## gstack 스킬

- `/office-hours` — 6 forcing questions로 요구사항 재프레이밍. request.json 초안 확정 전 1회 실행.

## 금지

- 사용자 스토리 없이 진행
- 추상적 성공 기준 ("더 나은 UX")
- 사용자가 명시 안 한 추가 변경 추측

## 핸드오프

`request.json` 한 파일만 phase1에 전달.
