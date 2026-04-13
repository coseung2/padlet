# Design Review — canva-publish-polish

task_id: `2026-04-13-canva-publish-polish`
검수 대상: `phase5/design_spec.md` (v3 Chip 반영판)
검수자: orchestrator (self-review, solo project)
일자: 2026-04-13

## 0. design_brief 요구사항 반영 점검

| 요구 | 출처 | 반영 여부 | 비고 |
|---|---|---|---|
| 모든 화면 상태 나열 (ready/empty/loading/error/success) | brief §1 | ✅ | spec §2 에 5개 + WS success 상태 + CanvaEmbedSlot 조립 케이스 추가 |
| 정보 계층 원칙 (푸터 = 보조) | brief §2 | ✅ | spec §2.6 에 카드 조립 트리 명시 |
| 인터랙션 pointer-events: none | brief §3 | ✅ | spec §6 에 명시 |
| 접근성 ≥3 (sr-only, `<time>` 의미론, 대비, focus 비간섭, forced-colors) | brief §4 | ⚠️ | spec 에 접근성 항목이 §6 인터랙션 외 명시 섹션 없음 — 수정 필요 |
| 디자인 시스템 확장 최소 | brief §5 | ✅ | 토큰 신규 0, 전부 기존 재사용 |

## 1. 차원별 평가 (0~10)

### 1.1 일관성 (디자인 시스템 준수)
**점수: 9**
- 사용된 토큰 전부 `docs/design-system.md` 에 정의된 공식 토큰 (`--color-accent-tinted-bg/text`, `--radius-pill` 등).
- chip 패턴은 badge·스위처·FAB 와 동일 반경 언어 사용.
- 감점 1: chip padding 중 세로 `2px` 가 토큰 아닌 리터럴. `--space-0-5` 같은 half-space 토큰이 없으므로 수용 가능하나, phase7 에서 CSS 변수 정의 검토 권장.

### 1.2 계층 (정보 우선순위)
**점수: 9**
- 푸터가 카드 본체 하단 별도 행 → 시선 흐름 "본문 → 첨부 → 작성자" 일치.
- chip 배경색이 본문 대비 튀지 않는 tinted-bg 로 보조 정보 위상 유지.
- 감점 1: chip tinted-bg (#f2f9ff) 가 카드 전체 배경이 흰색일 때 거의 보이지 않을 가능성 — phase7 구현 시 카드 배경 확인 필요.

### 1.3 접근성 (WCAG)
**점수: 7** (수정 전) → **9** (수정 후)
- 수정 전: spec 에 a11y 명시 섹션 부재. brief §4 요구 5개가 spec 에 흡수되어 있지만 개발자가 놓치기 쉬움.
- **수정 조치**: spec §7 접근성 섹션 신규 추가.
- 수정 후: sr-only, `<time>`, 대비(AA), focus 비간섭, forced-colors 전부 문서화.

### 1.4 감성/톤 (제품 정체성)
**점수: 8**
- tinted-bg chip 은 "뱃지" 계열 (design-system.md 의 "뱃지 배경" 정의) 과 일치 — 학급 맥락의 친근한 톤 표현.
- 감점 2: chip 이 interactive 하게 보이지만 클릭 불가인 트레이드오프 존재. 현재는 사용자 승인한 감수 항목.

### 1.5 AI slop 감지
**점수: 10**
- 기계적 반복: 없음. 변형 4개 전부 서로 구조 다름.
- 무의미한 그라디언트/glow: 없음. tinted-bg 단색만 사용.
- placeholder 텍스트 "Lorem ipsum": 없음. 샘플 이름 "공서희" (실제 학생 더미 데이터 이름).
- 무맥락 이모지: 없음.

### 1.6 반응형 (브레이크포인트)
**점수: 8**
- 카드 자체가 고정폭(240px 기본) + 사용자 resize 가능. 푸터는 이 폭에 자동 flex.
- chip 이름이 길면 `text-overflow: ellipsis` 필요 — phase7 구현 힌트로 추가.
- 태블릿/모바일: 푸터 높이 +28px 은 Galaxy Tab S6 Lite 기준 허용.
- 감점 2: 매우 긴 이름(한글 10자 이상) 처리 미정의 → 수정에서 ellipsis 명시.

## 2. 수정 사항 (design_spec.md 업데이트)

1. **§7 접근성 섹션 신규 추가** (sr-only, time 의미론, 대비 AA, focus 비간섭, forced-colors)
2. **§2.1 ellipsis 규칙 명시** — chip 내 이름 `max-width + text-overflow: ellipsis`

## 3. 최종 점수

| 차원 | 점수 |
|---|---|
| 일관성 | 9 |
| 계층 | 9 |
| 접근성 (수정 후) | 9 |
| 감성/톤 | 8 |
| AI slop | 10 |
| 반응형 (수정 후) | 9 |
| **평균** | **9.0** |

**판정: PASS** (평균 ≥ 8). phase7 진행 가능.

## 4. phase7 coder 에게 전달 힌트

1. 경로: `src/components/cards/CardAuthorFooter.tsx` (신규)
2. chip 긴 이름: `max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
3. chip padding: `padding: 2px var(--space-2)`
4. chip radius: `border-radius: var(--radius-pill)`
5. pointer-events 비활성: chip 요소에 `pointer-events: none` — 또는 `<span>` 유지(클릭 가능 태그 아님) + `user-select: none` 정도
6. `<time dateTime={iso}>` 는 chip 바깥
7. 카드 조립 위치 수정 필요 — `src/components/` 아래 카드 최상위 컴포넌트 탐색 (DraggableCard 아님, phase7 시작 시 grep 필요)
