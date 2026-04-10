# Rejected Variants — phase5 archive

**선택 결과**: Notion 테마 채택 (2026-04-10).
**탈락**: Figma, Miro.

## 아카이브 내용

이번 phase6에서 production 코드에서 제거한 것들:

| 제거된 아티팩트 | 원본 위치 | 복원 방법 |
|---|---|---|
| `[data-theme="figma"]` CSS 블록 (~85줄) | `src/app/globals.css` | git history (phase5 완료 시점 커밋) |
| `[data-theme="miro"]` CSS 블록 (~40줄) | `src/app/globals.css` | git history |
| figma/miro 특화 오버라이드 | `src/app/globals.css` | git history |
| `src/components/ThemeSwitcher.tsx` | 삭제됨 | git history |
| `src/lib/theme.ts` | 삭제됨 | git history |
| `layout.tsx` 의 data-theme attr 주입 | 단순화됨 | git history |
| `proxy.ts` 의 theme 쿠키 핸들링 | 제거됨 | git history |

## 원본 디자인 스펙

각 탈락 변형의 디자인 사상과 스펙은 다음 파일에서 변함 없이 유지:

- `tasks/2026-04-09-initial-padlet-app/phase5/design_variants.md` — 3개 변형 비교
- `tasks/2026-04-09-initial-padlet-app/phase1/design_md_refs/figma_DESIGN.md` — Figma DESIGN.md (220줄 원본)
- `tasks/2026-04-09-initial-padlet-app/phase1/design_md_refs/miro_DESIGN.md` — Miro DESIGN.md (110줄 원본)

## 재도입 트리거

향후 테마 스위처를 다시 도입해야 할 이유가 생긴다면:
1. 이 디렉토리를 확인 (왜 제거됐는지)
2. `phase5/design_variants.md`에서 토큰 구조 복습
3. git log에서 phase5 완료 커밋 찾아 체리픽 또는 참고
4. 새 feature task로 진행 — 임의 재도입 금지 (문서화 없이 되돌리면 감사 이력 파손)
