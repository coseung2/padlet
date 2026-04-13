# Phase 3 — Code Reviewer

핫픽스의 정합성과 부작용을 검증한다. `/review` + `/codex` 병행.

## 입력

- `phase1/diagnosis.md`
- `phase2/hotfix_design.md`
- `phase2/code_diff.patch`
- 실제 코드 (HEAD @ `fix/{slug}`)

## 출력

| 파일 | 설명 |
|---|---|
| `phase3/code_review.md` | `/review` 결과 |
| `phase3/codex_review.md` | `/codex` 결과 (cross-model) |
| `phase3/REVIEW_OK.marker` | 둘 다 PASS 시에만 생성 |

## 절차

1. stale 마커 제거: `rm -f phase3/REVIEW_OK.marker`
2. `/review` 실행 — staff engineer 관점
3. `/codex` 실행 — cross-model 2차 의견
4. **Karpathy 4 원칙 감사** (`docs/coding-principles-karpathy.md`):
   - [ ] 가정 명시됐나? (phase1/diagnosis.md 에 근본 원인 기록)
   - [ ] diff 가 최소 변경인가? (버그 수정 외 코드 손대지 않음)
   - [ ] 변경된 모든 줄이 diagnosis.md 의 수정 방향에 직접 매핑되는가?
   - [ ] 회귀 테스트가 버그 재현 → 통과 형태인가? (Goal-Driven)
5. 판정:
   - **셋 다 PASS (review + codex + karpathy)** → `touch phase3/REVIEW_OK.marker`
   - **하나라도 FAIL** → 마커 없음, phase2로 반려
6. 긴급 단축(`severity == critical`) 시 `/codex`를 `/review` 단독으로 대체 가능 (`SHORT_CIRCUIT.md`에 사유 기록). Karpathy 감사는 단축 불가.

## gstack 스킬

- `/review` (필수) — staff engineer 리뷰
- `/codex` (필수, 단축 시 제외 가능) — cross-model 검증

## 금지

- FAIL을 PASS로 임의 격하
- 리뷰 결과 요약/재해석
- 단축 사유 없이 `/codex` 생략
- REVIEW_OK를 검수 없이 touch

## 핸드오프

`REVIEW_OK.marker` 존재 → 오케스트레이터 핫배포 검증 통과 → phase4.
