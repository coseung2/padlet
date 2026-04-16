# Doc Updates · card-author-multi

## 업데이트
- `docs/current-features.md` — "카드 다중 작성자 (card-author-multi) — 2026-04-15" 섹션 추가

## 회고 (3줄)

### 잘된 점
- α/β 옵션 비교에서 β(join table)를 채택해 "나중 수정할 비용"을 선제적으로 지움. parent 피드 미래 쿼리까지 같은 primitive 로 대응 가능.
- primary mirror 전략 덕에 기존 수십 개 callsite (parent-viewer, card-author-footer, CardDetailModal, event-signup 등) 전혀 수정 없이도 동작. Surgical 원칙이 명료하게 실현.
- Vitest 21 test 매트릭스로 validation·ordering·mirror 모두 커버해서 phase8 review 에서 추가 수정 0건.

### 아쉬운 점
- parent feed 페이지가 여전히 없어서 "co-author 학부모 visibility" 는 쿼리 준비만 되고 실 surface 는 없음. 별 task 필요.
- CardAuthorEditor 의 free-form row 와 학급 학생 multi-select 가 같은 UI 안에 있어서 3가지 상태(체크됨/free-form 추가됨/둘 다) 의 UX 일관성이 약간 낮음. 추후 UX 리뷰에서 visual separator 추가 고려.

### 다음 task 에서 적용할 것
- primary mirror 패턴을 scope_decision 템플릿에 "하위 호환 전략" 체크항목으로 추가
- Vitest setup 이 이제 완전히 정착됐으니 phase1 research 템플릿에서 "테스트 러너 결정" 단계 제거 가능
