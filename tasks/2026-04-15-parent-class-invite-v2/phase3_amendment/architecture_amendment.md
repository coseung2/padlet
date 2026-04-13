# phase3 Architecture Amendment — 마스킹 제거

작성일: 2026-04-13
task_id: 2026-04-15-parent-class-invite-v2
근거: `phase9_user_review/decisions.md` #1

## 변경 요지

**이름 마스킹 규칙 전면 제거.** 학부모/교사가 보는 모든 자녀·급우·학부모 이름은 **원본 그대로** 표시한다.

## architecture.md 수정 사항

### §8.5 "이름 마스킹 규칙" — 섹션 전체 **DELETE**

기존 내용 (삭제):
- "김O민" 마스킹 포맷 (성 + O × N-2 + 끝 글자)
- 2자 이름 edge ("이민" → 원본 유지)
- 1자 이름 edge (원본 유지)
- 복성 whitelist ("황보라", "선우민")

### §4 data_model — `maskedName` 가상 필드 **삭제**

- `Student.name` 은 DB 그대로 노출
- `Parent.name` 도 동일

### §10 보안 — 마스킹 관련 항목 **삭제**

- "학부모 UI 에 마스킹 적용" 조항 제거
- 교사 UI 와 동일한 노출 레벨

## API 계약 수정 사항 (api_contract.json)

모든 응답에서 `maskedName` 필드 → `name` 으로 교체:
- `GET /api/parent/children` : `children[].name`
- `GET /api/parent/me/status` : `childName`
- `GET /api/classroom/[id]/parent-access/approvals` : `requesterName`, `childName`
- `GET /api/classroom/[id]/parent-access/linked` : `parentName`, `childName`

## AC 수정 사항 (scope_decision.md)

### A-12 "이름 마스킹 표시" — **DELETE** (AC 자체 제거)

대체 AC 불필요. "이름은 원본 그대로 표시" 는 기본 동작이라 별도 AC 불필요.

총 AC 수: 29 → **28**

## 구현 영향

- `src/lib/mask-name.ts` : **생성 취소** (phase7 coder 작업 목록에서 제거)
- `maskName()` 호출부 없음 (애초에 구현 전)
- UI 문구 수정: design_brief.md 에서 별도 반영

## 후속 phase 동기화

- [x] `phase9/test_plan.md` — A-12 test case (U1~U8, I-*, E-*) 삭제, §6.3 핫스팟 항목 제거
- [x] `phase4/design_brief.md` — "자녀 maskedName" → "자녀 이름", 마스킹 표시 행동 제거
- [ ] `phase2/scope_decision.md` (존재 시) — A-12 제거, AC 카운트 29 → 28
- [ ] `phase3/api_contract.json` (존재 시) — maskedName → name
