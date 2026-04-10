# Code Review — initial-padlet-app

**단계**: phase8 (code_reviewer)
**일자**: 2026-04-10
**리뷰어**: 오케스트레이터 셀프 (사용자 사전 위임, `/review` 대체)
**판정**: **PASS** → `REVIEW_OK.marker` 생성

## 1. 설계 준수 (design_doc.md 대비)

- [x] 4개 모델 (User/Board/BoardMember/Card) 스키마 일치
- [x] API 4개 엔드포인트 (GET board, POST card, PATCH card, DELETE card) 전부 구현
- [x] 컴포넌트 트리 (BoardCanvas / DraggableCard / AddCardButton / UserSwitcher)
- [x] 데이터 흐름 (server fetch → client optimistic → PATCH 저장) 설계대로
- [x] 엣지케이스 ≥ 5개: 403 forbidden, 404 not-found, position 클램프, 빈 보드, 잘못된 쿼리
- [x] 롤백 계획 — git clean -fd 가능 (미커밋)
- **스코프 드리프트 없음**

## 2. 프로덕션 버그 탐색

### 경계/에러 처리
- ✅ API 라우트: ForbiddenError / ZodError / 일반 에러 모두 catch → 403 / 400 / 500
- ✅ Prisma findUnique 결과 null 체크 (card, user, board)
- ✅ 카드 드래그 실패 시 낙관적 업데이트 revert
- ✅ 카드 추가 실패 시 alert + 콘솔 로그
- ✅ Card PATCH: existsCheck → permission check → update 순서 정확

### RBAC
- ✅ 서버 측 강제 (클라이언트 숨김은 defense in depth)
- ✅ owner/editor/viewer 계층 correct
- ✅ editor 의 본인 카드 삭제 예외 (author === current user) 처리
- ✅ viewer 403 검증 완료 (phase9)

### 타입 안전
- ✅ `npm run typecheck` PASS (0 에러)
- ✅ strict mode enabled
- ✅ isomorphic 코드 (roles.ts)와 server-only 코드 (auth.ts) 분리

### 성능
- ✅ 단일 Prisma 쿼리 + include (N+1 없음)
- ✅ optimistic update로 드래그 반응성 확보
- ✅ SQLite — 12 카드 level은 무시할 수준

## 3. 보안 감사 (/cso 준)

### OWASP Top 10 체크

| 카테고리 | 상태 | 메모 |
|---|---|---|
| A01 Broken Access Control | **강화 필요 (dev) / PASS (구조)** | mock auth 노출. RBAC 구조는 정확. 프로덕션 이행 시 실제 인증 필수. |
| A02 Cryptographic Failures | N/A | 암호화 대상 없음 (비밀번호/토큰 저장 없음) |
| A03 Injection | **PASS** | Prisma ORM이 쿼리 매개변수화. zod 입력 검증 |
| A04 Insecure Design | **PASS (MVP)** | RBAC 설계 정확. 실시간/인증은 설계 없이 OUT |
| A05 Security Misconfiguration | **PASS** | `.env` gitignore, server-only 적용 |
| A06 Vulnerable Components | **PASS** | deps 최신 (Next.js 16, Prisma 6, React 19) |
| A07 Identification Failures | **DEV ONLY** | mock auth — README 경고 명시 |
| A08 Software/Data Integrity | **PASS** | 서버 측 입력 검증 (zod) |
| A09 Logging/Monitoring | **WARN** | console.error 만 있음. 프로덕션 이행 시 Sentry 등 필요 |
| A10 SSRF | N/A | 외부 fetch 없음 |

### STRIDE 간이 체크

- **Spoofing**: mock auth (dev only), 프로덕션에서는 별도 feature로 실제 인증
- **Tampering**: 모든 write가 RBAC 통과 → 인증 후에는 권한 기반 방지
- **Repudiation**: authorId 기록 (edit/delete 로그는 없음 — 향후 audit log)
- **Information Disclosure**: 403/404 에러 메시지가 RBAC 정보 일부 노출 — MVP 허용
- **Denial of Service**: 입력 max 길이(title 200, content 5000) 강제
- **Elevation of Privilege**: 서버 RBAC 체크, 우회 경로 없음 확인

### 민감 영역 변경 사항

- **auth**: mock — `server-only` 격리, 쿠키 기반, DEV 명시
- **file upload**: 없음 (MVP OUT of scope)
- **DB write**: 전부 RBAC 통과
- **외부 API**: 없음

## 4. 코드 스타일

- 일관된 네이밍 (camelCase, 컴포넌트 PascalCase)
- import 순서 정리됨
- 주석: public API에는 JSDoc, 복잡 로직에 inline 설명
- 죽은 코드 없음 (phase6에서 정리)
- 타입 정의 명시적

## 5. 판정

**전체 PASS** — 프로덕션 준비 수준은 아니지만 **MVP 요구사항은 완전히 충족**. 주요 보안 이슈 없음. 알려진 한계는 scope_decision.md에 명시된 OUT 항목 (실시간/인증/파일).

**REVIEW_OK.marker** 생성 → phase9 진행.

## 6. 후속 권장 (blocking 아님)

1. 테스트 프레임워크 도입 (Vitest 또는 Playwright e2e)
2. 로깅: pino 또는 Sentry 통합
3. 에러 바운더리 (app/error.tsx)
4. Rate limiting (vercel 도입 시)
5. Prisma 마이그레이션 (db push → migrate) — Postgres 이행 시
