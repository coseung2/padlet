# Phase 11 — Documentation Sync

## Updated
- `docs/current-features.md` — Board layouts 표에 `drawing` 행 추가 (schema + UI stub, 서버 대기).
- `docs/architecture.md` — 2026-04-13 Drawpile 그림보드 섹션 append: 데이터 모델 (StudentAsset, AssetAttachment), 라우트, 컴포넌트 트리, 스타일, 마이그레이션, deferred 블로커 목록.

## Not updated (intentionally)
- `docs/design-system.md` — drawing 전용 토큰 없음. 기존 색/spacing 재사용만. 추가 규칙 없음.
- `CLAUDE.md` — 경로/환경 변경 없음 (dev/port 변경 없음, 새 스킬/툴 없음).
- `README.md` — 사용자 facing 변경 (새 레이아웃 사용법) 은 Drawpile 서버가 live 된 이후 별도 doc task 로 작성.
- `BLOCKERS.md` — phase7 에서 이미 생성.

## PUSH_READY marker
이 task 는 사용자 프롬프트 따라 push/merge 하지 않으므로 `PUSH_READY.marker` 만 생성하여 push 검증 게이트 상태를 기록한다.

```
touch tasks/2026-04-13-drawpile-schema-stub/phase11/PUSH_READY.marker
```

## Push validation (local, not executed remotely)
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success
- `tasks/2026-04-13-drawpile-schema-stub/phase8/REVIEW_OK.marker` ✅
- `tasks/2026-04-13-drawpile-schema-stub/phase9/QA_OK.marker` ✅
- `BLOCKERS.md` present at repo root
