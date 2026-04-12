# Doc Updates — breakout-section-isolation

## 업데이트된 문서

- **`docs/architecture.md`** (신규) — 스택 lockdown, RBAC/Realtime 요약, Section.accessToken 추가, 신규 API 2종 + 신규 route 2종 반영.
- `docs/design-system.md` — 변경 없음 (tokens_patch.json이 tokens_added=[] 이므로 diff 노이즈 회피).
- `CLAUDE.md` — 변경 없음 (파일 구조/환경 불변).
- `README.md` — 변경 없음 (사용자-facing 사용법 추가 없음, Breakout UI는 내부 기능 슬라이스).

## 회고

### 잘된 점
- 10개 수용 기준 전부 PASS. 특히 mock-auth dev 한계로 HTTP curl로는 검증이 불가능한 "anonymous + wrong token" 경로를 lib-level 통합 스펙(`regression_tests/view_section.test.ts` 7/7)으로 우회 검증함.
- self-review에서 발견한 3개 blocker(hydration mismatch, timing-safe compare, getCurrentUser throw path)를 phase8 fix-commit으로 즉시 정리.

### 아쉬운 점
- Core Web Vitals baseline 미수집 — WSL2 worktree에 Chromium 헤드리스가 없어 informal curl 타이밍으로 대체. 후속 task에서 `/benchmark` 스킬 통합 시 재측정 필요.
- share 토큰이 plaintext로 DB에 저장 — owner UI에서 재표시를 위해 의도적 선택. 보안 강화가 필요하면 hash+display-once 플로우로 전환.

### 다음 task에서 적용할 것
- 새 worktree는 `.env`를 초기에 복사 + `prisma generate`를 1회 선행 실행 → dev 서버 기동 전에 한 번만 끊김 없는 DB/Prisma 상태 확보.
- Prisma 마이그레이션 DB 이력이 비어 있으면 `prisma migrate resolve --applied <prev>`로 baseline 후 신규 `deploy` — 다음에도 재발할 수 있으므로 DEPLOY_PLAN에 기본 스텝으로 기록.
- 실시간 엔진 선택은 반드시 별도 `research` 파이프라인으로. helper만 먼저 땄기 때문에 이후 research task에서 helper 시그니처 유지만 지키면 된다.
