# Design Spec — canva-publish-polish

task_id: `2026-04-13-canva-publish-polish`

## 1. 선택된 변형

**`mockups/v3` — Author Chip + Relative Time** (사용자 지정)

선정 사유:
- 작성자 존재감 강조 — 학급 참여감·귀속을 시각적으로 명확히 표현
- 이름이 pill chip 으로 시각적으로 분리되어 "누가" 정보 스캔성 최상
- 후속 task(작성자 프로필 열기 등)로의 자연스러운 확장 경로
- 사용자 미적 선호 반영

## 2. 화면 상태별 최종 디자인

### 2.1 ready (일반 카드)
```
│ ...카드 본문/첨부...                │
├───────────────────────────────────┤
│ [ 공서희 ]  3분 전                │
└───────────────────────────────────┘
```
- 이름: tinted chip (pill shape, rounded-full)
- 시간: chip 바깥 muted xs
- 상단 구분선 `1px solid var(--color-border-subtle)`
- **긴 이름 처리**: chip 내부 이름에 `max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` 적용. 한글 10자 초과 시 `…` 로 잘림. title 속성으로 전체 이름 툴팁.

### 2.2 empty (작성자 fallback 전부 null)
- 푸터 **숨김** (null → footer 엘리먼트 생략)

### 2.3 loading
- 해당 없음.

### 2.4 error
- 해당 없음.

### 2.5 success (게시 직후 WS 수신)
- WS 이벤트 수신 → 카드 re-render → 푸터(chip 포함) 즉시 표시
- 애니메이션 없음 (chip 개별 연출 없음, 카드 본체 fade-in 기존 연출만)

### 2.6 CanvaEmbedSlot 위에 있을 때
```
<Card>
  <CardBody />
  <CardAttachments />   ← 내부에 CanvaEmbedSlot (썸네일/라이브)
  <CardAuthorFooter />  ← 항상 최하단, chip 포함
</Card>
```

### 2.7 링크 붙여넣기 카드 fallback 개선 후
- 푸터 동일 — 썸네일 공급원이 oEmbed / Connect API 어디든 영향 없음.

## 3. 사용된 토큰

### 기존 (재사용)
- `var(--font-size-xs)` — 전체 기본 크기 (~12px)
- `var(--color-text)` — chip 내부 이름 텍스트 (tinted bg 위 대비 유지)
- `var(--color-muted)` — 시간 텍스트
- `var(--color-border-subtle)` — 상단 구분선
- `var(--space-1)` — 세로 패딩
- `var(--space-2)` — 가로 패딩, chip 과 시간 사이 gap

### 신규 / 확정된 재사용 (design-system.md 검증 완료)
- **chip 배경**: `var(--color-accent-tinted-bg)` (`#f2f9ff`)
- **chip 텍스트**: `var(--color-accent-tinted-text)` (`#097fe8`)
- **chip radius**: `var(--radius-pill)` (`9999px`)
- **chip padding**: `2px var(--space-2)` (인라인 2px + 기존 space-2)

### 신규 토큰 추가 여부
- **없음**. 모든 토큰 디자인 시스템에서 이미 정의됨 — task-local 폴백 불필요.

## 4. 컴포넌트 목록

**신규:**
- `CardAuthorFooter` — `src/components/cards/CardAuthorFooter.tsx` 예정

**수정:**
- 카드 최상위 렌더 컴포넌트 — 푸터 슬롯 추가

**변경 없음:**
- `CanvaEmbedSlot.tsx`
- `CardAttachments.tsx`

## 5. 유틸 요구

- 상대 시간 포맷터: 기존 util 탐색 → 없으면 phase7 에서 ~30줄 내 추가.

## 6. 인터랙션 주의

chip 은 시각적으로 클릭 가능해 보일 수 있으나 **본 scope 에서는 비상호작용**:
- `pointer-events: none` 유지 (phase4 §3 결정)
- 상위 카드 click/focus 흐름 방해 없음
- 후속 task 에서 프로필 열기 기능 추가 시 `pointer-events: auto` + `<button>` 으로 승격 (본 task 외)

## 7. 접근성 구현 체크리스트 (phase6 review 반영)

1. **의미론적 요소**: 푸터는 `<footer>` 태그 사용. chip 은 `<span>` (비인터랙션).
2. **스크린리더 라벨**: chip 내 이름 앞에 `<span className="sr-only">작성자: </span>` 삽입 → "작성자: 공서희, 3분 전" 순서로 읽힘.
3. **시간 의미론**: `<time dateTime={ISO}>` + `title={absolute}` — 스크린리더/번역 도구가 절대 시간 파싱.
4. **명도 대비**: chip `--color-accent-tinted-text (#097fe8)` vs `--color-accent-tinted-bg (#f2f9ff)` 대비 확인 (WCAG AA 4.5:1 목표 — phase7 에서 실측).
5. **focus 비간섭**: 푸터 및 chip 은 `tabindex` 미설정 → Tab 순서에 포함되지 않음. 카드 focus 흐름 유지.
6. **forced-colors (Windows 고대비)**: `@media (forced-colors: active)` 에서 chip border 를 `1px solid CanvasText` 로 정의해 시스템 색으로 대체.
7. **pointer-events 비활성**: `.card-author-chip { pointer-events: none }` — 상위 카드 클릭 영역 간섭 없음.
