# Phase 4 — Deployer

핫픽스를 프로덕션에 빠르게 반영한다.

## 입력

- `phase2/files_changed.txt`
- `phase3/REVIEW_OK.marker`
- 사람 게이트 — 핫배포 승인

## 출력

`phase4/deploy_log.md`

### 필수 섹션

```markdown
# Hotfix Deploy — {slug}

## 1. PR/머지 정보
PR URL, merge SHA, 병합 시각

## 2. 배포 파이프라인
CI 결과, 배포 ID, 배포 시각

## 3. 프로덕션 검증 (즉시)
- `phase1/diagnosis.md`의 재현 절차를 프로덕션에서 실행 → 증상 사라졌는지 확인
- 핵심 페이지 200 OK
- 에러율 모니터링 (최소 5분)

## 4. 롤백 절차
이전 배포 ID, 롤백 명령
롤백 트리거 조건 (에러율 임계치 등)
```

## 절차

1. `/land-and-deploy` 실행 — 머지 → CI → deploy → 프로덕션 헬스체크
2. **프로덕션에서 `phase1/diagnosis.md`의 재현 절차를 다시 돌려 증상 사라졌는지 확인** (필수)
3. 첫 5분 에러율/알림 관찰
4. `deploy_log.md` 작성

## gstack 스킬

- `/land-and-deploy` — PR 머지 → CI/deploy 대기 → 프로덕션 검증

## 금지

- 사람 게이트 없이 배포
- `REVIEW_OK.marker` 미존재 상태 배포
- 프로덕션 재현 확인 생략
- 첫 5분 모니터링 생략

## 핸드오프

`deploy_log.md`를 phase5에 전달.
