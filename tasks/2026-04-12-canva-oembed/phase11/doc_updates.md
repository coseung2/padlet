# Doc Updates — canva-oembed

## 업데이트된 문서

- `docs/design-system.md` §7 (컴포넌트 패턴) 끝에 `.card-canva-embed` 라이브 임베드 wrapper 규격 추가 — 향후 Figma/Notion/GeoGebra 확장 시 재사용 기반.
- `README.md` 상단 "카드에 붙일 수 있는 콘텐츠" 섹션 추가 — Canva 라이브 임베드 지원 명시 + 향후 확장 후보 embed-research findings 경로 포인터.
- `tasks/2026-04-12-embed-research/findings.md` — 이미 생성됨 (phase0/phase1 단계의 부산물). 후속 task 시드.

## 의도적으로 수정하지 않은 문서

- `docs/architecture.md` — 아직 존재하지 않음 (이 프로젝트의 첫 feature task가 architect 단계에서 생성 예정). 이번 task 가 스키마 변경이 없고 컴포넌트 트리 변경도 최소(기존 CardAttachments 안 분기 추가) 라 새 문서 생성은 별도 task 로 위임.
- `CLAUDE.md` — 오케스트레이션 규칙 변경 없음.
- `docs/current-features.md` — 현 저장소에 없음. README 의 "카드에 붙일 수 있는 콘텐츠" 섹션이 기능 목록 역할.

## 후속 task 후보 (embed-research 기반)

1. `generic-oembed-expansion` — `.card-canva-embed` 를 `.card-live-embed` 로 일반화 + 지원 도메인 확장 (Google Slides/Docs/Sheets, Figma 공개, Notion 공개, Desmos, GeoGebra).
2. `canva-webhook-refresh` (P2-⑤) — roadmap 참조. 카드 썸네일 자동 갱신.
3. `canva-content-publisher` (P0-②) — roadmap 참조. Canva → Aura-board 역방향 앱.
4. `iframe-watchdog` — phase8 MEDIUM #2: 학교망 완전 차단 시 watchdog timer 로 fallback 확정.

## 회고 (3줄)

- **잘된 점**: 파이프라인 준수 + phase3 design_doc 기반의 XSS/SSRF/CSP 설계가 phase8 reviewers 의 반복된 도전에도 안정적으로 버팀. 서브에이전트 위임 체계(`/review` + `codex:codex-rescue`)가 실제 버그(Rules of Hooks 전 단계, 다수의 보안 bypass)를 잡아내 PASS 까지 5라운드 반복했지만 코드 품질이 확연히 올라감.
- **아쉬운 점**: gstack 미설치로 `/browse` 기반 라이브 Canva UX 비교와 `/benchmark` 기반 LCP 베이스라인 수립을 생략. 테스트 인프라 부재로 통합 테스트가 수동 체크리스트 로 남음.
- **다음 task 에 적용할 것**: codex 서브에이전트는 write-sandbox 제약이 있으니 오케스트레이터가 review 본문을 직접 persist 하도록 초반부터 설계. phase8 에서 코덱스가 반복 FAIL 낸 sequence 를 `phase3/design_doc.md` 에 edge case 로 선반영하면 라운드 수 단축 가능.

## 메모리 저장 대상 (재사용 패턴)

다음 패턴은 별도 파일로 메모리에 저장 권장:

1. **라이브 임베드 wrapper 패턴** — `.card-canva-embed` 의 반응형 16:9 + thumbnail-first-iframe-swap + CSP frame-src allowlist 조합. 향후 동일 패턴 반복 예상.
2. **codex 서브에이전트 페일 루프 대응** — 1~2 라운드 내에 끝나지 않고 5라운드까지 간 이유: "서버가 데이터 invariant 를 완전히 소유해야 client gate 가 신뢰 가능하다" 는 계약을 phase3 에서 명시하지 않았기 때문. phase3 템플릿에 "client-visible invariant → server 책임 경계" 섹션 추가를 고려.
