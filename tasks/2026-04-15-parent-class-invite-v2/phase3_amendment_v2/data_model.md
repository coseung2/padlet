# phase3 Data Model Amendment v2 — (no delta)

- **task_id**: `2026-04-15-parent-class-invite-v2`
- **작성일**: 2026-04-14
- **base**: `phase3/data_model.md` (2026-04-13) + `phase3_amendment/architecture_amendment.md` (`maskedName` 가상 필드 삭제)

## 판정

**phase5 산출물은 신규/수정 테이블 · 컬럼 · enum · index 를 도입하지 않았다.** 따라서 data_model 에 delta 가 없다.

## 확인 근거

| phase5 산출 | data_model 영향 |
|---|---|
| `design_spec.md §2` 화면 상태별 UI | 없음 — 순수 프론트엔드 렌더 계약 |
| `design_spec.md §3.2` 신규 토큰 2종 | CSS 토큰, DB 무관 |
| `design_spec.md §4.1` 신규 컴포넌트 10종 | UI 계층, DB 무관 |
| `design_decisions.md §5` 이름 노출 원본 | 기존 2026-04-13 amendment 에서 `maskedName` 가상 필드 삭제 완료. 추가 delta 없음. |
| `user_decisions.md` Lane B #4~#6 | 토큰·컴포넌트 경로 결정, DB 무관 |
| `tokens_patch.json` | CSS 토큰, DB 무관 |

## phase7 coder 가 사용할 data_model 합성 순서

1. `phase3/data_model.md` (2026-04-13 원본)
2. `phase3_amendment/architecture_amendment.md` `§data_model` (maskedName 가상 필드 삭제)
3. (본 문서) 추가 delta 없음

Prisma schema · migration SQL · enum 정의는 phase3 원본에서 그대로 구현.

**판정: no delta.**
