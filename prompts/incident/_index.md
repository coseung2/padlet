# Incident Pipeline — Index

버그/운영 사고/UX 이상 대응 절차.

## Phase 순서

| # | Phase | 파일 | gstack 스킬 |
|---|---|---|---|
| 0 | 트리아저 (triager) | `phase0_triager.md` | — |
| 1 | 진단 (investigator) | `phase1_investigator.md` | `/investigate` |
| ⚙ | **검증 게이트 — 진단 검증** | | |
| 2 | 핫픽스 (hotfixer) | `phase2_hotfixer.md` | — |
| 3 | 코드 검수 (code_reviewer) | `phase3_code_reviewer.md` | `/review`, `/codex` |
| ⚙ | **검증 게이트 — 핫배포 검증** | | |
| 4 | 핫배포 (deployer) | `phase4_deployer.md` | `/land-and-deploy` |
| 5 | 카나리 관찰 (canary_watcher) | `phase5_canary_watcher.md` | `/canary` |
| 6 | 인시던트 기록 (doc_syncer) | `phase6_doc_syncer.md` | `/document-release`, `/retro` |
| ⚙ | **검증 게이트 — push 검증** | | |

## 트리거

- 배포 후 에러율 상승
- 사용자가 "이거 왜 이래" / "버그" 보고
- 실시간 동기화 끊김, 데이터 손실 징후
- 인증/권한 사고
- 3rd-party 의존성 장애 (실시간 엔진, 스토리지 등)

## task 디렉토리

```
tasks/{YYYY-MM-DD-slug}/
├── phase0/{request.json,triage.md}
├── phase1/{diagnosis.md,evidence/}
├── phase2/{hotfix_design.md,code_diff.patch,files_changed.txt,tests_added.txt}
├── phase3/{code_review.md,codex_review.md,REVIEW_OK.marker}
├── phase4/deploy_log.md
├── phase5/canary_report.md
└── phase6/incident_entry.md
```

## 긴급 단축 절차

`severity == "critical"`이면:
1. phase1 진단 + phase2 핫픽스 동시 진행 가능
2. phase3 `/codex` 검수를 `/review` 단독으로 대체 가능 (`SHORT_CIRCUIT.md`에 사유 기록)
3. **phase6 인시던트 기록은 사후라도 반드시 수행**

단축 적용 시 task 디렉토리의 `SHORT_CIRCUIT.md`에 사유 기록.

## 검증 게이트

feature `_index.md`와 동일 (파일 존재 / 필수 필드 / 참조 일관성 / TODO 부재).

## 핸드오프 원칙

다음 phase는 이전 phase 산출물만 입력. 임의 추정 보정 금지.

## Incident 공통 규칙

### Git
- `main` 직접 커밋 금지
- 새 브랜치: `git checkout -b fix/{slug}`
- 커밋: `fix: {symptom} ({slug})`

### 진단 (phase1)
- 로그 / 모니터링 / 사용자 재현 **세 소스 교차 검증 필수**
- 단일 소스만 보고 결론 금지
- gstack `/investigate`는 3회 가설 실패 시 자동 중단

### 코드 검수 (phase3)
- `/review` + `/codex` 병행 필수 (단축 시 `/codex` 생략 가능, 사유 기록)
- 검수 통과 마커 `phase3/REVIEW_OK.marker` 생명주기:
  1. phase 시작 시 stale 제거
  2. 둘 다 PASS (단축 시 `/review` 단독 PASS) 시에만 `touch`
  3. FAIL/timeout 시 마커 생성 금지

### 카나리 (phase5)
- 최소 30분, `severity == critical`은 60분 관찰
- 이상 신호 심각하면 자동 롤백 (`deploy_log.md`의 롤백 절차)

### 인시던트 기록 (phase6, 필수)
- `docs/incidents/{YYYY-MM-DD}-{slug}.md`에 등록
- 9개 필드 필수: 발생/감지/해결 시각, severity, 증상, 근본 원인, 수정, 영향, 재발 방지
