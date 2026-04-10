# Phase 7 — Coder

승인된 설계와 디자인을 실제 코드로 구현한다.

## 입력

- `phase3/design_doc.md`
- `phase5/design_spec.md`
- `phase5/tokens_patch.json`
- 기존 코드베이스 (edit)

## 출력

| 파일 | 설명 |
|---|---|
| `phase7/files_changed.txt` | 수정/추가/삭제된 파일 목록 (절대 경로) |
| `phase7/diff_summary.md` | 주요 변경 요약 (섹션별) |
| `phase7/tests_added.txt` | 추가된 테스트 파일 목록 |
| (실제 코드) | feature 브랜치에 커밋 |

## 절차

1. 새 브랜치 생성: `git checkout -b feat/{slug}`
2. `design_doc.md`의 데이터 모델 → 실제 DB/스키마 반영
3. `design_doc.md`의 API → 실제 엔드포인트 구현
4. `design_spec.md` → 실제 컴포넌트 구현
5. `tokens_patch.json` → 디자인 시스템 파일 업데이트
6. 각 기능 단위로 원자적 커밋
7. 새 코드에 대한 테스트 추가 (unit + 필요 시 integration)
8. `files_changed.txt`, `diff_summary.md`, `tests_added.txt` 작성

## gstack 스킬

이 phase는 gstack 스킬을 적극 사용하지 않는다. 구현은 Claude 본체가 직접 수행.
(gstack의 리뷰/QA 스킬은 phase8, phase9에서 사용)

## 금지

- `main`/`master` 직접 커밋
- 설계 범위 밖 변경 (`design_doc.md`에 없는 파일 수정 시 사유 기록)
- 테스트 없는 새 로직 추가
- `design_spec.md` 임의 해석 — 애매하면 phase5로 반려

## 핸드오프

`files_changed.txt`, `diff_summary.md`, `tests_added.txt`를 phase8에 전달.
