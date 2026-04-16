# phase3 API Contract Amendment v2 — (no delta)

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **base**: `phase3/api_contract.json` (2026-04-13) + `phase3_amendment/architecture_amendment.md` (`maskedName` → `name` 응답 필드 교체)

## 판정

**phase5 산출물은 신규/수정 엔드포인트·요청·응답 시그니처·에러 코드·실시간 이벤트를 도입하지 않았다.** 따라서 api_contract 에 delta 가 없다.

## 확인 근거

| phase5 산출 | API 계약 영향 |
|---|---|
| `design_spec.md §2` UI 상태 | 기존 phase3 엔드포인트(signup / session/status / match/* / approvals/* / class-invite-codes/* / cron) 의 응답 페이로드만 소비 — 신규 필드 요구 없음 |
| `design_spec.md §2.1.1~2.1.5` 교사 화면 | 기존 `/api/class-invite-codes`, `/api/parent/approvals/*`, `DELETE /api/classrooms/[id]` 사용 |
| `design_spec.md §2.2.1~2.2.7` 학부모 온보딩 6페이지 | 기존 `/api/parent/signup`, `/api/parent/session/status`, `/api/parent/match/*` 사용 |
| `design_spec.md §2.3` 이메일 9종 | 기존 phase3 `email_templates` 9종 목록과 1:1 일치 |
| `user_decisions.md` 전체 | 엔드포인트/필드/에러 코드 결정 없음 |
| `tokens_patch.json` | API 계약 무관 |

## 이전 amendment 와의 누적 관계

- `phase3_amendment/architecture_amendment.md` 는 응답 필드 `maskedName` → `name` 교체를 확정. 본 amendment 는 그 위에 **추가 delta 없음**.

## phase7 coder 가 사용할 api_contract 합성 순서

1. `phase3/api_contract.json` (2026-04-13 원본)
2. `phase3_amendment/architecture_amendment.md` `§api_contract` (필드명 `maskedName` → `name` 일괄 교체)
3. (본 문서) 추가 delta 없음

**판정: no delta.**
