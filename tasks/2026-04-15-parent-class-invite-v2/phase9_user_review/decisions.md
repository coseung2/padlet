# phase9 §8 USER-REVIEW 결정 로그

작성일: 2026-04-13
결정자: 사용자
task_id: 2026-04-15-parent-class-invite-v2

## 결정

### 1. 이름 마스킹 — **제거 (전체 공개)**

이유: 학급 내 학생들은 서로 이름을 이미 알고 있으므로 학부모에게도 자녀/급우 이름을 마스킹할 실익이 없음.

후속 조치:
- architecture.md §8.5 (마스킹 규칙) 섹션 삭제
- `src/lib/mask-name.ts` 파일 생성 취소
- phase9 test_plan.md §5.2 TC-A12-U1~U8 (마스킹 unit test 8건) 삭제
- AC A-12 ("이름 마스킹 표시") 자체 제거 또는 "이름 원본 표시"로 재작성
- UI 문구(`자녀 maskedName` 등)를 `자녀 이름`으로 변경
- **phase3 architect surgical 재실행 필요** (architecture.md + AC 수정)

### 2. ESLint rule — **한 방향만 강제**

현재 계획(children 디렉토리 → authOnly import 금지)만 유지. 양방향(signup 같은 authOnly 경로에 parentScopeMiddleware 연결 방지) 강제는 하지 않음.

이유: plugin 복잡도 증가 대비 실익 낮음. 실수 발생 시 후속 task로 추가 가능.

후속 조치: 없음 (현재 test_plan.md 그대로).

### 3. 코드 회전 race lock — **`FOR UPDATE` 명시 지시**

phase7 coder 계약서에 Prisma `$queryRaw` 로 `SELECT ... FOR UPDATE` 명시적 lock 구문 작성 지시 추가.

이유: architecture.md §10.4 의 "SELECT-FOR-UPDATE" 명시를 실제 코드로 보증하기 위함. Integration test 의 간접 확인만으로는 불충분.

후속 조치: phase7 coder 진입 시 계약서에 명시.

### 4. Lighthouse 실행 환경 — **Chrome DevTools emulation 확정**

갤럭시 탭 S6 Lite 실기기 측정 불필요. TC-A29-E1 은 Chrome DevTools emulation (CPU 4x throttling + Slow 4G network) 으로 수행.

이유: 실기기 측정 오버헤드 대비 필요도 낮음.

후속 조치: phase9 test_plan.md §5.6 TC-A29-E1 의 "실기기 측정 필요 시 phase9 사용자 개입" 라인 제거.

---

## 후속 phase 진행 계획

1. **phase3 재실행** (마스킹 제거 반영) — architect
2. **phase9 test_plan.md 갱신** — A-12 제거, §8 결정 로그 추가, §5.6 실기기 라인 제거
3. **phase4 design_brief.md 갱신** — 마스킹 관련 문구 "이름 원본"으로 변경
4. **phase5 designer 진입** (원래 계획대로)
