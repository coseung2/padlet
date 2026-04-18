# Doc Updates — dj-board-queue

## 업데이트된 문서

### `docs/current-features.md`
- `## Board layouts` 테이블에 `dj-queue` 행 추가
- 파일 끝에 `## DJ Board (dj-queue) — 2026-04-18` 섹션 신설: 데이터 모델, RBAC resolver, API, UI, extensibility, out-of-scope 기록

### `docs/architecture.md`
- 파일 끝에 `## DJ Board (dj-queue) — 2026-04-18` 섹션 신설: 3 Prisma models 요약, `getEffectiveBoardRole` precedence 3단계, API 신규/수정, YouTube validation (host allowlist), 컴포넌트 트리, extensibility SQL 예시

### `docs/design-system.md`
**수정 없음**. `tokens_patch.json`은 `--color-dj-nowplaying-bg` 신규 토큰 1개를 제안했으나 phase7 구현에서 `boards.css`에 linear-gradient 값 인라인으로 처리. 향후 다른 보드에서 공통으로 쓸 일이 생기면 별도 task로 token 등재.

### `CLAUDE.md`
**수정 없음**. 오케스트레이션 규칙/경로/환경 변경 없음.

### `README.md`
**수정 없음**. README는 사용자 facing 가이드가 아니라 내부 개발 문서 성격. dj-queue 보드 사용법은 features 문서에서 커버.

## 회고 (3줄)

- **잘된 점**: 파이프라인 phase0-11 자동 감독 모드가 깔끔하게 작동. scope_decision의 AC 10개가 구현 코드 경로로 그대로 mapping되어 phase9 검증이 직관적. data-driven role 설계로 사서/은행원 확장이 코드 변경 0으로 가능해진 것이 핵심 성과.
- **아쉬운 점**: phase9 브라우저 e2e를 live로 돌리지 못하고 static 매핑으로 대체. Windows dev-env의 sharp 네이티브 바이너리 이슈로 `next build` page-data collection 실패 — 이건 pre-existing 이슈라 DJ와 무관하지만 local 완전 검증 불가 요인. phase5 validating/preview-ready 중간 상태 UI 생략도 약간의 UX 퇴보.
- **다음 task에서 적용할 것**: (1) phase2 AC에 "**local build 완전 성공**"을 기준으로 넣지 말고 "**Vercel CI PASS**"를 기준 지표로. (2) 같은 학급 role grant 패턴이 여럿이면 역할 패널을 범용화하는 별도 task를 만들어 DJ 구현부와 분리. (3) phase3 R2/R8 같은 "시간 기반 권한 지연(<60s)"은 전면 스펙으로 wrap — 매번 재발명 금지.

## 학습 포인트 (재사용 후보)

- classroom-role → board-layout grant 데이터 테이블 패턴은 향후 모든 "역할 기반 권한 위임" feature의 템플릿. 역할 신설 시 코드 ZERO 변경.
- `getEffectiveBoardRole`은 **새 함수 추가만**으로 기존 17개 호출부 안 건드린 surgical 패턴. 기존 RBAC 확장 시 overloading 유혹 금지.
- YouTube URL validation에서 호스트 화이트리스트 + videoId regex (11 char)가 SSRF + 형식 validation을 동시에 막음. oEmbed는 실패 시 원인 노출 안 함 (정보 누출 방지).
