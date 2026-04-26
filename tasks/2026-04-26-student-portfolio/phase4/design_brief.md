# Design Brief — student-portfolio

## 1. 화면/상태 목록

### 화면 A: 학생 포트폴리오 페이지 `/student/portfolio`

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty (학급 학생 0명) | "학급에 등록된 학생이 없어요" + 교사면 학급 추가 안내 링크 | (없음) |
| loading | 좌측 리스트 skeleton + 우측 그리드 skeleton (3×3) | (대기) |
| ready (본인) | 좌측: 학급 학생 출석번호 ASC 리스트, 본인 항목 강조 / 우측: 본인 카드 그리드 | 다른 학생 클릭 → 우측 갱신, 카드 클릭 → 보드 deep-link, 카드 우클릭 → ContextMenu |
| ready (타인 선택) | 좌측: 그대로 / 우측: 타인 카드 그리드 (자랑해요 토글 메뉴 X) | 카드 클릭 → 보드 deep-link |
| ready (학생 카드 0개) | 우측 빈 상태 + (본인이면) "보드에서 카드 만들기" CTA | 본인이면 CTA → /classroom 진입 |
| error (403) | "이 학급에 접근 권한이 없어요" + 메인 진입 링크 | (없음) |
| error (네트워크) | "잠시 후 다시 시도해 주세요" + 재시도 버튼 | 재시도 |

### 화면 B: 학생 dashboard `/student` 상단 자랑해요 highlight

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| empty (학급 자랑해요 0개) | 섹션 자체 미노출 (조용한 fallback) | — |
| ready | 가로 carousel, 기본 6장 노출 (스크롤 더보기), 카드 chip = 썸네일+제목+학생이름 | chip 클릭 → 포트폴리오 페이지의 그 학생 보기 / 우측 화살표로 carousel 이동 |
| loading | shimmer chip 3개 | — |

### 화면 C: 자랑해요 한도 모달

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| ready | "자랑해요는 3개까지예요" + 현재 3개 카드 미니 프리뷰 + "어느 걸 내릴까요?" | 1개 선택 → 확인 / 취소 |

### 화면 D: 학부모 포트폴리오 `/parent/portfolio`

| 상태 | 표시 정보 | 가능 행동 |
|---|---|---|
| ready (자녀 1명) | 헤더에 자녀 이름 / 본문: 자녀 카드 + 학급 자랑해요 통합 그리드 | 카드 클릭 → 보드 deep-link |
| ready (자녀 ≥2명) | 좌측 자녀 셀렉터 (이름·학급) / 우측 통합 그리드 | 자녀 토글 → 우측 갱신 |
| empty | 자녀 카드도 자랑해요도 0개 | 안내 문구 |

## 2. 정보 계층

### 포트폴리오 페이지 (화면 A)

우선순위:
1. 카드 콘텐츠 (썸네일/이미지/링크 미리보기) — 시각적 주목
2. 카드 제목 + 본문 발췌
3. 출처 라벨 (`{보드}·{칼럼}`) — 메타 작은 글씨
4. 자랑해요 🌟 배지 — 코너 작게

시선 흐름: 좌측 학생 리스트 (탐색 entry) → 우측 카드 그리드 (소비) → 카드 클릭 (deep-link 이동) 또는 우클릭 (자랑해요 토글)

### dashboard highlight (화면 B)

우선순위:
1. 카드 썸네일/색상 (시각 hook)
2. 학생 이름 (누구의 자랑인지)
3. 카드 제목
출처 라벨은 chip 안에 생략 — 클릭 시 포트폴리오 페이지에서 풀 메타 노출.

## 3. 인터랙션 명세

### 좌측 학생 리스트
- hover: 행 배경 `--color-surface-alt`
- click: 우측 그리드 갱신 (페이지 이동 X — SPA-like)
- 본인 항목: 좌측 인디케이터 바 + bold (🟢 점)
- 작품 0인 학생: 이름 옆 회색 `0` 뱃지

### 카드 우클릭 ContextMenu (본인 카드만)
- 메뉴 항목 1: "🌟 자랑해요에 올리기" (이미 등록 시 "🌟 자랑해요 내리기")
- 메뉴 항목 2: "원본 보드로 이동"
- 키보드 접근: 카드 focus 시 Enter = deep-link, Shift+Enter = 메뉴 열림 (또는 키보드 메뉴 트리거)

### 자랑해요 토글
- 낙관적 UI: 클릭 즉시 🌟 배지 toggle
- 409 응답: ShowcaseLimitModal 노출, 사용자 1개 선택 → DELETE 후 재토글
- 200ms 디바운스 (연타 방지)

### highlight strip carousel
- 가로 scroll-snap (CSS scroll-snap-type)
- 좌우 화살표 버튼 (≥768px), 모바일은 swipe만
- 6장 이상이면 "더보기" 토글 → 그리드 펼침

### 한도 모달
- backdrop click = 취소
- ESC = 취소
- focus trap

## 4. 접근성 요구

1. **키보드 only 동작**:
   - 좌측 학생 리스트: Tab으로 진입, ↑/↓로 학생 순회, Enter로 선택
   - 우측 카드 그리드: Tab/Arrow로 카드 순회, Enter = deep-link, Shift+F10 또는 contextmenu 키 = ContextMenu 열림
   - 한도 모달: focus trap + ESC 닫기
2. **스크린리더 라벨**:
   - 학생 항목: `<button aria-label="홍길동, 출석번호 14, 작품 12개. 클릭하면 작품 모음 보기">`
   - 카드 자랑해요 배지: `<span aria-label="자랑해요 등록됨" role="img">🌟</span>`
   - highlight strip: `<section aria-label="우리 학급 자랑해요">`
3. **명도 대비**:
   - 출처 라벨: `--color-text-muted` (#615d59) on `--color-surface` (#fff) — WCAG AA 통과
   - 자랑해요 배지 amber: 흰 outline 유지 또는 배경 비치 시 `--color-text` 라벨로 구분
   - 본인 강조 인디케이터: 색만으로 정보 전달 X — 굵기/아이콘 병행
4. **포커스 가시성**:
   - 학생 리스트 항목 focus: outline `2px solid var(--color-accent-tinted-text)`
   - 카드 focus: outline + slight scale (transform 1.01)
5. **모바일 터치 타겟**: 학생 리스트 행 ≥44px 높이, 자랑해요 토글 메뉴 항목 ≥44px

## 5. 디자인 시스템 확장

### 기존 토큰으로 가능

- 페이지 배경: `--color-bg`
- 카드: `--color-surface` + `--color-border`
- 출처 라벨: `--color-text-muted`
- 본인 강조: `--color-accent`
- ContextMenu: 기존 `<ContextMenu />` 컴포넌트 재사용

### 신규 토큰 (1개)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-showcase` | `#f5a623` (alias of `--color-vibe-rating`) | 🌟 자랑해요 배지·하이라이트 |

> alias 사유: amber 색상은 itch.io/Steam 별점 관례라 "주목·하이라이트" 시맨틱 일관. 별도 hex 추가 없음.

### 신규 컴포넌트

| 컴포넌트 | 신규/기존 |
|---|---|
| `<PortfolioPage />` | 신규 |
| `<PortfolioRoster />` | 신규 |
| `<PortfolioStudentView />` | 신규 |
| `<PortfolioCardItem />` | 신규 (CardBody 래핑 + 출처 라벨 + 🌟 배지) |
| `<ShowcaseLimitModal />` | 신규 |
| `<ShowcaseHighlightStrip />` | 신규 |
| `<ShowcaseCardChip />` | 신규 |
| `<ParentChildSelector />` | 신규 |
| `<CardBody />` | 기존 재사용 |
| `<ContextMenu />` | 기존 재사용 |
