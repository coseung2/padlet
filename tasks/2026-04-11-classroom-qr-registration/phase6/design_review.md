# Design Review — classroom-qr-registration

## 평가

| 차원 | 점수 | 사유 |
|---|---|---|
| 일관성 | 9/10 | 기존 Dashboard/Board 패턴 100% 재사용. 토큰 추가 없음. 카드/모달/테이블 전부 기존 패턴. |
| 계층 | 9/10 | Display → Subtitle → Body → Badge 4단계 명확. 시선 흐름 좌상→우하 일관. |
| 접근성 | 8/10 | focus-visible 재사용, 키보드 nav 명시, 터치 타깃 32px+. 코드 입력 font-size 24px으로 시각 접근성 확보. |
| 감성/톤 | 9/10 | Notion 톤 유지. 학생 대시보드 "안녕, {이름}!" 인사가 초등학생 대상 친근함 제공. |
| AI slop 감지 | 10/10 | placeholder 텍스트 없음. 모든 상태(empty/error)에 실제 한국어 메시지. 무의미한 장식 없음. |
| 반응형 | 8/10 | 기존 3-tier 브레이크포인트 재사용. QR 카드/PDF는 데스크톱 전용 (교사 기기) — 학생 대시보드는 모바일 대응. |

**평균: 8.8/10** — PASS (≥ 8.0)

## 수정 사항

1. **QR 미리보기 크기**: 테이블 48x48px → 40x40px로 축소 (행 높이 밸런스)
2. **텍스트 코드 입력**: letter-spacing 8px → 6px (6자리에 8px이면 너무 넓음)
3. **학생 대시보드 인사**: weight 700 → 600 (친근한 톤에 700은 과도)

→ design_spec.md에 반영 완료.

## 최종 판정

**PASS** — phase7 진행.
