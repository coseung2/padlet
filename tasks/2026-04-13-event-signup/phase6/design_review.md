# Phase 6 — Design Review

## Checklist
- [x] 디자인 토큰만 사용 (신규 토큰 없음)
- [x] 모바일 폼 TTI < 2s 타깃 — 외부 스크립트 hCaptcha 는 lazy load
- [x] 접근성: label/aria, 키보드 flow, color+text 배지
- [x] 에러 상태: 422/429 에 대응하는 상단 배너 존재
- [x] 공개 결과 모드 3종 구분된 UI
- [x] 교사 리뷰 대시보드 가상화 전략(`content-visibility:auto`)
- [x] QR + 링크 공유 카드 readability

## Issues raised + resolutions
- **I-1**: 제출 완료 후 토큰 표시는 길다 → "저장됨/복사됨" 간단 UX로 축약. 토큰은 `/my` URL에 쿼리로 끼워넣어 사용자에게 "이 링크를 저장하세요" 제시 (복사 버튼 1회)
- **I-2**: 마감 임박 배너 기준 → 24h 이내. 초과/임박 상태는 서버 응답에 포함
- **I-3**: 팀 신청 2명 이상 조건 → 필수 멤버 수는 maxTeamSize로 동적

## Decision
APPROVE. 디자인 스펙으로 구현 진행.
