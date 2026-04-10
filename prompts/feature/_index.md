# Feature Pipeline — Index

새 기능/화면/API 추가 또는 기존 기능 확장 절차.

## Phase 순서

| # | Phase | 파일 | gstack 스킬 |
|---|---|---|---|
| 0 | 요구사항 구조화 (analyst) | `phase0_analyst.md` | `/office-hours` |
| 1 | 제품/UX 리서치 (researcher) | `phase1_researcher.md` | `/browse` |
| 2 | 스코프/전략 확정 (strategist) | `phase2_strategist.md` | `/plan-ceo-review` |
| ★ | **사람 게이트 — 도입 승인** | | |
| 3 | 기술 설계 (architect) | `phase3_architect.md` | `/plan-eng-review`, `/plan-devex-review` |
| 4 | 디자인 기획 (design_planner) | `phase4_design_planner.md` | `/plan-design-review`, `/design-consultation` |
| 5 | UI 디자인 (designer) | `phase5_designer.md` | `/design-shotgun`, `/design-html` |
| 6 | 디자인 검수 (design_reviewer) | `phase6_design_reviewer.md` | `/design-review` |
| 7 | 구현 (coder) | `phase7_coder.md` | — |
| 8 | 코드 검수 (code_reviewer) | `phase8_code_reviewer.md` | `/review`, `/cso`, `/codex` |
| 9 | QA (qa_tester) | `phase9_qa_tester.md` | `/qa`, `/browse`, `/benchmark` |
| ★ | **사람 게이트 — 배포 승인** | | |
| 10 | 배포 (deployer) | `phase10_deployer.md` | `/ship`, `/land-and-deploy` |
| 11 | 문서 동기화 (doc_syncer) | `phase11_doc_syncer.md` | `/document-release`, `/retro`, `/learn` |
| ★ | **사람 게이트 — push 승인** | | |

## task 디렉토리

```
tasks/{YYYY-MM-DD-slug}/
└── phase{0..11}/<산출물>
```

## 스킵 규칙

- `change_type == "copy_only"` (문구만) → phase3, 4, 5, 6 스킵 (phase7 직행)
- `change_type == "style_only"` (CSS/토큰만) → phase3 스킵
- phase8 `/review` PASS + 변경 라인 수 < 50 → phase9는 smoke test만

스킵 사용 시 task 디렉토리에 `SKIP_{PHASE}.md`로 사유 기록.

## 검증 게이트 (자동, 매 Phase 후)

1. 산출물 파일 존재
2. 필수 필드 비어있지 않음
3. 앞 phase 식별자(`slug`, `task_id`)가 일관되게 유지
4. TODO/placeholder/TBD 부재

실패 시 해당 phase 재실행. 3회 연속 실패 시 사람 게이트.

## 핸드오프 원칙

- 다음 phase는 이전 phase 산출물만 입력으로 사용
- 다운스트림은 업스트림 산출물을 임의 추정으로 보정 금지
- 누락 시 해당 phase 재실행

## Feature 공통 규칙

### Git
- `main` 직접 커밋 금지
- 새 브랜치: `git checkout -b feat/{slug}`
- 머지: PR 기반 (`/ship` 사용)
- 커밋 prefix: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

### 디자인 (phase5)
- shotgun 4~6개 변형 중 사람이 선택
- 선택된 변형만 `phase5/design_spec.md`에 기록
- 탈락 변형은 `phase5/rejected/`에 아카이브 (삭제 금지)

### 코드 검수 (phase8)
- 1차: `/review` (Claude staff engineer)
- 2차: `/codex` (cross-model, optional)
- 보안 민감 영역(auth, file upload, DB write, 외부 API) 변경 시 `/cso` 필수
- 검수 통과 마커 `phase8/REVIEW_OK.marker` 생명주기:
  1. phase 시작 시 stale 제거
  2. 전체 PASS 시에만 `touch`
  3. FAIL/timeout 시 마커 생성 금지

### QA (phase9)
- 실제 브라우저 기반 e2e (단위 테스트만으로 통과 금지)
- 수용 기준(phase2 scope_decision.md) 각 항목 PASS 필수
- 통과 마커 `phase9/QA_OK.marker`

### 문서 동기화 (phase11)
- `docs/architecture.md` — 데이터 모델, API, 컴포넌트 트리
- `docs/current-features.md` — 라이브 기능 목록
- `docs/design-system.md` — tokens_patch 반영
- `CLAUDE.md` — 경로/환경 변경
- `README.md` — 사용자 facing 변경
