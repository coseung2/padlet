# Doc Updates — initial-padlet-app

**단계**: phase11 (doc_syncer)
**일자**: 2026-04-10

## 업데이트된 문서

- **README.md** (프로젝트 루트)
  - MVP 상태 라인: "3개 테마 비교" → "Notion 확정"
  - 테마 전환 섹션 제거
  - 프로젝트 구조에서 ThemeSwitcher.tsx / theme.ts 제거, roles.ts 추가
  - 기술 스택 테이블에서 "테마" 행을 "디자인 (Notion-inspired)"로 교체
  - 다음 단계 섹션을 phase 기반으로 재작성

- **CLAUDE.md** — 변경 없음 (아키텍처 규칙 그대로 유효)

## 업데이트 필요 but 생성 안 함 (후속 task)

- **docs/architecture.md** — 아직 생성 안 됨. 다음 feature task 시작 전 phase3 architect가 기존 스택(Next.js 16 + SQLite + Prisma + dnd-kit)을 이 문서에 **locked-in 버전**으로 기록해야 함. 이번 task에서 생략한 이유: 초기 feature 하나만 있는 상태에서 문서화는 중복 — 후속 task에서 "기술 스택 결정을 이 문서에서 참조" 하는 시점에 동시 생성이 자연스러움.

- **docs/current-features.md** — 미생성. 현재 라이브 기능은 단 하나 (`/board/demo` MVP)이므로 README로 충분. 후속 feature 추가 시 문서화.

- **docs/design-system.md** — 미생성. `src/app/globals.css`의 `:root` 블록이 사실상 디자인 토큰 레지스트리 역할. 후속 task에서 별도 문서 필요 시 분리.

## 회고 (3줄)

**잘된 점**:
- 하네스 설계 → 적용이 같은 세션에서 매끄러웠음. 3개 테마 변형 → 선택 → 정리 플로우가 scope_decision.md 상의 경로 그대로 진행됨.
- RBAC 서버-측 강제를 먼저 설계하고 클라이언트 UI는 가림막 수준으로 단순화한 것이 엣지케이스를 줄였음.
- `server-only` + `roles.ts` 분리 패턴은 Next.js App Router의 server/client 경계를 깔끔히 처리.

**아쉬운 점**:
- Turbopack 핫리로드가 layout.tsx 변경에 반응 안 한 사례 — `.next` 수동 삭제 필요. 후속 task 주의.
- 테스트 프레임워크 미도입 — smoke curl로 충분했지만 회귀 방지 수단 부재.
- Docker Desktop 비활성으로 Postgres 이행이 지연됨. SQLite로 시작한 건 합리적이나 이행 시점을 명시적으로 정해야 함.

**다음 task에서 적용할 것**:
- `docs/architecture.md` 를 두 번째 feature task의 phase3에서 생성하여 스택을 락다운
- 테스트 도입을 별도 research task로 분리 (Vitest vs Playwright vs 둘 다)
- Turbopack 캐시 이슈를 재현 테스트로 기록 — 변경 감지 실패 시 대응 런북
- 실시간 동기화 research task를 open하기 전에 반드시 인증 feature task 선행 (익명 사용자 동시 편집은 의미가 약함)

## push 승인

본 task 파일들은 아직 git commit/push 되지 않음. 사용자 명시 push 승인 후 커밋 예정.

권장 커밋 메시지:
```
feat: initial padlet clone MVP (Notion theme)

- Next.js 16 + SQLite + Prisma + dnd-kit stack (first feature task)
- RBAC server-enforced (owner/editor/viewer)
- Mock auth via ?as= cookie (DEV only)
- Seed: 3 users, 1 demo board, 12 cards
- Notion-inspired theme locked in after comparing Figma/Miro/Notion

Task: 2026-04-09-initial-padlet-app
```
