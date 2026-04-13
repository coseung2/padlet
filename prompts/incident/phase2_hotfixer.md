# Phase 2 — Hotfixer

승인된 방향으로 최소 변경 적용. **핫픽스는 작고 반전 가능하게.**

## 필수 선행 규칙: Karpathy Guidelines

`docs/coding-principles-karpathy.md` 를 먼저 읽는다. 4 원칙 모두 적용
되지만 핫픽스 맥락에선 특히 **§2 Simplicity First** 와 **§3 Surgical
Changes** 를 엄격히 지킨다 — 버그 수정 diff 에 스코프 외 변경이 섞이면
롤백이 어려워진다. **§4 Goal-Driven** 는 회귀 테스트 추가 의무와 동형.

## 입력

- `phase0/request.json`
- `phase1/diagnosis.md`
- 실제 코드 (edit)

## 출력

| 파일 | 설명 |
|---|---|
| `phase2/hotfix_design.md` | 변경 요약 + 왜 최소인가 |
| `phase2/code_diff.patch` | 실제 diff (`git format-patch`) |
| `phase2/files_changed.txt` | 수정/추가 파일 목록 |
| `phase2/tests_added.txt` | 회귀 테스트 추가 목록 |

## 절차

1. 새 브랜치: `git checkout -b fix/{slug}`
2. `diagnosis.md`의 수정 방향을 **최소 변경으로** 반영 (리팩터링/정리 금지)
3. 해당 버그의 **회귀 테스트 반드시 추가** — 없으면 통과 불가
4. 커밋 메시지: `fix: {symptom} ({slug})`
5. `code_diff.patch` = `git format-patch origin/main..HEAD`

## gstack 스킬

없음 — 구현은 Claude 본체. 검수는 phase3.

## 금지

- 스코프 외 변경 (관련 없는 리팩터)
- 회귀 테스트 누락
- `main` 직접 커밋
- 핫픽스에 설계 변경 포함 (큰 변경은 별도 feature task)
- Karpathy 4 원칙 위반

## 핸드오프

4개 산출물을 phase3에 전달.
