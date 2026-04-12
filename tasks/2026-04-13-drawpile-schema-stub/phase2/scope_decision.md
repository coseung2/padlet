# Phase 2 — Scope Decision (strategist)

## Task
Drawpile 그림보드 — 자율 가능 범위(schema + UI stub)로 제한하여 외부 인프라 확보 후 즉시 연결 가능한 상태로 구현.

## Approach
**Partial delivery**. 외부 의존(서버/도메인/COOP-COEP 라이브 검증) 은 BLOCKERS.md 로 분리. 스키마·라우팅·UI placeholder·업로드 경로·라이브러리 연결까지 제품 코드에 merge 가능한 상태로 landing.

## Change type
`feature` — 신규 Prisma 모델 2개 + 신규 컴포넌트 2개 + 신규 API 1개 + 기존 AddCardModal 확장 + layout enum 1개 추가.

## Acceptance Criteria (≥ 6)
1. **Schema PASS** — `StudentAsset`, `AssetAttachment` 모델이 prisma/schema.prisma 에 존재. `Student.assets`, `Card.assetAttachments`, `PlantObservation.assetAttachments` 관계가 연결. `npx prisma generate` + `npx prisma format` non-destructive.
2. **Migration SQL 작성** — `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql` 생성 (Supabase 수동 적용은 블로커로 기록하되 SQL 은 완성). destructive 구문 없음.
3. **Board.layout 'drawing' 허용** — `/api/boards` POST zod enum 에 `drawing` 추가. `/board/[id]/page.tsx` `LAYOUT_LABEL` + switch 에 `drawing` 분기 → `<DrawingBoard />` 렌더.
4. **DrawingBoard placeholder 동작** — `NEXT_PUBLIC_DRAWPILE_URL` 미설정 시 안내 카드 ("그림보드 서버 미배포 — BLOCKERS.md 참조"). 설정 시 `<iframe src={URL} sandbox="...">` 렌더. 작업실/갤러리 탭 토글 동작.
5. **Gallery empty-state** — 갤러리 탭 클릭 시 해당 학급 `StudentAsset.isSharedToClass=true` 썸네일 그리드 로드 (현재 DB 비었어도 빈 상태 UI ("공유된 그림이 아직 없어요") 렌더).
6. **POST /api/student-assets PASS** — 멀티파트 이미지 업로드 → `public/uploads/` 저장 → StudentAsset row 생성 (학생 세션 필수, 50MB 제한, image/* MIME 만 허용). 응답 `{ id, fileUrl, thumbnailUrl, createdAt }`.
7. **StudentLibrary sidebar 동작** — `/board/[id]` 에서 drawing 레이아웃일 때 학생 로그인 시 사이드바에 본인 자산 목록. 업로드 버튼 → `/api/student-assets` 호출 → 성공 시 목록 갱신.
8. **AddCardModal '내 라이브러리' 통합** — 기존 AddCardModal(freeform/grid/stream 등) 에 '내 라이브러리' 버튼 추가. 학생 세션이면 자산 목록 모달 열림 → 썸네일 선택 → `Card.imageUrl = asset.thumbnailUrl` 세팅 + `POST /api/student-assets/{id}/attach` 로 AssetAttachment 생성.
9. **postMessage 계약 문서** — `docs/drawpile-protocol.md` 존재. ready/save/load 이벤트 명세. "Not yet implemented — requires Drawpile fork patch" 섹션 명시.
10. **BLOCKERS.md 존재** — repo root 에 파일. 블로커 4개 항목(GPL fork / 서버 호스팅 / COOP-COEP 라이브 / postMessage bridge) + 각 항목 사용자 수행 단계.
11. **Build + typecheck PASS** — `npm run build` + `npx tsc --noEmit` 모두 성공 (Drawpile URL 없이도).

## Risks
| # | 리스크 | 심각도 | 완화 |
|---|---|---|---|
| R1 | Prisma 마이그레이션 Supabase 수동 적용 누락 → 런타임 500 | H | SQL 파일 완성 + BLOCKERS.md 에 `prisma migrate deploy` 또는 supabase apply_migration 스텝 명시. App 은 StudentAsset 쿼리 실패를 방어적으로 처리(try/catch → 빈 배열). |
| R2 | iframe COOP/COEP 설정이 다른 기능(Canva oEmbed, Youtube 등) 깨뜨림 | H | next.config.ts 수정을 **이 task 에서 수행하지 않음**. drawing 레이아웃 전용 route 에만 적용하는 전략(블로커의 `headers()` matcher)만 문서화. |
| R3 | GPL-3.0 전염 | L | iframe only 통합. WASM/소스 직접 포함 없음. Drawpile fork 는 별도 레포로 격리(블로커). |
| R4 | S6 Lite 에서 Drawpile iframe 로딩 지연 | M | 이 태스크는 placeholder 까지만. 실제 성능 측정은 서버 확보 후 다음 QA 라운드. |
| R5 | 업로드 경로 보안 (학생 세션 위조) | M | 기존 `getCurrentStudent()` 재사용. classroomId 일치 검증 추가. FS 저장 경로 sanitization 기존 패턴 재사용. |
| R6 | AssetAttachment orphan (카드 삭제 후 잔존) | L | onDelete: Cascade 설정. |

## Out of scope (명시적 제외)
- 실제 Drawpile 서버 연결 및 save 이벤트 수신
- COOP/COEP 프로덕션 검증
- 자산 공유 플래그 토글 UI (스키마만 존재; 교사용 토글은 다음 phase)
- 실시간 갤러리 업데이트 (WS push)
- 모바일 전용 터치 최적화

## Dependencies
- 기존: student-auth, rbac, db (Prisma Client), Card/Student 모델, AddCardModal
- 신규: 없음 (외부 라이브러리 추가 없음)

## Rollout
- feat branch only. 머지 후에도 `NEXT_PUBLIC_DRAWPILE_URL` 미설정 상태로는 프로덕션 기능 비활성. drawing 레이아웃은 teacher 가 명시적으로 선택하지 않는 한 노출 안 됨.
