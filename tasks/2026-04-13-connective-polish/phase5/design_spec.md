# Design Spec — connective-polish (phase 4-6 compressed)

> Solo project + simple UX → shotgun 생략, 결정된 변형 1개만 기록. Phase 4/6 내용 인라인화.

## Subscope C — 3-way Login Hub (최다 시각 변경)

### 레이아웃
- 단일 중앙 컬럼 (기존 `.login-card`)
- 타이틀: "어떤 역할로 들어가시나요?"
- 3 카드 가로 그리드 (모바일 세로 스택) — `grid-template-columns: repeat(3, 1fr)` @ md+, stack @ sm
- 각 카드: emoji (48px) + title (18px/600) + desc (14px/muted) + primary button
- 하단 "개발 모드 목 로그인 힌트" 기존 유지

### 카드 3개 콘텐츠

| 역할 | 이모지 | 제목 | 설명 | CTA 타겟 |
|---|---|---|---|---|
| 교사 | 👨‍🏫 | 교사 | 학급과 보드를 관리해요 | `signIn("google", {redirectTo: "/"})` |
| 학생 | 👨‍🎓 | 학생 | QR/코드로 학급에 참여해요 | `router.push("/student/login")` |
| 학부모 | 👨‍👩‍👧 | 학부모 | 초대 코드로 자녀 작품을 봐요 | `router.push("/parent/join")` |

### 토큰 매핑
- 카드 배경: `var(--color-surface)`
- 카드 보더: `1px solid var(--color-border)`, hover: `var(--color-border-hover)`
- 카드 radius: `var(--radius-card)`
- 카드 shadow: `var(--shadow-card)`, hover `var(--shadow-card-hover)`
- CTA 버튼: `background: var(--color-accent)`, `color: #fff`, `radius: var(--radius-btn)`
- 설명 텍스트: `var(--color-text-muted)`

## Subscope D — 네비게이션

### D-1. AuthHeader 설정 드롭다운
- 기존 "로그아웃" 옆에 "⚙" 아이콘 버튼 추가
- `<details>` 기반 네이티브 드롭다운 (JS 최소)
- 항목:
  1. 🔑 외부 API 토큰 → `/(teacher)/settings/external-tokens`
  2. 🎨 Canva 앱 연결 → `/docs/canva-setup` (신규 정적 MDX-like 페이지)
  3. 📘 디자인 시스템 링크 제외 (내부 문서, out)

### D-2. ClassroomDetail 학부모 관리 섹션 추가
- 전체 탭 재구성 대신 **기존 레이아웃 하단에 "학부모 관리" 섹션 추가** (최소 변경)
- "학급 보드" 섹션 다음 `<ParentManagementTab classroomId={classroom.id} />` 렌더
- 시각적으로 섹션 간 구분: `--color-border` top 라인

### D-3. Board Settings Panel 아카이브 링크
- 파일 탐색 필요 (`BoardSettingsPanel.tsx` 실존 확인) — 없으면 settings dropdown이 존재하는 파일에 추가
- "아카이브 보기" 링크 → `/board/[id]/archive`

## Subscope E — 디자인 토큰 재적용

### 치환 매핑 (확정)

| 원본 | 교체 | 사유 |
|---|---|---|
| `#dc3545` (CanvaFolderModal) | `var(--color-danger)` | 경고/삭제 맥락 |
| `#e21b3c` (QuizPlay) | `var(--color-danger)` | 틀림 피드백 |
| `#dc2626` (fallback in ParentManagementTab) | fallback 제거 후 `var(--color-danger)` 단독 | 토큰 보장 |
| `#e53e3e` (fallback in ClassroomDetail) | fallback 제거 | 토큰 보장 |
| `#6b7280` (fallback) | fallback 제거 후 `var(--color-text-muted)` | 토큰 보장 |
| `card.color` 데이터 (BreakoutBoard) | **유지** (user data) | 사용자 지정 색, 토큰 아님 |

### 대상 파일 (우선순위)
- P0: `CanvaFolderModal.tsx`, `QuizPlay.tsx` (확정된 hardcoded hex)
- P1: `ParentManagementTab.tsx`, `ClassroomDetail.tsx`, `external-tokens/page.tsx` (fallback 제거)
- P2: `BreakoutBoard.tsx`, `CreateBreakoutBoardModal.tsx`, `BreakoutAssignmentManager.tsx`, `archive/page.tsx` (grep 후 발견 시 치환)

## Subscope B — Canva 앱 (별도 repo)

시각 변경 최소, 로직만:

```tsx
// aura-canva-app/src/intents/content_publisher/setting_ui.tsx
import { requestOpenExternalUrl } from "@canva/platform";

async function openAuraLogin() {
  const { status } = await requestOpenExternalUrl({
    url: "https://aura-board-app.vercel.app/student/login?return=canva",
  });
  if (status === "completed") {
    // 배너 재fetch (기존 로직)
    await refetchWhoami();
  }
  // "aborted" 시 조용히 유지
}
```

## 디자인 리뷰 (phase6 압축)
- A11y: 카드는 `<button type="button">` 또는 `<a>` (시맨틱), aria-label 부여
- 대비: accent on surface ≥ 4.5:1 (`docs/design-system.md` 기준 만족)
- 모션: 카드 hover `transition: box-shadow 150ms, border-color 150ms`
- 모바일: 3-column → 1-column @ max-width 640px

## 검증 게이트 체크 (phase 4-6)
- 레이아웃/토큰 명시 ✅
- 접근성 고려 ✅
- 모바일 반응형 ✅
- 변형 1개만 기록 (rejected 없음) ✅
