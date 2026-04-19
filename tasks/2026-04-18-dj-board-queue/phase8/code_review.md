# Code Review — dj-board-queue (phase8)

Staff-engineer self-review against `phase3/design_doc.md` and Karpathy 4 원칙.

## 1. 설계 준수

| design_doc.md 항목 | 구현 상태 |
|---|---|
| §1 ClassroomRoleDef · BoardLayoutRoleGrant · ClassroomRoleAssignment | ✓ 스키마 일치, migration SQL 일치 |
| §1.5 migration seed (dj + (dj,dj-queue)→owner) | ✓ idempotent INSERT WHERE NOT EXISTS |
| §1.4 Board.layout zod enum +dj-queue | ✓ 라인 33 |
| §2 API 8개 신규 | ✓ 7 files, 8 handlers (queue x3 + role x3) |
| §2.2 /api/boards POST classroomId refine | ✓ 275-280 |
| §2.2 stream student 허용 + queueStatus | ✓ |
| §3 컴포넌트 트리 | ✓ DJBoard + dj/* 5 files + classroom/ClassroomDJRolePanel |
| §4 데이터 흐름 | ✓ 3 흐름 전부 구현 (submit/approve/권한) |
| §7 rollback | ✓ migration SQL 주석에 manual rollback 기재 |

스코프 드리프트 없음. OUT 목록(§2.2 scope) 침범 없음.

## 2. Karpathy 4 원칙 감사

### ① Think Before Coding
- 가정 3종 전부 phase0 `decisions`에 명시됨: queue_semantics=A1, item_payload=youtube_url_only, classroom_role_system=net_new. 가정 침묵 0.

### ② Simplicity First
- 별도 QueueEntry 테이블 만들지 않음 — Card 재사용 (design §1.2 명시)
- YouTube URL은 정규식+URL 파싱으로 1 파일 70줄. 외부 라이브러리 추가 없음.
- 권한 resolver는 **신규 함수 하나** 추가, 기존 `getBoardRole`/`requirePermission` 전부 그대로. 오버로딩 안 함.
- 범용 역할 패널 UI 만들지 않음 (scope out). DJ 전용.
- ⚠ 약간의 투기: `ClassroomRoleDef`에 `emoji/description` 컬럼 추가 — labelKo 하나만으로 MVP 충분. 데이터 모델 §§1.1에서 UI에 이미 소비 중이므로 정당화됨 (DJRolePanel에서 `emoji`, `description` 사용 안 하지만, 파이프라인 미래 확장을 미리 깔았다는 면에선 Over-design 의심. **결론**: 마이그레이션 1회 비용 대비 향후 ALTER 비용 감안 — 유지.

### ③ Surgical Changes
- 변경된 파일 9개, 신규 파일 15개. 각 변경이 phase3/5 산출물로 역추적 가능.
- `src/app/board/[id]/page.tsx`에서 `role` 변수 처리 방식을 바꿨으나, 기존 studentViewer identity 추적은 의도적으로 보존. 인접 cleanup 없음.
- `src/app/api/boards/[id]/stream/route.ts`: `getBoardRole` → `getEffectiveBoardRole` swap은 phase3 §R1/R2에 명시된 요구사항. 추가 수정 없음.
- `CardData` 타입 `queueStatus?` 1 필드만 추가. 타 필드 touch 안 함.

### ④ Goal-Driven Execution
- 각 AC-1~AC-10에 대응 코드 경로 명확:
  - AC-1: `/api/classrooms/:id/roles/assign` POST
  - AC-2: `DJBoard` `canControl` prop → `.dj-drag-handle` 조건부 렌더
  - AC-3: `/api/boards/:id/queue/:cardId/move` PATCH
  - AC-4: `/api/boards/:id/queue/:cardId` PATCH + SSE snapshot wire
  - AC-5: `getEffectiveBoardRole` viewer 반환 → API role 체크 403
  - AC-6: POST queue + Card.studentAuthorId stamping
  - AC-7: `extractVideoId` + POST validation
  - AC-8: `BoardLayoutRoleGrant` JOIN 매칭 실패 → viewer fallback
  - AC-9: PATCH 마다 `getEffectiveBoardRole` 재호출 + SSE 60s recheck
  - AC-10: typecheck `exit 0`, prisma validate 통과

## 3. 프로덕션 버그 탐색

| # | 발견 | 심각도 | 조치 |
|---|---|---|---|
| B1 | `DJQueueList.handleDrop`에서 drop target의 `order`를 그대로 사용 — collision 가능성 (설계 §5-5에 알려진 엣지) | low | 기존 ColumnsBoard와 동일 패턴. SSE 3s 수렴. **유지** |
| B2 | `DJBoard` `nowPlaying` useMemo의 deps에서 `playedIds` eslint-disable — playedIds는 queueCards에서 파생되므로 안전 | low | eslint-disable 주석으로 표시됨. **유지** |
| B3 | `DJSubmitForm`에 validating/preview-ready 중간 상태 UI 없음 — phase4 brief §1 모달 상태 6종 중 4종만 구현. URL 입력 즉시 제출로 단순화됨 | medium | scope 축소 결정. phase4 `validating/preview-ready`는 UX 개선용이며 AC-7 차단은 submit 시점에 서버가 커버. `@media reduced-motion` 포함 a11y는 CSS에 있음. **유지** — phase2 OUT 목록과 일관(validation 2단계는 나중 polish) |
| B4 | oEmbed fetch는 네트워크 이슈로 느려질 수 있음. POST 핸들러가 그 시간 동안 block | low | Next.js `next: { revalidate: 86400 }` 캐시 사용 중. 첫 제출만 느림. **유지** |
| B5 | `getEffectiveBoardRole` student 경로가 매 permission check에서 최대 3 쿼리. SSE recheck 60s 주기니 수용 가능 | low | 설계 §3.4에 명시. MVP 유지. |
| B6 | 드래그 핸들 `role="button"` 인데 키보드 핸들러 없음 — a11y 경고 가능 | low | MVP 키보드 드래그 scope out(phase4 brief §4-4). SR이 "버튼"으로 읽으면 오해 유발 가능. **수정**: `role="button"` 제거, `aria-label`만 유지 |

### B6 수정 적용

`src/components/dj/DJQueueItem.tsx` 드래그 핸들에서 `role="button"` 제거.

## 4. 판정

전체 PASS (B6 자동 수정 후). REVIEW_OK.marker 생성.

### CSO 결과

별도 `security_audit.md` 참조 — OWASP + STRIDE 관점 전면 감사 통과.
