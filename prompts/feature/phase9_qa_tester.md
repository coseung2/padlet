# Phase 9 — QA Tester

실제 브라우저로 end-to-end 테스트. 버그 발견 시 수정 + 회귀 테스트 생성.

## 입력

- `phase2/scope_decision.md` (수용 기준)
- `phase7/files_changed.txt`
- `phase8/REVIEW_OK.marker`
- 로컬 dev 서버 (구동 상태)

## 출력

| 파일 | 설명 |
|---|---|
| `phase9/qa_report.md` | 수용 기준별 PASS/FAIL + 스크린샷 |
| `phase9/regression_tests/` | 생성된 회귀 테스트 (e2e) |
| `phase9/perf_baseline.json` | 성능 지표 (Core Web Vitals) |
| `phase9/QA_OK.marker` | 전체 PASS 시에만 생성 |

## 절차

1. dev 서버 구동 확인
2. `scope_decision.md`의 수용 기준 각 항목에 대해 실제 브라우저 테스트
3. 발견한 버그는 작은 커밋으로 수정 (원자적)
4. 각 수용 기준 통과마다 회귀 테스트 생성 (`regression_tests/`)
5. `/benchmark`로 성능 baseline 측정 (`perf_baseline.json`)
6. 전체 PASS → `touch phase9/QA_OK.marker`

## gstack 스킬

- `/qa` — 실제 Chromium 기반 e2e, 버그 자동 수정 + 회귀 테스트 생성
- `/browse` — 수동 탐색/디버깅용
- `/benchmark` — Core Web Vitals, 페이지 로딩, 번들 사이즈 측정

## 금지

- 단위 테스트만으로 통과 판정 (실제 브라우저 필수)
- 수용 기준 한 개라도 FAIL이면 전체 PASS 금지
- QA_OK 마커를 테스트 없이 touch
- 프로덕션 환경 테스트 (dev만)

## 핸드오프

`QA_OK.marker` 존재 → 오케스트레이터 배포 검증 통과 → phase10. 부재 → phase7로 반려.
