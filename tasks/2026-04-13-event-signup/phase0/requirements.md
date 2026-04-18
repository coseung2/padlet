# Phase 0 — Requirements (Event-signup)

## 1. Problem
교사가 학교 행사(동아리 발표, 공연, 프로젝트 발표 등) 신청을 받기 위한 전용 보드 레이아웃이 없다. 현재 `assignment` 레이아웃은 학급 내부용(로그인 기반)이고, 외부 공유/QR/공개 신청을 지원하지 않는다.

## 2. Personas
- **교사(teacher)** — 행사 주최자. Aura-board 로그인 사용자. 보드 owner.
- **학생/지원자(public applicant)** — 로그인 없이 QR/링크로 진입. 브라우저 쿠키 기반 신원.
- **심사자(reviewer)** — 교사 또는 초대된 로그인 사용자. `BoardMember(role=editor|owner)`.

## 3. Primary User Stories
| ID | Story |
|---|---|
| US-1 | 교사로서 새 보드를 만들 때 레이아웃 "event-signup"을 고르고 포스터/일정/심사 기준/폼 문항을 설정해 공개 신청을 받고 싶다. |
| US-2 | 교사로서 QR과 단축 링크를 생성해 학생들에게 배포하고, 필요 시 토큰을 재발급해 이전 QR을 무효화하고 싶다. |
| US-3 | 지원자로서 QR을 스캔하면 로그인 없이 신청폼에 접근하고, 이름·학년반·번호·연락처·답변(커스텀 문항)·영상 링크를 제출하고 확인 토큰(쿠키)을 받고 싶다. |
| US-4 | 지원자로서 확인 토큰으로 `my` 페이지에서 내 제출 상태를 확인하고(마감 전) 수정하고 싶다. |
| US-5 | 교사로서 제출물 리스트를 100건 이상에서도 빠르게 훑고(가상화), 개별 상세를 보고, 승인/반려/점수 부여 상태를 바꾸고 싶다. |
| US-6 | 교사로서 "승인 필요" 모드를 켜면 새 제출이 `pending_approval`로 쌓이고 승인해야 공개 명단/집계에 포함되길 원한다. |
| US-7 | 교사/보조심사자로서 여러 명이 각자 점수/코멘트를 남겨 평균 점수가 자동 계산되길 원한다. |
| US-8 | 교사로서 결과 발표 모드 3종(공개 명단 / 비공개 검색 / 비공개 유지) 중 선택하고, 지원자가 이름+학번으로 본인 합격 여부만 조회할 수 있게 하고 싶다. |
| US-9 | 지원자로서 영상을 첨부할 수 있다(YouTube 링크 항상 허용, Cloudflare Stream 직업로드는 환경변수 설정된 경우만). |
| US-10 | 시스템으로서 IP 해시 + 쿠키로 스팸 신청을 완화하고(1h/5건), hCaptcha 키가 있으면 고위험 케이스에 요구한다. |

## 4. Constraints
- **솔로 프로젝트**: PR 스킵 가능. 브랜치만 생성해서 사용자에게 넘김.
- **포트 3000만** 사용. 4000은 금지.
- **Prisma 스키마 변경**: Supabase postgres. **`prisma db push` non-destructive만** 사용. `--force-reset` 금지.
- **기존 필드 nullable**: 이미 `Submission` 모델이 학급 과제용으로 쓰이고 있음 → 신규 필드는 전부 NULLABLE/DEFAULT, `userId`를 `String?`으로 변경(기존 데이터는 NOT NULL 조건 만족).
- **Next.js 16 App Router + RSC**. `useRouter`/`useSearchParams`는 Suspense 경계 필요.
- **next-auth v5 beta**. 공개 엔드포인트는 NextAuth 세션 없이도 작동해야 함.
- **디자인 토큰만** (docs/design-system.md).
- **모바일 우선**: 갤럭시 탭 S6 Lite 기준 신청폼 TTI < 2s.

## 5. Non-functional
- 보안: 토큰 비교 timing-safe (기존 `src/lib/rbac.ts#tokensEqual` 재사용).
- 개인정보 최소화: 공개 명단 모드에서도 연락처·이메일은 절대 노출 안 함.
- 스팸: ipHash는 salted SHA-256 (raw IP 저장 금지).

## 6. Open questions (resolved in phase2/3)
- Q1: 신청 폼 필드 기본 세트? → 이름/학년/반/번호/연락처/영상/팀 구성/커스텀 JSON. 각 asK* 토글로 교사 제어.
- Q2: 관리자 공개 명단의 정렬? → scoreAvg desc, 동점 시 submittedAt asc.
- Q3: 확인 토큰 수명? → 보드 종료(eventEnd) + 30일. 쿠키 maxAge 동일.
- Q4: 파일 업로드 크기? → 영상 `maxVideoSizeMb` 필드(기본 200MB), 이미지는 기존 업로드 파이프라인 재사용.

## 7. Assumptions
- `qrcode` npm 패키지는 이미 의존성에 포함(package.json 확인).
- Cloudflare Stream 환경변수 없으면 영상 업로드는 "YouTube만 허용" 모드로 자동 전환.
- 기존 Board `layout` enum(문자열 validation)에 `"event-signup"` 추가.
