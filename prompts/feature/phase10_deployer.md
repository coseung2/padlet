# Phase 10 — Deployer

승인된 브랜치를 머지하고 배포한다. PR 기반.

## 입력

- `phase2/scope_decision.md`
- `phase7/files_changed.txt`
- `phase8/REVIEW_OK.marker`
- `phase9/QA_OK.marker`
- `phase9/perf_baseline.json`
- 사람 게이트 — 배포 승인

## 출력

`phase10/deploy_log.md`

### 필수 섹션

```markdown
# Deploy Log — {slug}

## 1. PR 정보
URL, merge commit SHA, 병합 시각

## 2. CI 결과
테스트, 린트, 빌드 모두 PASS

## 3. 배포 대상
preview / production, 배포 URL

## 4. 프로덕션 검증
- 주요 페이지 200 OK
- Core Web Vitals 회귀 없음 (phase9 baseline 대비)
- 에러 모니터링 신호 정상

## 5. 롤백 절차
이전 배포 ID, 롤백 명령
```

## 절차

1. `/ship` 실행 — main 동기화, 테스트, coverage 감사, push, PR 생성
2. PR에서 마지막 리뷰 (자동 체크 PASS 확인)
3. 머지
4. `/land-and-deploy` — 머지 후 CI/deploy 대기 + 프로덕션 헬스체크
5. `phase9/perf_baseline.json`과 프로덕션 측정치 비교 — 회귀 시 롤백

## gstack 스킬

- `/ship` — main 동기화 → 테스트 → coverage → push → PR
- `/land-and-deploy` — PR 머지 → CI/deploy 대기 → 프로덕션 헬스체크

## 금지

- 사람 게이트 없이 배포
- REVIEW_OK 또는 QA_OK 마커 미존재 상태 배포
- CI FAIL 상태 머지
- 프로덕션 검증 건너뛰기

## 핸드오프

`deploy_log.md`를 phase11에 전달.
