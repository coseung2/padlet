# Design Spec — board-settings-panel

## 1. 선택된 변형

`mockups/v3 — minimal-row-with-inline-actions` (ASCII로만 보관, 텍스트 기반 기획).

선정 사유: v1 (카드형 grid) 은 5개 이상 섹션에서 수직 스크롤 부담, v2 (테이블) 는 모바일 태블릿 반응형 열화, v3 (row + inline actions) 가 행 독립성·모바일 적응성 모두 우수. v4 (아코디언) 는 토큰 없음 상태에서 한 번 더 클릭 필요해 탈락.

## 2. 화면 상태별 최종 디자인

### BoardHeader (owner/editor)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← [제목 텍스트(편집가능)] [⚙]   [layout badge]  [user badge]  ... │
└──────────────────────────────────────────────────────────────────────┘
```

- ⚙ 버튼: `.board-settings-trigger`, 투명 배경, hover시 `--surface-hover`, 높이 32px

### BoardSettingsPanel — Breakout tab (ready)

```
┌─ 보드 설정 ────────────────────────── × ─┐
│ [브레이크아웃] [접근권한(준비중)] [Canva(준비중)] [테마(준비중)] │
├──────────────────────────────────────────┤
│ ℹ 각 섹션별 모둠 모드 링크를 관리합니다. │
│                                          │
│ ┌ 1조 토론 ───────────────── 링크 있음 ┐ │
│ │ https://…/s/abc?token=…   [복사][재발급]│
│ └──────────────────────────────────────┘ │
│ ┌ 2조 토론 ───────────────── 링크 없음 ┐ │
│ │ [공유 링크 생성]                        │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

### Breakout tab (empty — non-columns layout)

```
┌─ 보드 설정 ───────────────── × ─┐
│ [탭들]                           │
├─────────────────────────────────┤
│        🗂                         │
│                                 │
│ 이 레이아웃에는 섹션이 없어요.  │
│ columns 레이아웃에서만          │
│ 브레이크아웃 링크를 만들 수 있어요.│
└─────────────────────────────────┘
```

### Breakout tab (empty — columns, 0 sections)

```
│ 섹션을 먼저 추가해 주세요.     │
│ 보드의 '+ 섹션 추가' 버튼을    │
│ 눌러 새 섹션을 만들 수 있어요. │
```

### Future tab (placeholder)

```
│ 🚧                               │
│ 준비 중이에요.                  │
│ 곧 이곳에서 {탭 주제}를         │
│ 관리할 수 있어요.              │
```

### Section header ⋯ (consolidated)

```
┌ 섹션 타이틀 (3) [⋯] ─┐
                     ├─ ✏ 이름 변경
                     ├─ 📁 Canva에서 가져오기
                     ├─ 📄 PDF 내보내기       ← Canva 링크 있을 때
                     ├─ 📂 Canva 폴더로 정리  ← Canva 링크 있을 때
                     └─ 🗑 섹션 삭제 (danger)
```

### SectionActionsPanel (rename/delete 2탭)

```
┌─ 섹션 옵션 ────────────── × ─┐
│ [이름 변경] [삭제]           │
├─────────────────────────────┤
│ (탭 내용 기존 유지)         │
```

## 3. 사용된 토큰

기존: `--surface-*`, `--text-*`, `--space-*`, `--radius-sm`, `--shadow-sm`. 새 토큰 없음.

## 4. 컴포넌트 목록

### 신규
- `BoardSettingsLauncher` (client) — 버튼 + dynamic panel 렌더
- `BoardSettingsPanel` (client) — 탭 컨테이너 + breakout body
- `BreakoutSectionRow` (client, 내부 helper) — 한 섹션 row, token fetch 포함

### 수정
- `ColumnsBoard` — ContextMenu 통합, 별도 ⋯ 제거
- `SectionActionsPanel` — share 탭 제거
- `SectionShareClient` — id 네임스페이스화
- `BoardHeader` (page.tsx 내부) — ⚙ launcher 삽입
- `/s/[sectionId]/share/page.tsx` — 배너 문구

### CSS
- `.board-settings-trigger`, `.board-settings-row`, `.board-settings-row-title`, `.board-settings-empty`, `.board-settings-placeholder` → `src/styles/side-panel.css` append

## 5. tokens_patch 유무

없음 (tokens_patch.json 생성 생략).
