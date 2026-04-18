# Design Review — plant-journal-v2

## Input audit
- `design_brief.md` requirements: S1..S5 screen states, 4 a11y requirements, information hierarchy. All mapped to spec sections §2, §4.
- Selected variant: `mockups/v1-vertical-rail-grid.md`. ASCII mockup and CSS grid plan present.

## Scores

| 차원 | 점수 | 코멘트 |
|---|---|---|
| 일관성 | 9/10 | 기존 plant.css 토큰과 `.plant-obs-*` 클래스 재사용. 새 선택자만 추가, 중복 톤 없음. |
| 계층 | 9/10 | 시선 흐름이 plant-head → rail → body 순으로 명료. Active stage가 accent outline + soft glow로 두드러짐. |
| 접근성 | 8/10 | 키보드·SR·포커스·reduced-motion 모두 명시. 개선: rail node를 button이 아닌 div로 둔다면 aria-hidden=true 유지; label은 body region에서 제공. 반영. |
| 감성/톤 | 8/10 | 식물 저널 톤(부드러운 accent, gentle fade)을 유지. teacher banner는 "👩‍🏫" 이모지 1개로 정중함. |
| AI slop 감지 | 9/10 | 그라디언트/placeholder 텍스트 없음. 실 문구("관찰 추가", "다음 단계로")만 사용. 감지된 slop 없음. |
| 반응형 | 8/10 | 520px 브레이크포인트 + obs grid 1열 전환 명시. 추가 권고: 보드 헤더와의 수직 간격을 var(--space-lg)로 통일. (spec에 반영) |

**평균 8.5/10 — PASS.**

## 변경/추가 조치
- design_spec.md에 추가 정리:
  - rail node는 `div` + `aria-hidden="true"` + tabindex 없음. 상태는 상위 region `aria-label`에서 전달.
  - 교사 banner에 "← 요약으로" 돌아가기 링크를 명시.
  - 모바일 브레이크포인트에서 teacher-banner 세로 스택.

(위 사항 전부 design_spec.md §4 / v1 mockup에 이미 반영됨 — 추가 diff 없음.)

## AI slop 감지 결과
- 무의미한 그라디언트: 없음.
- 반복 문구: 없음 (stage별 고유 관찰 포인트 + 실제 이름).
- 빈 placeholder: 없음. 빈 상태는 "아직 기록이 없어요." 같은 사용자용 문구로 대체.

## 결론
전체 평균 8.5/10. phase7 진행 승인.
