# Scope Decision — section-actions-panel

## 1. 선택한 UX 패턴
`right-drawer-tabs` (ux_patterns.json `fit_score: 9`).
- 근거: research_pack §A — plant StageDetailSheet 가 이미 우측 시트(>=768px) / 바텀시트(<768px) 반응형을 검증. 탭 세그먼트는 Linear·Notion 에서 3~5개 액션 그룹 분기에 표준적으로 사용.
- 파괴적 액션(섹션 삭제) 전용 탭을 분리해 실수 유발을 낮춘다.

## 2. MVP 범위

### 포함 (IN)
- 새 `src/components/ui/SidePanel.tsx` — 범용 우측 슬라이드 시트 프리미티브
  - props: `{ open, onClose, title, children, labelledBy?, width?, footer? }`
  - a11y: `role=dialog`, `aria-modal=true`, ESC 닫기, body scroll lock, backdrop click 닫기
  - 포커스: open 시 close 버튼 autoFocus, close 시 opener 포커스 복귀 (opener ref 선택적 prop)
  - 포커스 트랩: Tab/Shift+Tab 순환 (최소 구현)
  - 반응형: >=768px 우측 고정 / <768px 바텀 시트
- 새 `src/components/SectionActionsPanel.tsx` — SidePanel 안에서 탭 분기
  - 탭: **공유 / 이름 변경 / 삭제** (한국어)
  - 공유: `SectionShareClient` 재사용 (기존 컴포넌트 그대로)
  - 이름 변경: `EditSectionModal` 의 form 본문을 인라인화한 `SectionRenameForm` (서브컴포넌트 추출)
  - 삭제: 이름 재입력 확인 대신 체크박스 + 빨간 버튼 (현행 `window.confirm` 대체)
- `ColumnsBoard.tsx` 수정
  - 섹션 헤더에 ⋯ 버튼 추가 (owner/editor 만, viewer 숨김)
  - 기존 ContextMenu 의 "수정"/"삭제" 항목은 패널 오픈으로 일원화, Canva 관련 항목만 ContextMenu 에 잔존
  - `EditSectionModal` 호출은 제거하지 않고 유지 (다른 진입점 없으므로 실제로는 제거)
- `/board/[id]/s/[sectionId]/share` 라우트 유지 (북마크 호환). 페이지 상단에 "columns 보드의 ⋯ 메뉴에서도 열 수 있어요" 안내 배너 추가.
- plant `StageDetailSheet.tsx` 리팩터: 내부 `aside` + backdrop 을 `SidePanel` 로 교체. 바깥 teacher/student 경로 시그니처 유지.
- CSS: `src/styles/side-panel.css` 신설. plant-sheet-* 는 **유지** (옵션 1 safety) 하되 SidePanel 이 동일 스타일 토큰 사용하도록 값 공유.

### 제외 (OUT)
- URL 동기화(`?panel=share&section=xxx`) — 후속 task. 북마크 대체 기능은 `/share` 라우트가 이미 담당.
- 실시간 토큰 회전 알림(다른 협업자 화면 자동 갱신) — 후속.
- plant-sheet-* CSS 클래스 완전 제거/리네임 — feat/plant-journal-v2 가 건드리는 영역과 충돌 가능. 본 task에서는 _랩_ 만.
- SidePanel footer prop — 현 MVP 모든 탭이 자체 액션 가지고 있으므로 미사용. 시그니처는 미리 선언해 후속 호환.
- 포커스 트랩 고급(동적 DOM 추가 감지) — 최소 구현으로 제한.

## 3. 수용 기준 (Acceptance Criteria)
1. [ ] owner 가 columns 보드 섹션 헤더 ⋯ 버튼을 클릭하면 페이지 전환 없이 우측 패널이 열린다.
2. [ ] 공유 탭에서 "생성"/"새로 생성" 버튼 클릭 시 `POST /api/sections/:id/share` 호출되고 신규 token 이 입력 필드에 반영되며 "복사" 버튼으로 클립보드 복사 가능.
3. [ ] 회전 후 이전 토큰이 담긴 URL 로 직접 접근 시 기존 token gate 가 403/notFound 를 반환한다(회귀 없음).
4. [ ] 이름 변경 탭에서 저장 시 `PATCH /api/sections/:id` 호출되고 ColumnsBoard 헤더 제목이 즉시 갱신된다.
5. [ ] 삭제 탭에서 확인 체크박스 → 빨간 버튼 클릭 시 `DELETE /api/sections/:id` 호출되고 섹션이 사라지며 카드는 섹션 없음으로 이동한다.
6. [ ] 패널은 ESC 키로 닫힌다 / backdrop 클릭으로 닫힌다 / 닫을 때 body 스크롤 락 해제.
7. [ ] 탭 간 이동 시 탭 버튼에 `aria-selected`, 패널 컨테이너 `role=dialog` + `aria-modal=true` + `aria-labelledby` 연결.
8. [ ] viewer 역할은 ⋯ 버튼 자체가 렌더되지 않고, `/s/[sectionId]/share` 직접 URL 접근은 기존대로 403 유지.
9. [ ] 기존 breakout 학생 뷰 `/board/[id]/s/[sectionId]` 는 회귀 없음 (token gate · server component · 기존 테스트 대상 경로 그대로).
10. [ ] plant teacher matrix 의 StageDetailSheet 클릭 경로 smoke: 시트 열림/닫힘/관찰 추가 버튼 노출 동일.
11. [ ] `npm run typecheck` PASS, `npm run build` PASS.

## 4. 스코프 결정 모드
**Selective Expansion** — 피드백에 명시된 섹션 관리 UX 통합 + plant Sheet 범용화(옵션 1 safety). URL sync · 실시간 갱신 · plant CSS 완전 리네임은 OUT.

## 5. 위험 요소
1. **plant-journal-v2 브랜치와의 충돌 (HIGH)** — v2 가 StageDetailSheet 를 학생 경로에서 제거·수정 중. 본 task 의 StageDetailSheet 내부 구조 리팩터는 충돌 예상. 대응: 리팩터를 _랩 방식_ (컴포넌트 내부에서 return 만 SidePanel 로 감싸기, props 시그니처 불변)으로 최소화. 충돌 발생 시 v2 머지 쪽이 우선권 — `tasks/.../phase11/doc_updates.md` 에 "v2 머지 후 SidePanel 래핑 재적용 필요 여부 확인" 메모.
2. **포커스 트랩 구현 복잡도 (MEDIUM)** — dangerous 잘못하면 a11y 회귀. 대응: react-focus-lock 같은 외부 라이브러리 도입 없이 Tab 키 이벤트로 `firstFocusable`/`lastFocusable` 순환만 구현. 기존 plant Sheet 은 트랩 없었으므로 AC 는 동일 수준까지만 요구.
3. **Body scroll lock iOS Safari (LOW)** — 기존 plant Sheet 은 scroll lock 없었음. 단순 `document.body.style.overflow = 'hidden'` on open / restore on close 로 충분.
4. **`/share` 라우트 잔존의 혼선 (LOW)** — 대응: 페이지 상단에 "이 기능은 columns 보드 ⋯ 메뉴에서도 바로 사용할 수 있어요" 안내 배너 추가.
5. **editor 역할 범위 (LOW)** — 공유 API 는 owner 전용이나 ⋯ 버튼은 editor 에게도 노출. editor 가 공유 탭 진입 시 server 가 403 반환 → UI 는 에러 상태로 표시. 대응: 공유 탭 내부에서 `currentRole !== 'owner'` 일 때 "소유자만 링크를 관리할 수 있어요" 안내로 버튼 비활성화.

## 결정 요약
- 채택 패턴: right-drawer-tabs
- 스코프: Selective Expansion (MVP 11 AC)
- 브랜치 조율: plant 리팩터 랩 방식 최소화
