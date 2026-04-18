# Phase 4 — Design Plan

## Scope
DrawingBoard shell (작업실/갤러리 탭) + StudentLibrary sidebar + LibraryPickerModal (AddCardModal 내부).

## Reuse (docs/design-system.md)
- Tab pattern: 기존 BoardSettingsPanel 탭 구조 재사용 (pill tabs, active state).
- Panel: StudentLibrary 는 우측 고정 사이드바 (280px) — 기존 BoardSettingsPanel 비슷한 dock pattern.
- Card thumbnails: 기존 CardAttachments 패턴 재사용 (square ratio, 96-120px thumb, radius md).
- Empty state: 기존 assignment board empty 카드 패턴 (중앙 정렬 아이콘 + 메시지 + secondary CTA).

## Layout spec
- **작업실 탭** (활성 기본): iframe fills remaining vertical. 상단: breadcrumb (board title + `그림보드`), 우측 상단 `내 라이브러리 열기` 버튼.
- **갤러리 탭**: responsive grid `repeat(auto-fill, minmax(160px, 1fr))`, 16px gap.
- **StudentLibrary sidebar**: 학생만 노출. 헤더: "내 그림" + 업로드 버튼(+). 목록: 썸네일 + 타이틀(생략 말줄임).
- **Placeholder card** (Drawpile URL 미설정): 중앙 카드 320x240, 아이콘 🎨, 1차 메시지 "그림보드 서버 미배포", 2차 "BLOCKERS.md 참조" + 외부 링크 스타일.
- **LibraryPickerModal** (AddCardModal 에서 호출): `overlay` + `dialog` 기존 modal 패턴. 내부에 3열 썸네일 그리드. 선택 시 체크 표시, 하단 '첨부' 버튼.

## Interaction
- 탭 클릭 → 즉시 스위치 (URL query `?tab=gallery` optional).
- 업로드: input[type=file] hidden + 버튼 트리거. 성공 시 목록 prepend.
- 라이브러리 picker: 단일 선택 모드 (MVP).
- 그림보드 URL 미설정 시 작업실 탭이 placeholder 로 fallback, 갤러리 탭은 정상 동작.

## Accessibility
- 탭: role="tablist", aria-selected.
- iframe: title="그림보드 작업실".
- 업로드 버튼: aria-label="내 그림 업로드".

## Shotgun variants (결정 to phase5)
V1: 사이드바 우측 (채택 후보 - 공간 효율)
V2: 하단 dock (세로 공간 손실 → 탈락)
V3: 탭 안에 통합 (작업실 탭에서만 보이는 라이브러리) → reject: 갤러리 탭에서도 필요
V4: 모달 only (버튼으로만 열기) → reject: 업로드 흐름 끊김
→ V1 채택.
