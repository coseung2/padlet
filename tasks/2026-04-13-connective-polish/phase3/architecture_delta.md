# Architecture Delta — connective-polish

## 1. Subscope A — External API student_session 가드

### 파일
- `src/app/api/external/boards/route.ts`
- `src/app/api/external/boards/[id]/sections/route.ts`

### 패턴 (기존 `/cards` POST 재사용)

`/cards` POST 에서 이미 사용 중인 패턴을 복제 (동적 import → HMR 친화):

```ts
const { getCurrentStudent } = await import("@/lib/student-auth");
const student = await getCurrentStudent();
if (!student) {
  return externalErrorResponse(
    "student_session_required",
    "Aura 학생 로그인이 필요해요."
  );
}
```

### GET /api/external/boards 추가 로직
PAT 검증 후, student_session 필수 + `session.classroomId` 기반 필터:

```ts
// 기존 memberships 쿼리의 where 절에 board.classroomId 추가
const memberships = await db.boardMember.findMany({
  where: {
    userId: user.id,
    role: { in: ["owner", "editor"] },
    board: { classroomId: student.classroomId },  // 신규
    ...(scopeBoardIds.length > 0 ? { boardId: { in: scopeBoardIds } } : {}),
  },
  ...
});
```

### GET /boards/[id]/sections 추가 로직
`board.classroomId !== student.classroomId` → 403 `forbidden` (메시지 "학급이 달라요").
`requirePermission` 호출은 유지 (PAT 오너 가드).

### 위치 순서
1. PAT verify
2. Scope check
3. Tier
4. Rate limit
5. **student session** ← 신규 삽입
6. board fetch + RBAC + classroom match ← classroom match 신규
7. DB 쿼리

## 2. Subscope B — Canva 앱 requestOpenExternalUrl

**대상 repo**: `C:\Users\심보승\Desktop\Obsidian Vault\aura-canva-app` (padlet 밖)

### 변경
1. `package.json`: `@canva/platform` 의존성 확인/추가
2. `src/intents/content_publisher/setting_ui.tsx`:
   - `openAuraLogin()` 내부의 `window.open(url, "_blank")` → `requestOpenExternalUrl({ url })`
   - `await` 결과의 `response.status` 분기:
     - `"completed"`: `/api/external/whoami` 재fetch로 배너 갱신
     - `"aborted"`: 기존 배너 유지 (no-op) + 콘솔 로그

### Import
```ts
import { requestOpenExternalUrl } from "@canva/platform";
```

### 주의
- `aura-canva-app`은 별도 git repo/배포 파이프라인 → padlet의 `main` 머지와 독립
- 배포: Canva Developer Portal에 JS 번들 업로드 (memory 참조)

## 3. Subscope C — 3-way 로그인 허브

### 변경 전략
현재 비로그인 시 `HomePage`가 `getCurrentUser()` throw를 catch해 `/login`으로 redirect 한다. 이를 **`/login` 페이지 자체를 3-way hub로 리디자인**하는 방향으로 전환. 이유: 기존 리다이렉트 흐름 보존하면서 `/login` URL 하나만 변경하면 됨. `/` 는 교사 대시보드 로직 그대로.

### 파일
- `src/app/login/page.tsx` — 대대적 리디자인

### 구조 (클라이언트 컴포넌트 유지)
```tsx
<main className="login-hub">
  <h1>어떤 역할로 들어가시나요?</h1>
  <div className="login-hub-grid">
    <RoleCard icon="👨‍🏫" title="교사" desc="…" onClick={() => signIn("google", { redirectTo: "/" })} />
    <RoleCard icon="👨‍🎓" title="학생" desc="…" href="/student/login" />
    <RoleCard icon="👨‍👩‍👧" title="학부모" desc="…" href="/parent/join" />
  </div>
</main>
```

교사 Google 버튼은 기존 `signIn` 로직 재사용. `RoleCard` 컴포넌트는 `src/components/auth/RoleCard.tsx` 신설 (토큰 준수).

### 스타일
- 신규 CSS: `src/styles/login-hub.css` 토큰만 사용
- 또는 기존 `src/app/login/login.css`에 추가 (후자 권장)

## 4. Subscope D — 네비게이션 연결

### 4-1. 교사 대시보드 헤더
**파일**: `src/components/AuthHeader.tsx` (또는 `Dashboard.tsx`)
- "설정" 드롭다운 UI 추가 (`<details><summary>` 또는 간단 버튼 + 팝오버)
- 항목:
  - 외부 토큰 → `/(teacher)/settings/external-tokens`
  - Canva 앱 연결 안내 → `/docs/canva-setup` (신규 정적 페이지, 간단 README MDX 스타일) — 시간 제약 시 외부 링크로 대체

### 4-2. Classroom 상세 페이지 탭
**파일**: `src/app/classroom/[id]/page.tsx`
- 현재 단일 페이지에 학생 리스트 + 학부모 링크 섞여 있음
- 탭 구조 도입: `Tabs` 컴포넌트 (기존 `SidePanel`, `SectionActionsPanel` 패턴 재사용). 탭 URL 파라미터: `?tab=roster|parents|breakouts`
- 탭 1: 학생 로스터 (기존 유지)
- 탭 2: 학부모 초대 관리 (`ParentManagementTab`)
- 탭 3: Breakout 세션 목록 + "새 세션" 버튼

### 4-3. Board 설정 패널 (⚙)
**파일**: `src/components/board/BoardSettingsPanel.tsx` (존재 가정, 없으면 생성)
- "아카이브 보기" 링크 추가 → `/board/[id]/archive`

## 5. Subscope E — 디자인 토큰 재적용

### 치환 규칙
```
s/#dc3545/var(--color-danger)/g
s/#e21b3c/var(--color-danger)/g
s/#dc2626/var(--color-danger)/g
s/#6b7280/var(--color-text-muted)/g
```
+ 문맥 판단 필요한 hex는 개별 검토.

### 금지 패턴
```tsx
// 제거
style={{ color: "#dc3545" }}
// 제거 (fallback)
style={{ color: "var(--color-danger, #dc2626)" }}

// 대상
style={{ color: "var(--color-danger)" }}
// 또는 className 기반 스타일 (선호)
```

### 파일 리스트
- `src/app/(teacher)/settings/external-tokens/page.tsx`
- `src/components/breakout/BreakoutBoard.tsx`
- `src/components/breakout/CreateBreakoutBoardModal.tsx`
- `src/components/breakout/BreakoutAssignmentManager.tsx`
- `src/app/board/[id]/archive/page.tsx`
- `src/components/parent/ParentManagementTab.tsx`
- `src/components/CanvaFolderModal.tsx`
- `src/components/QuizPlay.tsx`

### 검증
phase9 QA에서 grep 실행:
```bash
rg -n "#[0-9a-fA-F]{3,6}" <파일들>
```
→ 0건이어야 (주석/데이터 색상 제외).

## 6. API Contract 요약

| 엔드포인트 | 변경 | 신규 응답 |
|---|---|---|
| `GET /api/external/boards` | student_session 필수, classroom 필터 | 401 `student_session_required`, 200 `{boards:[]}` (스코프 축소) |
| `GET /api/external/boards/[id]/sections` | student_session + classroom match | 401 또는 403 `forbidden` |
| `POST /api/external/cards` | 변경 없음 (이미 가드됨) | — |

## 7. 롤백 계획

- 각 서브스코프별 커밋 분리 (feat/connective-polish-A ~ E)
- A만 독립 revert 가능 (보안이므로 최후의 수단)
- E는 순수 토큰 치환이라 revert 영향 최소

## 8. phase4 디자인 인풋

- 3-way CTA 레이아웃 (C)
- Classroom 탭 UI (D)
- "설정" 드롭다운 스타일 (D)
- 6+2 파일 토큰 치환 (E) — 시각 비교

## 검증 게이트 체크
- 5개 서브스코프 모두 커버 ✅
- API contract 명시 ✅
- 롤백 계획 ✅
- phase4 핸드오프 인풋 명시 ✅
