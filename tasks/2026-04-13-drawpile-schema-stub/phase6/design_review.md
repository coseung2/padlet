# Phase 6 — Design Review

## Verdict: APPROVE (V1)

## Checklist
- [x] Tokens 재사용 (design-system)
- [x] 접근성 (role="tablist", sandbox, aria-label, aria-selected)
- [x] 빈 상태 / 에러 상태 처리
- [x] 반응형: 사이드바 모바일에서 768px 미만 시 하단으로 이동 필요 → phase7 에서 media query 추가
- [x] S6 Lite 고려: iframe 은 브라우저 기본 hardware accel. 썸네일 grid는 CSS grid (성능 무난)
- [x] GPL 격리: iframe only. 코드 import 없음.
- [x] Drawpile 미배포 상태 UX: 명시적 placeholder + BLOCKERS 가이드

## Outstanding items for phase7
- 모바일 breakpoint: `@media (max-width: 768px) { .drawing-board { flex-direction: column; } .drawing-sidebar { flex: 0 0 auto; } }`
- Upload in-progress 스피너 (간단 `disabled` + 텍스트 변경으로 대체 허용)
- 에러 toast: alert 로 스텁 (기존 모달들 동일 패턴)

Phase7 진행.
