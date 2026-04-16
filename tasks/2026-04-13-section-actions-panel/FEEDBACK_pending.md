# Section Actions Panel v2 — Pending Feedback (2026-04-12)

> **RESOLVED (2026-04-13)** — 후속 task `tasks/2026-04-13-board-settings-panel/` 에서 요청 전 항목 구현. PR 머지 후 본 파일은 `FEEDBACK_resolved.md` 로 이름 변경 예정.
>
> v2 배포 직후 피드백. 브레이크아웃은 보드 레벨 설정으로 재배치 필요.

## 핵심 재프레이밍

**틀린 전제**: 브레이크아웃(섹션 격리 공유)을 섹션 헤더의 ⋯ 메뉴에 넣음.
**올바른 모델**: 브레이크아웃은 **보드 전체에 대한 설정**(해당 보드를 모둠 모드로 쓸지 여부 + 섹션별 토큰 관리). 보드-레벨 설정 패널에 속함.

## 요청 변경

### 1. 보드-레벨 설정 버튼 신설
- **위치**: 보드 타이틀("제목없음" 등) **우측**에 ⚙ 아이콘 버튼
- **아이콘**: gear/settings shape
- **대상**: owner/editor만 노출
- **동작**: 클릭 시 `SidePanel` 우측 슬라이드로 오픈 (기존 SidePanel 재사용)
- **탭/섹션 구성**:
  - **브레이크아웃** — 해당 보드의 모든 섹션 목록 + 각 섹션별 토큰 발급/회전/복사 링크 (현재 SectionActionsPanel의 "공유" 탭을 보드 레벨로 승격)
  - (미래) **접근 권한** — 멤버 관리
  - (미래) **Canva 연동** — 도메인 레벨 설정
  - (미래) **배경/테마**, **기본 레이아웃** 등

### 2. 섹션 헤더 ⋯ 정리
- 현재 각 섹션 헤더에 `⋯ ⋯` 두 개 중복 (Canva 컨텍스트 메뉴 + SectionActionsPanel 트리거)
- 브레이크아웃(공유)을 보드 설정으로 이동하면 SectionActionsPanel은 **이름 변경 + 삭제** 2개 탭만 남음
- 기존 Canva 컨텍스트 메뉴와 통합 가능성: 하나의 ⋯에서 "이름 변경 / 삭제 / Canva 옵션" 모두 처리 → columns 보드 섹션 헤더에 ⋯ 하나만 유지

### 3. 라우트
- `/board/[id]/s/[sectionId]/share` (기존 fallback 라우트)는 유지 또는 제거 검토. 보드 설정 패널에서 URL 생성 가능하면 제거 고려.

## 영향 범위 (예상)
- 새 컴포넌트: `src/components/BoardSettingsPanel.tsx` — 보드 레벨 SidePanel wrapper
- `src/app/board/[id]/page.tsx` (BoardHeader 또는 EditableTitle 주변) — ⚙ 버튼 추가
- `src/components/SectionActionsPanel.tsx` — "공유" 탭 제거, rename/delete만 유지 (또는 Canva 컨텍스트 메뉴와 통합 후 폐기)
- `src/components/ColumnsBoard.tsx` — 섹션 헤더 ⋯ 중복 제거

## 호환성
- 기존 `POST /api/sections/:id/share` API, `Section.accessToken` 스키마는 그대로 사용. UI 진입점만 변경.
- 섹션 레벨 share 링크 fallback URL(`/board/[id]/s/[sectionId]/share`)의 알림 배너는 "⚙ 보드 설정 → 브레이크아웃"을 가리키도록 문구 업데이트.

---

## 차후 작업 메모
- 이 피드백은 별도 feature task로 올릴 것: `tasks/YYYY-MM-DD-board-settings-panel/`
- 추가 피드백 계속 수집 → 보드-레벨 설정 패널이 다룰 다른 항목(멤버, 테마, 레이아웃 등)도 함께 묶기 가능
