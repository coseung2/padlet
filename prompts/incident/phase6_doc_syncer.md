# Phase 6 — Doc Syncer

인시던트를 기록 보존한다. **반드시 수행** (긴급 단축도 예외 아님).

## 입력

- `phase0/triage.md`
- `phase1/diagnosis.md`
- `phase2/hotfix_design.md`
- `phase4/deploy_log.md`
- `phase5/canary_report.md`

## 출력

| 파일 | 설명 |
|---|---|
| `phase6/incident_entry.md` | 이 task의 인시던트 기록 |
| `docs/incidents/{YYYY-MM-DD}-{slug}.md` | 프로젝트 인시던트 레지스트리 등록 |
| (선택) `docs/runbooks/...` | 재발 방지용 runbook 추가 시 |

### incident_entry.md 필수 필드

```markdown
# Incident — {slug}

| 항목 | 값 |
|---|---|
| 발생 시각 | |
| 감지 시각 | |
| 해결 시각 | |
| severity | |
| 증상 | |
| 근본 원인 | |
| 수정 내용 | |
| 영향 범위 | |
| 재발 방지 | |

## 교훈
운영 측 / 코드 측 / 프로세스 측 분리
```

## 절차

1. `/document-release` 실행 — 필요 문서 동기화
2. `docs/incidents/`에 이번 인시던트 등록 (디렉토리 없으면 생성)
3. 재발 방지 항목이 있으면 `docs/runbooks/` 업데이트
4. `/retro` — 이번 인시던트 회고 (운영/코드/프로세스)

## gstack 스킬

- `/document-release` — 문서 동기화
- `/retro` — 회고 생성 + 학습 포인트

## 금지

- 9개 필수 필드 누락
- 근본 원인을 "모름"으로 남김
- 재발 방지 섹션 "TODO"
- 긴급 단축을 이유로 skip

## 핸드오프

`incident_entry.md`를 사람 게이트(push 승인)에 제출.
