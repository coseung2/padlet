# Phase 6 — Design Reviewer

phase5 디자인을 평가하고 수정한다. **이 phase는 `design_spec.md`를 덮어쓴다** (수정 이력은 git diff).

## 입력

- `phase4/design_brief.md`
- `phase5/design_spec.md`
- `phase5/mockups/` (선택된 것만)

## 출력

| 파일 | 설명 |
|---|---|
| `phase6/design_review.md` | 0~10점 평가 + 수정 사항 |
| `phase5/design_spec.md` | 수정 반영 (원본 덮어쓰기) |
| `phase6/before_after/` | 수정 전후 스크린샷/diff |

### 평가 차원 (각 0~10점)

- **일관성**: 디자인 시스템 준수
- **계층**: 정보 우선순위 표현
- **접근성**: WCAG 기준
- **감성/톤**: 제품 정체성 일치
- **AI slop 감지**: 기계적 반복, 무의미한 그라디언트, placeholder 텍스트
- **반응형**: 브레이크포인트 처리

## 절차

1. `design_brief.md`의 모든 요구사항이 `design_spec.md`에 반영됐는지 체크
2. 6개 차원을 0~10점으로 평가
3. 7점 미만 차원은 반드시 수정
4. 수정 후 `design_review.md`에 최종 점수 기록
5. **전체 평균 ≥ 8점**이어야 phase7 진행

## gstack 스킬

- `/design-review` — plan-design-review와 동일 감사 + 수정 + atomic commits + before/after 스크린샷

## 금지

- 9점 이상 없이 통과
- AI slop 감지 섹션 공란
- 수정 후 재검수 생략
- `design_brief.md` 요구사항 미반영 상태 PASS

## 핸드오프

전체 평균 ≥ 8점 → phase7. 미만 → phase5로 돌아가 변형 재선택 또는 수정.
