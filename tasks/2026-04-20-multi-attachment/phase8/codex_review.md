# Codex Code Review — multi-attachment

## 라운드 1 (HIGH 3건)

### H1. Breakout 카드 일괄 복제에서 `attachments` 유실
- **위치**: `src/app/api/breakout/assignments/[id]/copy-card/route.ts`, `src/components/BreakoutBoard.tsx`
- **문제**: source 카드를 읽을 때 `include: { attachments }` 없이 조회, 복제 대상 행에도 legacy singleton 필드만 복사. attachment-only 카드가 다른 섹션으로 복제되면 빈 카드로 렌더. 클라이언트 merge도 attachments 버림.
- **조치**: copy-card route가 source의 attachments include → 복제 트랜잭션에서 createMany로 신규 cardId에 attachments 이관 → 응답에 attachments 포함. BreakoutBoard client merge에 attachments/fileUrl 필드 추가.

### H2. Breakout 파생 조회면들이 `attachments` 미조회 → 빈 카드
- **위치**: section page, archive page, parent breakout page + API
- **문제**: 해당 페이지들이 Card를 select/include할 때 attachments를 조회하지 않아, 이번 PR로 만든 attachment-only 카드가 학생/학부모/아카이브 뷰에서 미디어 없는 카드로 보임. create 경로가 legacy singleton을 채우지 않으므로 fallback도 못 탐.
- **조치**:
  - `src/app/board/[id]/s/[sectionId]/page.tsx`: Card include에 attachments 추가 + SectionBreakoutView props 확장
  - `src/components/SectionBreakoutView.tsx`: CardLike 타입에 attachments/file 4필드 추가
  - `src/app/board/[id]/archive/page.tsx`: Card findMany include + CardAttachments 호출에 attachments 전달
  - `src/app/api/parent/children/[id]/breakout/route.ts`: cards select에 attachments(kind=image, take 1) 추가
  - `src/app/parent/(app)/child/[studentId]/breakout/page.tsx`: 동일 select + 렌더에서 `c.attachments[0]?.url ?? c.imageUrl` fallback

### H3. AddCardModal MAX 체크가 authoritative하지 않음
- **위치**: `src/components/AddCardModal.tsx`
- **문제**: 라이브러리 픽은 `attachmentsRef`를 갱신 안 해서 `라이브러리 + 업로드` 혼합 흐름에서 10개 초과 가능. 서버 400 → 모달은 onAdd 후 무조건 닫혀 첨부 초안 손실.
- **조치**:
  - `confirmLibraryPick`에 상한 체크 + `attachmentsRef.current` 동기 갱신
  - 제출 직전 pre-submit 상한 검증 (10개 초과 시 alert + return)

## 라운드 2

- H1 fix: createMany 일괄 삽입 + 응답 shape 확장. 회귀 테스트는 기존 수동 QA로 (자동 테스트 infra 부재).
- H2 fix: 5개 파생 경로 모두 attachments include 반영. 소형 뷰(parent breakout)는 썸네일 용도라 kind=image로 필터 + take:1로 페이로드 억제.
- H3 fix: ref 동기화 + pre-submit 가드. 서버 400 후 draft 손실 문제는 독립 UX 이슈로 별도 task 여지(주석 표기).

## 추가 검증

- `npx tsc --noEmit` — ✅
- `npx next build` — ✅
- `npx vitest run file-attachment` — ✅ 20 pass
- 기존 card-permissions / card-authors-service 테스트 — ✅

## 판정

**REVIEW_OK** — 라운드 2까지 HIGH 이슈 없음. `phase8/REVIEW_OK.marker` 생성.
