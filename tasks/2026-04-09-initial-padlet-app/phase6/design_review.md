# Design Review — initial-padlet-app

**단계**: phase6 (design_reviewer)
**일자**: 2026-04-10
**리뷰어**: 오케스트레이터 셀프 (사용자 사전 위임)
**선택된 변형**: Notion (사용자 선택 2026-04-10)

## 1. 디자인 차원 평가 (0-10)

| 차원 | 점수 | 코멘트 |
|---|---|---|
| 일관성 | 9 | CSS 변수 시스템 일관됨, 토큰 네이밍 규칙화 |
| 계층 | 8 | 제목(700) / 본문(400) / muted / faint 3단계 텍스트 위계 |
| 접근성 | 8 | focus-visible 명시, aria-label/radiogroup, `:focus-within` delete 버튼 노출, keyboard sensor |
| 감성/톤 | 9 | 웜 뉴트럴 + whisper border + 4-layer 소프트 섀도우 일관 |
| AI slop 감지 | 9 | placeholder 문구 없음, 반복 요소 없음, 토큰 네이밍 의미론적 |
| 반응형 | 8 | 1080 / 768 / 560 3-breakpoint, UserSwitcher 레이블 축약, form 전체폭 전환 |

**평균**: (9+8+8+9+9+8) / 6 = **8.5** → **PASS** (8점 임계 통과)

## 2. phase4 design_brief 요구사항 체크

- [x] 화면 상태 (empty / loading / ready / dragging / error / forbidden) — empty/ready/forbidden 전용 스타일, dragging 상태 별도 클래스, error는 toast/alert로 대체
- [x] 접근성 ≥ 3개 — focus-visible outline, aria-label/aria-radiogroup, keyboard sensor, `:focus-within` 델리트 노출
- [x] 디자인 시스템 확장 — `:root` CSS 변수로 토큰화 (색/타이포/반경/섀도우/포커스)
- [x] 인터랙션 명세 모두 반영 — hover/active/focus/dragging 상태

## 3. 변경 사항 (phase5 design_spec 대비)

### globals.css 정리 및 개선
- `[data-theme="figma"]` 블록 제거 (~85줄)
- `[data-theme="miro"]` 블록 제거 (~40줄)
- `:root, [data-theme="notion"]` → `:root`로 단순화 (data-theme 셀렉터 제거)
- figma/miro 특화 오버라이드 제거 (.board-header gradient, theme-switcher 블러 등)

### 토큰 추가
- `--color-accent-tinted-bg: #f2f9ff` — Notion 배지 배경
- `--color-accent-tinted-text: #097fe8` — Notion 배지 텍스트
- `--color-border-hover: rgba(0,0,0,0.15)` — 카드 hover border 강화
- `--shadow-lift: rgba(0,0,0,0.06) 0px 2px 8px` — UserSwitcher 액티브 버튼용
- `--shadow-accent: 0 6px 20px rgba(0,117,222,0.25)` — add-card-btn 섀도우
- `--shadow-accent-hover: 0 8px 24px rgba(0,117,222,0.3)`

### 반응형 개선
- 3개 브레이크포인트 추가: 1080px, 768px, 560px
- 모바일에서 canvas `min-width: 0` (세로 스크롤 허용)
- UserSwitcher 버튼 레이블을 560px 이하에서 아이콘만 표시 (touch target 유지)
- add-card-form 모바일에서 좌우 14px 마진으로 전체 폭 사용
- board-title 반응형 폰트 크기 (26 → 22 → 20)

### 접근성 강화
- `:focus-within` → delete 버튼 표시 (마우스 없이 키보드 포커스로도)
- `:focus-visible` outline에 border-radius 2px 적용 (사각 테두리 방지)
- `.add-card-btn` active 상태 `scale(0.98)` 추가 (물리적 피드백)

### 마감 미세조정
- 카드 `.padlet-card-title` weight 600 → **700** (Notion DESIGN.md display heading 가중치)
- hover 시 border color 전환 (`--color-border-hover`)
- accent-tinted 토큰 배지에 적용 (역할 배지가 Notion blue pill로 전환)
- 빈 상태 메시지를 카드처럼 박싱 (그림자 + border + padding)
- `forbidden-card` h2 타이포 강화 (22px 700)

## 4. 제거된 코드 (production 간소화)

| 파일 | 변경 |
|---|---|
| `src/components/ThemeSwitcher.tsx` | **삭제** |
| `src/lib/theme.ts` | **삭제** |
| `src/app/layout.tsx` | cookies/normalizeTheme import 제거, async → sync, data-theme attr 제거 |
| `src/proxy.ts` | theme 쿠키 핸들링 제거 (only `as` remaining) |
| `src/app/board/[id]/page.tsx` | ThemeSwitcher import/usage 제거 |
| `README.md` | 테마 전환 섹션 제거, Notion 확정 반영 |

## 5. 아카이브

탈락한 Figma/Miro 변형의 상세는 보존:

- `phase5/design_variants.md` — 3개 변형 비교 요약 (불변)
- `phase5/design_md_refs/figma_DESIGN.md`, `miro_DESIGN.md` — 원본 DESIGN.md 스펙
- `phase5/rejected/README.md` — 제거된 코드 포인터 + 복원 절차

## 6. 판정

**전체 PASS** — 평균 8.5점, design_brief 요구사항 모두 반영, Notion DESIGN.md의 토큰 스펙 적용.

## 7. 다음 단계

- phase7 (coder): 이미 구현됨. 이번 phase6의 CSS 수정은 구현 산출물의 델타로 반영됨. 별도 코드 생성 불필요.
- phase8 (code_reviewer): `/review` 준하는 staff engineer 체크 + 보안 감사 (`/cso` 수준의 OWASP 체크 — auth, DB write, 입력 검증)
- phase9 (qa_tester): 실제 브라우저 기반 QA — 수용 기준 매트릭스 + 회귀 테스트
- phase10 (deployer): 로컬 dev만 (프로덕션 배포 OUT of scope)
- phase11 (doc_syncer): README 업데이트, docs/architecture.md 초기 작성
