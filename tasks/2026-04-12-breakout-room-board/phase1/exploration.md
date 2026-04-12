# Phase 1 — Research (BR-1 ~ BR-4 Foundation)

## 기존 패턴 조사

### 1. Section 엔티티 현황
- `prisma/schema.prisma` 라인 166-181: Section 보유 (boardId, title, order, accessToken)
- `accessToken` 필드는 T0-① 완료 — Breakout 격리 뷰 토큰
- onDelete: Cascade로 Board 삭제 시 섹션도 제거

### 2. T0-① 섹션 격리 뷰 (프로덕션 배포 완료 — 재사용 대상)
- `src/app/board/[id]/s/[sectionId]/page.tsx`: 섹션 ID로만 카드 조회
- `src/lib/rbac.ts` viewSection(): token/NextAuth/student 3-path 권한 체크
- `src/components/SectionBreakoutView.tsx`: 서버 컴포넌트, 카드 리스트만 렌더
- **재사용 전략**: Breakout 학생 뷰는 이 라우트 그대로 사용. 교사 뷰만 새로 작성.

### 3. Board 생성 흐름
- `src/app/api/boards/route.ts` POST — layout enum 확장 지점 식별
- `src/components/CreateBoardModal.tsx` — 레이아웃 picker 그리드, classroom 2-step
- 칼럼보드가 학생 수만큼 section 자동 생성하는 패턴 이미 존재 → breakout도 유사하게 N modun × 섹션 copy

### 4. 카드 생성/복제
- `src/app/api/cards/route.ts`: 단일 카드 생성. sectionId 지정 가능
- `src/components/ColumnsBoard.tsx` handleDuplicateCard: 단일 카드만 복제
- **신규 필요**: N개 group section에 동일 카드 일괄 INSERT API

### 5. RBAC 구조
- `src/lib/rbac.ts`: owner/editor/viewer 3단계
- BoardMember로 보드별 권한. 교사=owner
- Tier 필드 없음 → User에 없고 Classroom에도 없음 → **Tier 시스템은 foundation 외 스코프**. Gating은 UI 플래그로 stub 처리(실제 결제는 별도 seed).

### 6. 리액트/Next 스택
- React 19 + Next 16 App Router + Turbopack
- 서버 컴포넌트 page.tsx + 클라이언트 컴포넌트 "use client"
- zod 런타임 검증, Prisma 클라이언트 싱글톤

## 프로토타입 결정
- 신규 모델 3개: BreakoutTemplate, BreakoutAssignment, BreakoutMembership
- structure JSON 스키마:
  ```
  {
    "sectionsPerGroup": [{ "title": "K (아는 것)", "role": "group-copy", "defaultCards": [{"title":"...","content":"..."}] }, ...],
    "sharedSections": [{ "title": "팀 공용 자료", "role": "teacher-pool" }]
  }
  ```
- layout="breakout" → 보드 생성 시:
  1. BreakoutAssignment 1개
  2. sectionsPerGroup × N modun = N × S group sections
  3. sharedSections (있으면) × 1 teacher-pool section (보드 레벨 단일)
  4. defaultCards deep-copy 카드 INSERT

## 기술 스택 결정 요약
- DB: Postgres (Supabase icn1) — schema 이미 postgresql provider
- ORM: Prisma 6
- API: Next.js 16 API routes + zod
- 시드: tsx 스크립트 (PLANT 시드 패턴 승계)
- UI: React 19 클라이언트 컴포넌트

## Tier gating 전략
- User 엔티티에 tier 필드 없음 → `TIER_MOCK = "free"`를 상수로 두고 env로 override
- 실제 결제는 foundation 범위 외
- Free 3종(KWL/브레인스토밍/아이스브레이커)만 선택 가능, Pro 5종은 "Pro 전용" 배지 + disabled
