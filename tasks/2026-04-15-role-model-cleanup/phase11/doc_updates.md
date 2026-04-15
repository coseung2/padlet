# Doc Updates · role-model-cleanup

## 업데이트 대상
- `docs/current-features.md` — "권한 모델" 섹션 신규 추가 (identity × ownership primitive 설명)
- `src/lib/rbac.ts` 내부 JSDoc @deprecated 주석 (이미 phase7 commit 에 포함됨)

## 회고 (3줄)

### 잘된 점
- phase1 research 가 B1~B8 을 명확하게 잡아줘서 phase2 scope 가 논쟁 없이 확정. phase3 arch 는 매트릭스·타입·함수 시그니처까지 미리 그려서 phase7 구현 때 고민 0. 오늘의 다른 task 들에 비해서도 궤도에 오르기 가장 빠른 feature task.
- primitive 가 순수 함수라 17 unit test 매트릭스 커버리지가 신뢰 높음. Canva 앱 · parent v2 처럼 외부 인프라 의존 없고 빌드만 되면 재현 가능.

### 아쉬운 점
- scope 6 PASS / 5 DEFERRED 로 절반 deferred. 특히 UI primitive 교체는 "기능 동등이라 안 해도 됨" 이라고 판정했지만 다음 touchpoint 에서 자연스럽게 교체될 기회를 놓칠 위험. 메모리 `project_pending_role_cleanup` 에 남아 있던 gap 을 완전히 close 하지 못함.
- CardDetailModal 학생 편집 UI 는 phase7 가 열어둔 API 의 실 사용처. "API 가 열려 있지만 UI 경로 없음" 상태는 다음 세션에 또 기억해야 할 부담. 별 task `ui/student-card-edit-modal` 로 명시하면 좋음.

### 다음 task 에서 적용할 것
- phase2 scope_decision 에 "IN 중 DEFERRED 수용 가능한 항목" 명시 — phase7 coder 가 우선순위 판단 쉽도록
- phase3 arch 의 "새 라이브러리 이름" 을 phase2 scope_decision 에서 확정해두면 phase7 파일 생성이 빨라짐 (이번엔 card-permissions.ts 이름을 phase1 에서 붙였음)
- UI 리팩터 (primitive 교체) 는 항상 별 task 로 쪼개는 걸 디폴트로
