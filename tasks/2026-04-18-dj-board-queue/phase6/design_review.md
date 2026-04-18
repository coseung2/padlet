# Design Review — dj-board-queue

`phase5/design_spec.md` (v2 선택) 에 대한 6차원 자체 검수.

## 평가 차원

| 차원 | 점수 | 비고 |
|---|---|---|
| 일관성 (디자인 시스템) | 9 | 신규 토큰 1개(`--color-dj-nowplaying-bg`)만 발행, 나머지 전부 기존 토큰 재사용 |
| 정보 계층 | 9 | Now-Playing → 리스트 → CTA 하향 flow, design_brief §2와 일치 |
| 접근성 | 8 | `role="status" aria-live` + aria-label + focus-visible + reduced-motion 5개 포인트. 키보드 드래그는 MVP 제외로 -2점 |
| 감성/톤 | 8 | 🎧 이모지 단일 포인트 + 기본 accent 토큰 조합. 과한 gradient/장식 없음 |
| AI slop 감지 | 9 | placeholder 텍스트 없음, 무의미한 gradient는 Now-Playing 1개만(의도적). 기계적 반복 없음 |
| 반응형 | 8 | ≤640px 축소/모바일 bottom sheet 명시됨. 태블릿 중간 layout은 phase7 fine-tune |

**평균: 8.5 / 10** → phase7 진행 조건(≥8) 충족.

## AI slop 감지 상세

- ❌ "Next Level · aespa" 같이 그럴듯한 placeholder는 mockup/comparison.md 설명용이며 실제 copy에 포함 안 됨
- ❌ 불필요한 gradient — Now-Playing 1곳만 한정, CTA/버튼은 solid
- ❌ 기계적 반복 — status pill 4종 각자 토큰 분리
- ✓ 모든 카피 한국어 자연문 ("아직 신청 곡이 없어요", "첫 곡을 추가해보세요")

## 수정 사항

**수정 없음.** design_spec.md 그대로 phase7 전달.

이유:
1. 전 차원 7점 이상 (phase6 필수 통과 조건)
2. 평균 8.5 → phase7 진행 조건 충족
3. 디자인 시스템 확장 최소화 (신규 토큰 1개)
4. MVP scope 내 완결성 확인

## 경계/노트 (phase7 구현 주의)

- `--color-dj-nowplaying-bg` 값은 phase7에서 실제 렌더링 후 명도 대비 재측정. 텍스트 `--color-text` 대비 ≥4.5:1 유지.
- reduced-motion 분기는 놓치기 쉬움 — `@media (prefers-reduced-motion: reduce)`로 모든 transition 0ms.
- `<ul class="dj-queue-list">` 시맨틱 유지 (div 금지) — 스크린리더가 "목록 · 12 항목"으로 읽게.
