# Design Variants — initial-padlet-app

**phase5 산출물**: 3개 테마 변형 + 실제 구동 MVP.

"Mockups"가 정적 이미지가 아니라 **실제로 돌아가는 Next.js 앱**에 CSS 변수 기반 3개 테마로 구현됨. 사용자는 한 번 앱을 띄우고 `?theme=figma|miro|notion` 으로 세 변형을 바로 비교할 수 있다.

## 실행 방법

프로젝트 루트에서:

```bash
npm install
npm run db:push
npm run seed
npm run dev
```

브라우저:
- `http://localhost:3000` → `/board/demo` 리디렉트
- `?theme=figma` / `?theme=miro` / `?theme=notion` 로 테마 전환
- `?as=owner` / `?as=editor` / `?as=viewer` 로 RBAC 역할 전환 (mock auth)

## 3개 변형 비교

### Variant 1 — Figma (◼️)
**정체성**: 흑백 인터페이스 + 비비드 그라데이션 헤더, pill 지오메트리, dashed focus outline

| 토큰 | 값 |
|---|---|
| bg | #ffffff |
| text | #000000 |
| accent | #000000 (모노 + 그라데이션으로 컬러) |
| radius-card | 8px |
| radius-btn | 50px (pill) |
| shadow-card | none (평면) |
| border-card | 2px solid #000000 |
| focus | **2px dashed #000000** (시그니처) |
| header | `linear-gradient(135deg, #00e6aa → #ffeb00 → #ff3ea5 → #8a2be2 → #00c6ff)` |

**느낌**: 도구적, 정밀한, 디자이너 감성. 카드는 굵은 검정 테두리. 헤더 그라데이션으로 시각적 임팩트.

**강점**: 독보적, 세련, 집중력 높음
**약점**: 단색 카드의 컬러 코딩이 어려움

---

### Variant 2 — Miro (🎨)
**정체성**: 화이트 캔버스 + Blue 450 액센트 + 파스텔 카드, ring 섀도우

| 토큰 | 값 |
|---|---|
| bg | #ffffff |
| text | #1c1c1e |
| accent | #5b76fe (Blue 450) |
| radius-card | 14px |
| radius-btn | 8px |
| shadow-card | `rgb(224,226,232) 0 0 0 1px, rgba(16,24,40,0.04) 0 2px 6px` (ring) |
| border-card | none |
| focus | 2px solid #5b76fe |

**느낌**: 친근하고 구조적, 콜라보 제품다운. 카드별로 파스텔 색상(시드에 랜덤 힌트), 호버 시 블루 ring.

**강점**: 협업 도구 느낌 강함, 컬러 구분 자연스러움
**약점**: 파스텔이 너무 많으면 산만해질 수 있음

---

### Variant 3 — Notion (📓, 기본값)
**정체성**: 웜 뉴트럴 배경, whisper border, 멀티 레이어 소프트 섀도우

| 토큰 | 값 |
|---|---|
| bg | #f6f5f4 (웜 화이트) |
| text | rgba(0,0,0,0.95) |
| accent | #0075de (Notion Blue) |
| radius-card | 12px |
| radius-btn | 4px |
| shadow-card | 4-layer (max opacity 0.04) |
| border-card | 1px solid rgba(0,0,0,0.1) (whisper) |
| focus | 2px solid #097fe8 |

**느낌**: 차분, 장시간 사용에 적합, 텍스트 중심. 섀도우가 부드러워서 카드가 "종이" 같음.

**강점**: 피로도 낮음, 독서/메모 같은 텍스트 작업에 강함
**약점**: 시각적 임팩트가 상대적으로 약함

---

## 차별 4축 (테마별)

| 축 | Figma | Miro | Notion |
|---|---|---|---|
| 배경 기조 | pure white | pure white | warm white |
| 카드 테두리 | 굵은 검정 2px | none (ring shadow) | 1px whisper |
| 카드 섀도우 | none | ring + subtle | 4-layer soft |
| 버튼 radius | 50px pill | 8px | 4px |
| Focus 스타일 | dashed black | solid blue | solid blue |
| 헤더 | 그라데이션 | 흰 + 보더 | 흰 + whisper |
| 타입 tracking | -1.72px (극단) | -0.72px | -0.5px |

## 사용자 선택 요청

세 테마 중 하나를 골라주세요. 선택 후:
1. 다른 두 테마의 CSS 블록 제거
2. `ThemeSwitcher` 컴포넌트 제거 (또는 보존 여부 결정)
3. 고른 테마를 프로덕션 기본값으로 잠금
4. phase6 (design_review) 진행 — 고른 테마 내부에서 토큰 미세조정

### 의사결정 기준 힌트

- **"도구처럼 느껴지고 시각 임팩트 중요"** → Figma
- **"협업 제품 느낌 + 파스텔로 카드 구분"** → Miro
- **"장시간 읽고 쓰기 좋고 차분"** → Notion

## 레퍼런스

- `tasks/2026-04-09-initial-padlet-app/phase1/design_md_refs/figma_DESIGN.md`
- `tasks/2026-04-09-initial-padlet-app/phase1/design_md_refs/miro_DESIGN.md`
- `tasks/2026-04-09-initial-padlet-app/phase1/design_md_refs/notion_DESIGN.md`

## 감사 이력

- 3개 변형은 `src/app/globals.css` 내 `[data-theme="…"]` 셀렉터로 병렬 존재
- 탈락 테마 블록은 이 문서 작성 시점에 **삭제하지 않음** — `phase5/rejected/` 아카이브 대신 globals.css 단일 파일로 보존 (솔로 프로젝트 간소화)
- 선택 후 phase6에서 제거 + git diff로 추적
