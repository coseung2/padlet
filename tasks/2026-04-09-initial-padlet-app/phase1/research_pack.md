# Research Pack — initial-padlet-app

## 1. 레퍼런스 서비스 관찰

Padlet.com의 핵심 UX 관찰 (기존 지식 + DESIGN.md 참고):

- **Wall 레이아웃**: 카드가 자유 배치. 드래그해서 아무 위치로 이동 가능
- **카드 구조**: 제목, 본문, 첨부(이미지/링크/파일), 작성자, 리액션
- **실시간 협업**: 다른 사용자가 카드를 추가/이동하면 실시간 반영 (이번 MVP에서는 out of scope)
- **공유 모델**: 보드 오너 → 에디터 → 뷰어 계층 (전형적인 RBAC)

## 2. 디자인 시스템 레퍼런스 (`design_md_refs/`)

VoltAgent/awesome-design-md 의 DESIGN.md 3개를 수집. 각각의 핵심 톤:

### Figma (figma_DESIGN.md, 220줄)
- **정체성**: 흑백 인터페이스 + 비비드 그라데이션 히어로
- **타입**: figmaSans 가변 폰트, 독특한 weight 스톱 (320, 330, 340, 450, 480, 540, 700)
- **지오메트리**: Pill (50px radius) + Circle (50%)
- **포커스**: dashed 2px outline (시그니처)
- **카드 클론 적용**: 카드는 순흑백, 보드 배경에 그라데이션 액센트, pill 버튼, dashed focus
- **강점**: 세련되고 도구적, 디자이너에게 친숙
- **약점**: 컬러 정보 전달 수단이 제약됨

### Miro (miro_DESIGN.md, 110줄)
- **정체성**: 파스텔 화이트보드 + Blue 450 (#5b76fe) 포커스
- **타입**: Roobert PRO Medium + Noto Sans body
- **팔레트**: 코랄/로즈/틸/오렌지/옐로우/모스 (light/dark 쌍)
- **반경**: 8-50px (카드 12-24px 권장)
- **카드 클론 적용**: 카드 배경을 파스텔로 다양화 (각 카드가 다른 색), 8-16px radius, Blue 450 버튼
- **강점**: 친근하고 구조적이며 콜라보 제품과 잘 맞음
- **약점**: 파스텔 과하면 유아적 인상

### Notion (notion_DESIGN.md, 309줄)
- **정체성**: 따뜻한 미니멀, whisper border (1px rgba(0,0,0,0.1)), 멀티 레이어 소프트 섀도우
- **타입**: NotionInter, 네거티브 letter-spacing 심함 (-2.125px at 64px)
- **팔레트**: 웜 뉴트럴 (#f6f5f4, #31302e, #615d59), Notion Blue (#0075de) 액센트
- **반경**: 4-16px
- **카드 클론 적용**: 흰/웜 화이트 카드, whisper border, 미니멀 섀도우, serif 힌트 헤딩
- **강점**: 장시간 사용해도 피로가 적고 텍스트 중심 사용에 강함
- **약점**: 시각적 차별화가 약할 수 있음

## 3. 3개 테마 전략

동일 Next.js 앱 위에 CSS 변수 기반 테마 3개. URL 쿼리 `?theme=figma|miro|notion`으로 전환. 한 테마 고르면 나머지는 삭제.

각 테마가 바꾸는 것:
- `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`
- `--radius-card`, `--radius-btn`
- `--font-display`, `--font-body`
- `--shadow-card`
- `--border-card`

백엔드, 데이터 모델, API는 공통.

## 4. UX 패턴 채택 (→ `ux_patterns.json`)

- `wall-layout` — 자유 배치 카드 (Padlet 기본)
- `card-grid-fallback` — 드래그 없이도 자연스러운 그리드 (초기 상태)
- `optimistic-drag` — 드래그 중 클라이언트 즉시 반영, 드롭 시점 서버 저장
- `url-theme-switcher` — 쿼리 파라미터로 런타임 테마 교체
- `rbac-middleware` — 서버 액션/API에서 요청자 권한 체크

## 5. 위험 요소

- dnd-kit + Next.js App Router 조합의 hydration 이슈 — client component 경계 주의
- SQLite의 동시성 제약 — 솔로 dev 환경이므로 무시
- 3개 테마의 시각적 차이가 충분히 느껴질지 — DESIGN.md를 직역하지 말고 카드 컴포넌트의 색/모양/타이포까지 차별화
