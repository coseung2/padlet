# Design Brief — canva-publish-polish

task_id: `2026-04-13-canva-publish-polish`
scope revision: `Reduction` — 신규 UI 표면은 **작성자 푸터 1 컴포넌트** 뿐. 그 외는 기존 CanvaEmbedSlot 재사용이라 디자인 브리프가 푸터에 집중된다.

## 1. 화면/상태 목록

### 1.1 카드 렌더(일반) — `CardAuthorFooter` 삽입

| 상태 | 표시 정보 | 행동/전이 |
|---|---|---|
| **ready (기본)** | 작성자명 1줄 + 상대 시간 ("방금", "3분 전", "어제", 절대 날짜) | 없음(정적) |
| **empty (작성자 없음)** | `externalAuthorName/studentAuthor/author` 모두 null → "알 수 없음" 회색 텍스트 또는 **아예 푸터 숨김** (phase6 결정) | 없음 |
| **loading** | 해당 없음 — 카드 본체가 SSR 된 뒤엔 항상 resolved | — |
| **error** | 해당 없음 — 클라이언트 에러 경로 아님 | — |
| **success** | (게시 직후) WS 업데이트로 푸터가 즉시 표시 | 푸터 fade-in 200ms (재사용 토큰) |

### 1.2 Content Publisher 앱 게시 카드 (CanvaEmbedSlot 내)

| 상태 | 표시 |
|---|---|
| **썸네일 (기본)** | Blob PNG 썸네일 + "썸네일" 배지 + ▶ 아이콘 + 푸터(작성자명) |
| **라이브** | Canva iframe + "라이브" 배지 + 푸터 |
| **iframe 실패** | 기존 링크 프리뷰 폴백 + 푸터 |
| **eviction** | LRU 축출 시 "썸네일로 돌아감" toast (기존) + 푸터 |

→ CanvaEmbedSlot 자체는 건드리지 않고 **카드 최상위 렌더의 푸터 슬롯**에서 처리.

### 1.3 링크 붙여넣기 카드 fallback 개선 (비주얼 변경 없음)

- Connect API fallback 성공 → 썸네일 표시 (기존 링크 프리뷰 UI 그대로).
- Connect API fallback 실패 → 텍스트 링크 프리뷰 (현재 동작 유지).

## 2. 정보 계층

카드 내 시선 흐름(위→아래):

1. **카드 제목/본문** (최우선 — 기존)
2. **첨부(이미지/임베드/링크)** (중간 — 기존)
3. **작성자 + 시간** (보조 — 신규 푸터)

원칙: 푸터는 **반드시 보조**. 카드 본체 시선을 가리지 않는다. CanvaEmbedSlot 의 썸네일/라이브 위에 겹치지 않고 **하단 별도 행**.

## 3. 인터랙션 명세

| 행동 | 반응 |
|---|---|
| 카드 호버(데스크톱) | 기존 카드 하이라이트 유지. 푸터 변화 없음. |
| 시간 텍스트 호버 | `title` 속성으로 절대 시간 툴팁 (기존 HTML `<time>` 방식) |
| 카드 탭(터치) | 기존 선택/모달 동작 유지. 푸터는 탭 영역 제외. |
| 푸터 클릭 | **아무 동작 없음**. 작성자 프로필은 본 task out — pointer-events: none 으로 상위 카드 click 에 방해되지 않게. |
| WS 업데이트 수신 | 푸터 내용 자동 refresh. 애니메이션 없음(단순 re-render). |
| 키보드 focus | 푸터는 non-interactive → focusable 아님. 카드 자체 focus 유지. |

마이크로 인터랙션: 없음. 푸터는 정적 표시.

## 4. 접근성 요구 (≥3)

1. **스크린리더 라벨**: 푸터는 `<footer>` 또는 `role="contentinfo"` 의미론적 요소. 작성자명 앞에 sr-only 텍스트 "작성자: " 삽입 → "작성자: 공서희, 3분 전" 읽힘.
2. **명도 대비**: `--color-muted` 토큰 사용. 본문 대비 AA (4.5:1) 이상 유지. 작성자명 text-xs(~12px) 라 WCAG 2.2 large-text 예외 미적용 → 반드시 4.5:1.
3. **시간 의미론**: `<time dateTime="2026-04-13T22:30:00+09:00">3분 전</time>` — 스크린리더/번역 도구가 절대 시간 파싱 가능.
4. **포커스 경로 비간섭**: 푸터는 focusable 아님 → Tab 순서에 끼지 않아 기존 카드 focus flow 유지.
5. **시각 대비 모드(Windows 고대비)**: `forced-colors: active` 에서 푸터 border 제거되지 않도록 `border-color: currentColor` 관례 따름.

## 5. 디자인 시스템 확장 여부

### 기존 토큰으로 해결 가능
- 타이포: `text-xs` 또는 design-system.md §2 의 "caption" 계열 토큰 재사용.
- 색: `--color-muted` / `--color-text-secondary` 재사용.
- 간격: `--space-1` / `--space-2` 재사용.
- 시간 포맷: 기존 relative time util 이 있다면 재사용, 없으면 phase7 에서 30줄 내로 추가.

### 신규 추가 후보
- **없음 권장**. 신규 토큰/컴포넌트 추가는 본 scope 외. 기존 토큰 조합만으로 푸터 완성.

### 컴포넌트 승격
- `CardAuthorFooter` 는 card 전용 — shared 컴포넌트로 승격하지 않음. `src/components/cards/` (또는 기존 card 컴포넌트 위치) 내부.

### 분리 구현 가능성
- 푸터는 Canva 관련 작업과 **완전 분리 가능** — phase7 coder 가 두 commit 으로 분리(A: footer, B: canva publish polish) 권장.
