# Code Review — board-settings-panel

Staff-engineer self-review. gstack `/review` 미설치 → 동일 계약을 수동 수행.

## 1. 스코프 드리프트

- `design_doc.md` 에 명시된 파일만 수정/추가. OUT-of-scope 편집 없음.
- `next.config.ts`, `DraggableCard.tsx` 등 병렬 에이전트 파일 미접촉 → 머지 충돌 위험 최소.

## 2. 프로덕션 버그 탐색

### BoardSettingsPanel.tsx
- `useEffect([open, initialSections])` 로 로컬 `sections` 재동기화: caller가 새 `initialSections` 참조로 전달하면 재마운트 필요 없이 동기화. 현재 caller `BoardSettingsLauncher` 는 부모 prop를 직접 forward하므로 안전.
- `handleSectionTokenChange` 에서 `router.refresh()` 호출 — 이는 전체 boardPage를 서버에서 재fetch하므로 비용이 있다. 그러나 토큰 회전은 드문 operation이고, fallback route에서도 최신 token을 반영하기 위해 필요. 수용.
- `navigator.clipboard.writeText` 는 비HTTPS에서 실패할 수 있음 → catch 블록이 친화적 메시지로 폴백. OK.
- `window.confirm` 은 브라우저 네이티브 다이얼로그. Custom modal이 이상적이나 기존 패턴을 유지(SectionShareClient 도 동일).
- SSR 호환: `typeof window !== "undefined"` 체크 후 origin setState → hydration mismatch 없음 (SSR에서는 token이 있을 때 `sharePath` 상대경로만 렌더되고 mount 후 absolute 변경 → input value 변경이지만 동일 컴포넌트 재렌더라 mismatch 아님). PASS.

### BoardSettingsLauncher.tsx
- `open === false` 일 때 `BoardSettingsPanel` 자체를 렌더하지 않음 → SidePanel 의 `useEffect` body scroll-lock이 쓸데없이 등록되지 않음. 효율적.

### ColumnsBoard.tsx
- `menuItems` 가 `canEdit === false` 면 `[]` → `ContextMenu` 가 렌더되지 않음(기존 `{menuItems.length > 0 && <ContextMenu .../>}`). 수용 기준 "viewer는 ⋯ 안 보임" 준수.
- `setPanelState({ tab: "rename" })` 또는 `"delete"` 만 남음 → `SectionActionsPanel` 의 타입 축소와 일치.
- `section.accessToken` prop 은 더 이상 `SectionActionsPanel` 로 전달되지 않음. `SectionData.accessToken?: string | null` 는 컴포넌트 상태 보존용으로 유지됨(향후 필요 시 확장). 사용되지 않는 건 아님 — Breakout tab 초기값으로 page.tsx → props 전달에서 쓰인다. OK.

### SectionActionsPanel.tsx
- `"share"` 탭 제거 후 defaultTab 기본값 `"rename"`. caller(ColumnsBoard)에서 `"share"` 를 전달하지 않음(compile-time 검증됨).
- `SidePanel` opener 포커스 복귀 기존 구현 유지.

### SectionShareClient.tsx
- `useId()` 로 id 네임스페이스. 기존 fallback 페이지(`/s/[sectionId]/share`)는 단일 인스턴스라 영향 없음. BoardSettingsPanel 은 SectionShareClient를 더 이상 import 하지 않고 자체 `BreakoutSectionRow` 를 사용하지만, 만약 나중에 동시 렌더되더라도 id 유니크.

### page.tsx
- `BoardSettingsLauncher` 는 `canEdit` 이 true일 때만 렌더 → viewer/비로그인 경로에서 DOM에 존재하지 않음. API는 이미 서버 가드가 있어 이중 방어.
- `settingsSections` 는 `sectionProps` 에서 파생 → `accessToken` 을 포함한다. 이 값이 브라우저로 전송됨 — 이미 기존 `/s/[sectionId]/share` fallback도 owner인 경우 token을 쿼리 URL로 전송하므로 동일 위협 모델. 추가 유출 없음.

### /s/[sectionId]/share/page.tsx
- 배너 문구에 `<Link>` 추가 → next/link import 이미 존재.
- 문구에 board URL 포함(`/board/${board.id}`). 라우팅 유효.

### side-panel.css
- 새 클래스 모두 기존 토큰 사용. 다크 모드 대응은 기존 variable이 처리. 문제 없음.

## 3. 보안 / 권한

- API 경로 변경 없음. `POST /api/sections/:id/share` 의 owner 체크는 기존 구현 유지.
- ⚙ 버튼은 서버 컴포넌트에서 `canEdit` 기반 렌더 제어 → 클라이언트 번들에 viewer 관련 로직이 노출되더라도 실제 액션은 서버 가드가 거부.
- 토큰은 이미 존재하는 `Section.accessToken` 을 그대로 재표시할 뿐 새 노출 경로 아님.

→ `/cso` 가드 필요성 낮음. 신규 auth/upload/DB 쓰기 없음.

## 4. Cross-model (codex) 검토

`/codex` 미설치. 생략.

## 5. 판정

- 전체 PASS — REVIEW_OK 마커 생성.
