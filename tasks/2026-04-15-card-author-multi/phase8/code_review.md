# Phase 8 — Code Review · card-author-multi

## 재검증
- tsc ✅ / vitest 54/54 ✅ / build ✅ / migration applied ✅

## phase2 scope 대비 결과
| 항목 | 상태 |
|---|---|
| IN-D1~4 schema + migration + backfill | ✅ |
| IN-L1 formatAuthorList | ✅ + 10 tests |
| IN-L2 setCardAuthors | ✅ + 11 tests |
| IN-A1 PUT authors | ✅ |
| IN-A2 POST /api/cards 자동 seed | ✅ |
| IN-A3 POST /api/external/cards 자동 seed | ✅ |
| IN-A4 POST /api/boards assignment seed | ✅ |
| IN-A5 GET classroom students | ✅ |
| IN-P1~3 page.tsx + cardProps + CardData | ✅ |
| IN-U1 CardAuthorFooter 다중 이름 | ✅ |
| IN-U2 CardAuthorEditor | ✅ |
| IN-U3 4 board context menu/modal | ✅ (column은 context menu + modal, freeform/grid/stream은 modal-내부 버튼) |
| IN-U4 CardDetailModal 버튼 | ✅ |
| IN-R1 canEditCard primary 기준 보존 | ✅ (role-cleanup primitive 미변경) |
| IN-R2 PUT teacher-only | ✅ (identity.kind + ownsBoard 이중 검증) |
| IN-T1~T2 tests | ✅ 21 new |

**19/19 PASS**.

## Karpathy 감사
전부 통과 — phase1~3 근거 연결이 타이트함. 특히:
- Simplicity: Card 필드 유지로 기존 callsite 수정 불필요 (primary mirror 전략).
- Surgical: parent-scope 미수정 (phase2 OUT 준수), requirePermission 경로 미수정.
- Think-before: α(comma)/β(join) 비교 후 β 선택 근거 명시.

## Security 감사
- PUT 교사 전용 이중 가드 (`identity.kind !== "teacher" || !ownsBoardIds` 체크 + canEditCard).
- 학생 identity 로는 studentAuthorId / externalAuthorName 변경 불가 (role-cleanup에서 PATCH /api/cards/[id] 에 이미 drop 로직 존재).
- setCardAuthors 의 classroom membership guard — 교사가 다른 반 학생을 작성자로 박는 저어림 방지.
- @@unique 로 DB-level dup 방지.

## 발견된 이슈
**없음**. 자동 수정 라운드 skip.

## 판정
**PASS** — REVIEW_OK.
