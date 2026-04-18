# Phase 0 — Analyst Notes

- **task_id**: `2026-04-14-assignment-board-impl`
- **slug**: `assignment-board`
- **type**: `feature`
- **SSoT**: `phase0/seed.yaml` (ambiguity 0.083, ≤0.2 threshold PASS)

## 1. request.json 형식 검증

`prompts/feature/phase0_analyst.md` 필수 필드 대비:

| 필드 | 상태 |
|---|---|
| `type = "feature"` | PASS |
| `slug = "assignment-board"` | PASS |
| `task_id` (= 디렉토리명) | PASS |
| `change_type = "new_feature"` | PASS |
| `motivation` | PASS — Seesaw/Classroom 수준 UX + AssignmentSlot 단일 신규 엔티티 + 갤럭시 탭 S6 Lite 성능 보전 |
| `user_story` | PASS — "교사로서 …할 수 있다" 한 문장 |
| `success_metric` | PASS — DOM ≤180, TTI ≤3s, ≥45fps, submissionStatus 5전이 100% 결정론 |
| `affected_surfaces` | PASS — 13개 표면 열거 |
| `context_refs` | PARTIAL — 10개 참조 중 대부분이 `../ideation/*` (다른 레포). padlet에서는 참고 문서로만 취급, 추적 실패 시 pending 처리 |
| `created_at` | PASS |

request.json은 **delivered authoritative input**이므로 재작성하지 않는다. handoff_note.md §5의 "seed 범위 밖" 금지 항목도 그대로 유지.

## 2. seed.yaml ambiguity 0.083 교차검증

Seed `acceptance_criteria` 14개 → `handoff_note.md` 체크리스트 14개 1:1 매칭. `decisions.md` Q1~Q7 전부 해소됐고, 파생분기 없음(§5). ambiguity ≤ 0.2 통과 주장 타당.

**잔존 설계 gap (phase4 design_planner 시점에 해소 필요)**:
1. Submission.userId는 NextAuth User FK — 학생은 `Student`(NextAuth 외부)이므로 "editor = 학생"을 Submission 모델로 매핑하려면 우회 필요. decisions Q6/Q7이 `AssignmentSlot`을 Student FK로 소유하도록 돌려 이 gap을 막았으나, 기존 Submission 모델과 어떻게 브리지되는지는 phase3에서 정의가 필요 (phase1 research.md §blockers 기록).
2. "반려 사유 저장처"가 `AssignmentSlot.returnReason` 또는 `Submission.feedback` 둘 다로 모호하게 명시됨 (seed ontology, AC-7). phase3에서 단일 진실 결정 필요.
3. BoardMember.role 기반 3역할(owner/editor/viewer) 재사용 vs identity-based(teacher/student/parent) 모델 재확인 필요 — **사용자 메모리 `project_permission_model.md`는 identity-based 강제**. seed의 "editor=학생" 표현은 legacy로, phase3에서 identity-based로 재표현해야 함.

## 3. 스코프 해석

### 3.1 북극성 5 primitive (decisions §1.1)
1. 로스터 기반 카드 자동 생성 — teacher 1-click로 Classroom → N=students.count (≤30) AssignmentSlot.
2. 제출/미제출 시각 구분 — Seesaw 썸네일 + Moodle 이진 뱃지.
3. 카드 클릭 → 풀스크린 모달 — 사이드 패널 금지.
4. 교사 가이드(owner top) + 학생 격자(하단) 2 섹션.
5. Student.number 순 결정적 5×6.

### 3.2 기존 Aura-board 스키마와의 대조

- **`Board.layout`**: 이미 `"assignment"` 값을 `prisma/schema.prisma:163` 주석·`src/app/api/boards/route.ts:14-23` zod enum·`src/app/board/[id]/page.tsx:34`·`src/components/AssignmentBoard.tsx` 등에 존재. **재활용 — 신규 enum 값 추가가 아니라 기존 "assignment" 값의 의미를 확장/재정의**하는 형태.
- **`Board.assignmentGuideText`, `Board.assignmentAllowLate`**: 미존재 — 신규 필드 2개 추가 필요.
- **`Submission` 모델**: ES-1(event-signup) 도메인과 공유. `status` enum은 assignment 쓰임("submitted"/"reviewed"/"returned")이 이미 있음 (schema.prisma:298). `AssignmentSlot.submissionStatus`는 별도 네임스페이스로 도입해 혼용하지 않음.
- **`Classroom`, `Student` (with `.number`)**: 이미 존재 (schema.prisma:118-161). Student.number는 Optional(Int?)이어서 null 처리 필요.
- **`AssignmentSlot`**: 신규 엔티티.
- **기존 AssignmentBoard.tsx 컴포넌트**: `Submission` + `BoardMember` 기반 로직으로 구현돼 있음 (215 lines). v1에서는 **대부분 재설계**가 필요 (AssignmentSlot 중심으로, 5×6 격자, 풀스크린 모달, 반려 사유 강제 등). 기존 컴포넌트는 교체 대상.
- **기존 `/api/submissions` + `/api/submissions/[id]`**: assignment 경로는 여기서 PATCH(status: reviewed|returned)를 처리 중. 재사용 가능하지만 AssignmentSlot-연결을 추가해야 함.
- **WebSocket**: `src/lib/realtime.ts`는 key helper만 존재하고 pub/sub 엔진 미선택 (docs/architecture.md §Realtime). phase3에서 `board:${id}:assignment` 채널 key helper만 추가하고 transport는 기존 "미정" 상태 승계.
- **썸네일 파이프라인**: `src/app/api/canva/thumbnail/route.ts`는 Canva CDN 프록시 (w∈{160,320,640}, passthrough — sharp 미사용). `@vercel/blob`의 `put()`이 `src/app/api/upload/route.ts`에서 사용 중. 서버 리사이즈 "160×120 WebP" 요구는 **신규 구현 필요** (Canva 프록시는 width only·WebP 아님). phase3에서 신규 thumbnail service vs 기존 next/image 최적화 활용 tradeoff 명시 필요.
- **RLS**: `prisma/migrations/20260412_add_parent_viewer/rls.sql` 외엔 Supabase RLS **not auto-applied**. 어플리케이션 층(`parent-scope.ts`, `rbac.ts`)이 1차 방어선. seed가 요구하는 "API+DOM+RLS 3-레이어"의 RLS 레이어는 **scaffold-only**로 phase3에서 작성하고 PV-12 동일 패턴으로 활성화 연기 가능.

## 4. 플래그된 가정

1. **"editor=학생" 표현의 재해석**: seed constraint "Students reuse existing Aura editor permission"은 legacy BoardMember.role 기반 언어. 사용자 메모리 `project_permission_model.md` 우선 → phase3에서는 Student identity(student-auth.ts) + AssignmentSlot.studentId 조인으로 권한을 결정. BoardMember 테이블은 owner=teacher 1건만 생성 (신규 editor 행 생성하지 않음).
2. **`AssignmentSlot.cardId` FK**: 학생이 제출하기 전에도 slot은 존재. 초기에는 cardId=null(빈 카드)로 생성할지, 생성 시 빈 Card 프리페칭할지는 phase3 결정. 성능 budget(≤180 DOM) 고려하면 **Card 프리페칭**이 유리 (격자 렌더 시 join 1회).
3. **`submissionStatus` enum에 `"orphaned"`**: decisions §3이 Q6(Student 삭제 대응)으로 추가. seed ontology에는 없음 — **seed와 decisions 간 미세 불일치**. phase1 research에 blocker 기록, phase3에서 enum 최종 확정.
4. **썸네일 "160×120 WebP"**: seed는 sharp/next/image 구현 수단을 지정하지 않음. `@vercel/blob` 업로드 시점 sharp 리사이즈 vs `/api/canva/thumbnail` 패턴 확장 vs `next/image` fill mode만으로 충족 — phase3 선택 필요.
5. **`/parent/child/[id]/assignment` 라우트**: 이미 `/api/parent/children/[id]/assignments` 엔드포인트가 존재 (route.ts:30). "5×6 미렌더 + 자녀 슬롯 1개" 요구를 만족하려면 UI만 신규, API는 AssignmentSlot-aware하게 확장.

## 5. 입력 간 모순 체크

| 항목 | request.json | seed.yaml | decisions.md | handoff_note.md | 판정 |
|---|---|---|---|---|---|
| `submissionStatus` enum 값 | assigned/viewed/submitted/returned/reviewed | assigned/viewed/submitted/returned/reviewed | +`orphaned` (Q6) | 5값 | decisions만 +1. phase3에서 최종 결정. |
| 반려 사유 저장처 | `returnReason` 또는 `Submission.feedback` | 동일 OR | `AssignmentSlot.returnReason` 신규 (or Submission 재사용 0필드) | 동일 OR | 모호. phase3에서 확정. |
| 학생 측 격자 | editor 자기 슬롯만 (request) | own slot only | 5×6 렌더 하지 않음 (학생 측) | 학생 1 slot | 일관. |
| Matrix/grid 뷰 | owner+desktop only | 동일 | 동일 | 태블릿·비-owner 제외 영구 금지 | 일관. |
| WebSocket 채널 명 | `board:${id}:assignment` | — | — | `board:${id}:assignment` 단일 채널 (tablet-perf §2a) | 일관, `realtime.ts` 패턴 확장만. |

**Critical 모순 없음.** §3.1·§3.2·§4에 기록된 미세 gap만 phase3에서 해소.

## 6. 산출

- `phase0/analyst_notes.md` (이 문서)
- `phase0/request.json` (delivered, 수정 금지)
- `phase0/seed.yaml` / `decisions.md` / `handoff_note.md` / `MANIFEST.md` / `context_links.md` (delivered, 수정 금지)

## 7. Phase 0 판정

**PASS** — request.json은 analyst contract 필수 필드를 모두 충족하고 seed와 정합. 잔존 gap은 phase1 research에서 근거 확보 후 phase3에서 해소 가능. 재실행 불필요.
