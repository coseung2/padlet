# Doc Updates — assignment-board (AB-1)

## 업데이트된 문서

### `docs/current-features.md`
- Line 12: `assignment` layout 설명 갱신 — "AB-1 rewrite 2026-04-14: AssignmentSlot entity — roster-bound 5×6 grid, full-screen review modal, inline return reason, identity-based teacher/student/parent scope".
- 파일 끝에 **"과제 게시판 (AB-1) — 2026-04-14"** 섹션 추가 — 엔티티/API/UI/권한/realtime 요약 + deferred 항목(AC-12 WebP, AC-13 Matrix, AC-14 perf 실측).

### `docs/design-system.md`
- §1 시맨틱 상태색 소섹션 통째 교체(2026-04-14 AB-1 주석). `--color-status-submitted-bg/text`, `--color-status-reviewed-bg/text`, `--color-status-returned-bg/text`, `--color-slot-placeholder` 7개 토큰 표로 공식화. 모달 내부 `--radius-btn: 6px` 예외 footnote.

### `docs/architecture.md`
- §Realtime — `assignmentChannelKey(boardId)` helper + `AssignmentRealtimeEvent` union 추가(2026-04-14).
- 파일 말미에 **"Assignment board (AB-1) — 2026-04-14"** 섹션 추가 — state machine 요약, 6 API 표, RBAC 3-layer, 성능 예산, deferred 항목.

### 메모리 업데이트
- `project_shipped_features_2026-04-13.md` → 파일명은 유지, 내용을 2026-04-15 기준으로 갱신. 15번 항목으로 AB-1 추가. 공개 도메인 미정 주의사항 추가.
- 신규 `feedback_migration_pending_canva.md` — 새 migrate deploy 전 status 확인 + 중간 실패 시 `migrate resolve --applied` 패턴 기록.
- `MEMORY.md` 인덱스 두 줄 수정(15 feature, migration check).

## 건드리지 않은 문서

- `CLAUDE.md` — 오케스트레이션 규칙/경로 불변. 스택 결정 이전 feature task가 이미 있으므로 "첫 feature가 스택 확정" 문구는 수정하지 않음(과거 task가 이미 그 역할 했음).
- `README.md` — AB-1은 내부 feature, 사용자 facing README에는 굳이 반영 불필요.
- `docs/external-api.md` — AB-1은 외부 API 변경 없음.
- `docs/MIGRATION_PLAN.md` — prisma migration 정책 변경 없음. 신규 migration은 기존 컨벤션(YYYYMMDD_slug) 그대로 따름.

## 회고 (3줄)

### 잘된 점
- phase2~6 (scope·설계·UX·리뷰) 가 꽉 차 있어서 phase7 coder가 "투기 추상화 없이" 바로 surgical 구현에 들어갈 수 있었음. 24 unit test + tsc + build + schema-trx smoke 4중 검증으로 코더 스스로 red flag 없이 PASS.
- phase4 BLOCKED 에서 사용자 5 질문으로 UX 결정(모달 nav 재사용/반려 inline/미제출 번호만/툴팁 v2/a11y 제안안)을 한 번에 해소 → phase5~7 내내 모호성 재진입 없음.
- phase8 에서 잡은 3건(role=grid · dead ::after · unused returnedAt) 모두 **오케스트레이터가 만든 orphan** — 외부 코드 건드림 없이 Karpathy §3 준수.

### 아쉬운 점
- AC-12 (WebP sharp)·AC-13 (Matrix server guard)·AC-14 (실측) 세 건이 "scope에는 있으나 defer"로 끝났음. 특히 AC-12는 scope §IN-P1 필수로 명시됐는데 phase7에서 단독 판단으로 passthrough(= thumbUrl=imageUrl) 처리 — 엄격한 phase9 QA면 반려 사유 될 수 있음. 방어적 defer 기록은 남겼지만 scope 계약 위반 소지 있음 → 다음 task는 phase7 진입 전 "scope 중 구현 defer 항목 목록"을 사전에 사용자 확인하는 단계 추가 고려.
- Supabase 공유 DB 에 미적용 canva 마이그레이션이 있었다는 걸 phase7/8 내내 모르고 phase10 배포 직전에 발견. prisma migrate status를 phase7 초반 pre-flight로 돌리는 습관 필요.
- 배포 도메인 혼선 (`aura-teacher.com` 이 다른 프로젝트 내용 서빙) — phase10 deploy log에 기록했으나 AB-1 스코프 밖. 별 task로 도메인 정리 필요.

### 다음 task에서 적용할 것
- phase7 pre-flight 체크리스트: `prisma migrate status`, `git pull origin main --dry`, 스코프 중 defer 선언 항목 사용자 재확인.
- phase8 code_review 때 **test harness의 진짜 비어있는 부분** 탐색 — 이번엔 state machine은 충실했지만 API integration test(실제 route handler를 call 하는)가 없음. `scripts/_smoke_ab1.ts` 같은 DB-roundtrip smoke를 표준화.
- 신규 CSS 토큰은 phase5 tokens_patch.json 와 design-system.md 동시 수정을 phase11 아닌 phase7 말미에 하면 phase8 리뷰에서 문서 sync 확인이 자연스러워짐.
