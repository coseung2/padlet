# Phase 5 — Canary Watcher

배포 후 30분~1시간 상주 관찰. 회귀/부작용 감지.

## 입력

- `phase0/request.json` (severity)
- `phase4/deploy_log.md`

## 출력

`phase5/canary_report.md`

### 필수 섹션

```markdown
# Canary Report — {slug}

## 1. 관찰 기간
시작 ~ 종료, 총 분

## 2. 감시 지표
- 에러율 (시계열)
- 응답 시간 (p50/p95/p99)
- 실시간 연결 수
- 핵심 페이지 렌더 성공률

## 3. 이상 신호 (있으면)
타임라인, 증거, 대응 결정 (유지/롤백)

## 4. 종합 판정
CLEAN / ANOMALY / ROLLBACK
```

## 절차

1. `/canary` 실행 — post-deploy monitoring loop
2. 최소 30분, `severity == critical`은 60분 관찰
3. 이상 신호 발견 시:
   - **경미** → 모니터링 지속 + `canary_report.md`에 이상 기록
   - **심각** → 자동 롤백 (`phase4/deploy_log.md`의 롤백 절차)
4. CLEAN 판정 시에만 phase6 진행

## gstack 스킬

- `/canary` — console 에러, 성능 회귀, 페이지 실패 감시 루프

## 금지

- 관찰 기간 < 30분
- 이상 신호 무시
- 판정 근거 없이 CLEAN 선언
- 롤백 후 재배포 (별도 incident task)

## 핸드오프

판정이 CLEAN → phase6. ANOMALY/ROLLBACK → 새 incident task 생성.
