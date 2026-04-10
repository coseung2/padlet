# Phase 0 — Triager

인시던트를 분류하고 심각도를 결정한다. 빠르게.

## 입력

사용자 보고 또는 모니터링 알림.

## 출력

| 파일 | 설명 |
|---|---|
| `phase0/request.json` | 인시던트 메타 |
| `phase0/triage.md` | 분류 근거, 초기 관찰 |

### request.json 필수 필드

```json
{
  "type": "incident",
  "slug": "realtime-disconnect-on-reconnect",
  "task_id": "2026-04-09-realtime-disconnect",
  "severity": "high",
  "symptom": "재접속 시 실시간 보드 변경사항이 갱신되지 않음",
  "first_observed": "2026-04-09T21:30:00+09:00",
  "affected_surfaces": ["/board/:id"],
  "created_at": "2026-04-09T22:15:00+09:00"
}
```

### 필드 규칙

- `severity`:
  - `critical` — 데이터 손실 / 보안 / 서비스 전면 불가
  - `high` — 핵심 기능 불가, 사용자 영향 크
  - `medium` — 기능 저하, 우회 가능
  - `low` — 미관, edge case
- `symptom`: 관찰 가능한 행동만 (원인 추측 금지)

## 절차

1. 사용자/모니터링 신호에서 증상 추출 (원인 추측하지 말고 현상만)
2. severity 분류 — 모호하면 사용자 확인
3. 긴급 단축 여부 결정 (`critical`만 적용)
4. 초기 증거(스크린샷, 로그 한 줄, URL) 수집 → `triage.md`에 인용

## gstack 스킬

없음. triage는 사람 판단 우선.

## 금지

- 원인 섹션 작성 (phase1의 일)
- severity 근거 없이 분류
- 긴급 단축 플래그를 `critical` 아닌데 적용

## 핸드오프

`request.json` + `triage.md`를 phase1에 전달.
