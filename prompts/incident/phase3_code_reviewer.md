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
4. 판정:
   - **둘 다 PASS** → `touch phase3/REVIEW_OK.marker`
   - **하나라도 FAIL** → 마커 없음, phase2로 반려
5. 긴급 단축(`severity == critical`) 시 `/codex`를 `/review` 단독으로 대체 가능 (`SHORT_CIRCUIT.md`에 사유 기록)

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
