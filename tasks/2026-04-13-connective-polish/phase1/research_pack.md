# Phase 1 — Research Pack

## 1. Canva Apps SDK — `requestOpenExternalUrl` (subscope B 핵심)

**Package**: `@canva/platform` (must add to `aura-canva-app` repo)

**Signature**:
```ts
requestOpenExternalUrl(request: { url: string }): Promise<{ status: "completed" | "aborted" }>
```

**Usage (권장 교체)**:
```tsx
import { requestOpenExternalUrl } from "@canva/platform";

async function openAuraLogin() {
  const response = await requestOpenExternalUrl({
    url: "https://aura-board-app.vercel.app/student/login?return=canva",
  });
  if (response.status === "completed") {
    // 사용자가 새 탭에서 로그인 완료 → setting_ui는 /whoami 재호출로 배너 갱신
  }
}
```

**장점 vs `window.open()`**:
- iframe sandbox 제약 우회 (Canva 에디터 샌드박스에서 `window.open()`은 팝업 차단됨)
- 모바일: 브라우저 시트 / 데스크톱: 새 탭 — Canva 측에서 사용자 동의 다이얼로그 제공
- Canva Marketplace 심사 시 `window.open()`은 reject 사유, `requestOpenExternalUrl`은 권장 API

**주의**: 일부 브라우저는 팝업 권한 허용이 선행되어야 함. 실패 시 사용자에게 "로그인 페이지가 열리지 않으면 브라우저 팝업 차단을 풀어주세요" 안내 필요.

## 2. 3-way 로그인 허브 UX 패턴 (subscope C)

### 벤치마크 요약 (외부 관찰 생략 — 메모리 기반)

| 제품 | 패턴 | 시사점 |
|---|---|---|
| Padlet (원본) | 단일 Google OAuth + 공유 링크 별도 진입 | 역할 구분이 URL/초대코드로만 구분, 메인에 선택지 없음 |
| Seesaw | 홈에 3-way CTA (Family · Student · Teacher) | 본 프로젝트가 벤치마킹할 기준 |
| Google Classroom | 로그인 후 Teacher/Student 프로필 선택 | 로그인 전 구분 없음, 우리 모델과 맞지 않음 |
| Kahoot! | 교사 중심 + 학생은 pin 코드 별도 페이지 | 학생/학부모가 랜딩에서 진입 불가 |

### 권장 패턴 (Seesaw식 변형)
- 비로그인 `/` 방문 시 3-way CTA 카드 렌더
- 각 카드: 아이콘 + 역할명 + 1줄 설명 + 1차 CTA 버튼
  - 👨‍🏫 **교사로 계속** → 구글 로그인 (`/login`으로 이동 후 NextAuth 트리거)
  - 👨‍🎓 **학생으로 계속** → `/student/login` (로스터 + 닉네임 선택 폼)
  - 👨‍👩‍👧 **학부모 초대 코드** → `/parent/join` (invite code + 이메일 인증)
- 교사 세션 감지 시 `/`는 기존 대시보드(RSC) 그대로

### 장단점
- 장점: 발견성, 역할별 플로우 명확, 단일 진입점
- 단점: 교사는 이미 로그인된 재방문 케이스에서 1단계 추가로 느낄 수 있음 → 세션 기반 자동 리다이렉트로 해소

## 3. External API 보안 패턴 (subscope A)

### 현재 gap
- `/api/external/boards` GET: **PAT만 검증**, 같은 PAT 소유자(교사)의 모든 보드 반환
- Canva 앱에서 PAT는 번들 심기 중이라 **같은 반 학생들이 같은 PAT 공유** → 학생이 다른 학급/담당 교사의 다른 학급 보드까지 볼 수 있음
- `/sections` 동일

### 수정 패턴
```ts
// 새 가드 체이닝
const patOwner = await verifyPat(req);               // 기존
const session = await verifyStudentSession(req);     // 추가 (쿠키)
if (!session) return 401 "student_session_required";
if (session.teacherId !== patOwner.id) return 403;   // PAT와 학생 학급 교사 일치 확인

const boards = await db.boardMember.findMany({
  where: {
    board: {
      classroomId: session.classroomId,              // 학급 필터
    },
    userId: patOwner.id,
  },
});
```
참고: `/api/external/cards` POST는 이미 이 패턴을 씀 (`student 학급 ≠ board 학급이면 403`).

## 4. 네비게이션 연결 패턴 (subscope D)

### 현재 누락 진입점
- 교사 대시보드 헤더 → `/(teacher)/settings/external-tokens` 링크 없음
- 교사 대시보드 헤더 → Canva 앱 설치 안내 없음
- Classroom 상세 → 학부모 초대 관리(`ParentManagementTab`)가 탭 구조에 통합 안 됨
- Breakout 세션 별도 진입점 명확화 필요

### 권장: 대시보드 헤더에 "고급" 메뉴 드롭다운
- Notion 스타일 사이드 패널 사용 가능 (이미 `src/components/ui/SidePanel.tsx` 존재)
- 또는 단순 링크 그룹 (solo project 규모 고려하면 후자 권장)

## 5. 디자인 폴리시 타깃 (subscope E)

### 토큰 위반 의심 파일 (탐색 결과)
- `CanvaFolderModal.tsx` — `color: "#dc3545"` (hex 하드코딩) ← 필수 수정
- `QuizPlay.tsx` — `color: "#e21b3c"` ← 필수 수정
- `BreakoutBoard.tsx` — `card.color` 데이터 기반 배경색은 허용 (사용자 지정), UI chrome만 토큰 강제
- `ParentManagementTab.tsx` — `var(--color-danger, #dc2626)` fallback 패턴 (허용, 단 제거 권장)

### 기준 토큰 세트 (`docs/design-system.md`)
- 배경/표면: `--color-bg`, `--color-surface`, `--color-surface-alt`
- 텍스트: `--color-text`, `--color-text-muted`, `--color-text-faint`
- 강조: `--color-accent`, `--color-accent-tinted-bg`, `--color-accent-tinted-text`
- 경계: `--color-border`, `--color-border-hover`
- 위험: `--color-danger`, `--color-danger-active`
- 반지름: `--radius-card`(12), `--radius-btn`(4), `--radius-pill`
- 그림자: `--shadow-card`, `--shadow-card-hover`, `--shadow-lift`

## 결론 — phase2로 넘어갈 판단 근거
- Canva SDK API 확정 (단일 함수, async)
- 보안 패턴은 기존 `/cards` POST와 동형 재사용
- 3-way CTA 레이아웃 Seesaw 벤치 채택
- 디자인 토큰 위반은 특정 파일로 한정 — 전체 리팩토링 불필요
