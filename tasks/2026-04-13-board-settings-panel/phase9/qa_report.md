# QA Report — board-settings-panel

Smoke test via dev server (Next 16.2.3 Turbopack, PORT=3000) + curl-based DOM assertions.

## 환경

- `fuser -k 3000/tcp; rm -rf .next; PORT=3000 npm run dev` (프로젝트 규칙 준수)
- Dev server Ready in 5.5s, root `/` 200 OK

## 수용 기준 결과

| # | 수용 기준 | 결과 | 증거 |
|---|---|---|---|
| 1 | owner/editor 보드 헤더에 ⚙ 렌더 | PASS | `/board/columns-demo?as=owner` HTML에 `board-settings-trigger` 1회 + `aria-label="보드 설정 열기"` 1회 |
| 2 | viewer/unauth 에는 ⚙ 안 보임 | PASS | `?as=viewer` HTML에 `board-settings-trigger` 0개 |
| 3 | ⚙ 클릭 시 SidePanel 슬라이드 (title "보드 설정") | PASS (코드 감사) | BoardSettingsLauncher → `<SidePanel title="보드 설정">` |
| 4 | 4탭 + 브레이크아웃 active | PASS (코드 감사) | `useState<Tab>("breakout")`, placeholders에 `"(준비 중)"` 접미어 |
| 5 | breakout tab에 섹션 리스트 + generate/rotate/copy | PASS | columns-demo 3섹션(s_todo, s_progress, s_done) props로 전달, `BreakoutSectionRow` 가 token 상태에 따라 생성/재발급/복사 노출 |
| 6 | generate/rotate는 POST /api/sections/:id/share 호출, 낙관적 UI | PASS | curl `POST /api/sections/s_todo/share` → 200 + new accessToken 응답. `mutate()` 성공 경로에서 `onTokenChange` + `router.refresh()` |
| 7 | 섹션 헤더 ⋯ 1개 | PASS | `?as=owner` columns-demo: `column-header`=3, `section-actions-trigger`=0, `ctx-menu-trigger`=12 (= 3 섹션 + 9 카드) |
| 8 | viewer에게 섹션 ⋯ 안 보임 | PASS | `?as=viewer` columns-demo: `ctx-menu-trigger`=0 (전체) |
| 9 | SectionActionsPanel 공유 탭 없음 | PASS | 파일 grep: `"share"` 탭 문자열 삭제됨. Tab type = `"rename" | "delete"` |
| 10 | /s/[sectionId]/share 배너에 ⚙ 경로 문구 | PASS | `/board/columns-demo/s/s_todo/share?as=owner` HTML에 "보드 설정 → 브레이크아웃", "하위 호환", "보드 페이지" 문자열 포함 |
| 11 | tsc + build | PASS | `npx tsc --noEmit` EXIT=0, `npm run build` EXIT=0 |
| 12 | Galaxy Tab S6 Lite 레이아웃 | PASS (정적 검증) | SidePanel 기존 primitive(>=768px 우측 420px, <768px bottom sheet). 1500px 태블릿은 desktop variant. 본 task에서 새 overflow 도입 없음 |

## 추가 체크

- 보안: POST /api/sections/:id/share 는 서버단 owner 가드 기존 유지. 본 task는 UI 진입점만 재배치 — 엔드포인트/정책 변경 없음. viewer가 ⚙ 버튼 자체를 보지 못하고, 보더라도 API가 거부.
- 접근성: `aria-label="보드 설정 열기"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-modal="true"`, tablist `role="tablist" aria-label`, 각 tab `aria-selected`, `aria-controls`, `aria-labelledby`. 기존 SidePanel의 focus trap + opener 복귀 유지.
- fallback page: viewer 진입 시 기존 "접근 불가 — 공유 링크는 보드 소유자만" 메시지 그대로 (수정 없음).

## QA 판정

전체 PASS → `phase9/QA_OK.marker` 생성.
