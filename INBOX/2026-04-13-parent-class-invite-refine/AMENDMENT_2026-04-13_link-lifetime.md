# Amendment — Active 링크 수명 정책 (2026-04-13)

> 본 amendment는 `seed_6d7077aac472` 배송 이후 사용자 사후 확정 사항을 반영. 기존 MANIFEST·seed.yaml·handoff_note.md·decisions.md는 스냅샷으로 보존하고 본 파일로 델타만 추가 고지.

## 트리거

사용자 질문: "지금 승인된 연결은 유지기간이 있는거야?"
→ `revokedReason` enum에 `year_end` 값이 존재하나 **자동 트리거가 미정의**된 구멍 발견.

## 확정 결정 (추가 6건)

| # | 항목 | 확정값 |
|---|---|---|
| **D-51** | active 링크 수명 정책 | **학급(Classroom) 존재 기간과 1:1** — 시간 기반 자동 만료 없음 |
| **D-52** | Classroom 삭제 시 cascade | 해당 학급 학생의 모든 active `ParentChildLink` 일괄 revoke (`status=revoked`, `revokedReason=classroom_deleted`) + `ParentSession` 즉시 차단 |
| **D-53** | `revokedReason` enum 추가 | `classroom_deleted` 신규 값 |
| **D-54** | 학부모 cascade 안내 | `"[Aura-board] 연결된 학급이 종료되어 액세스가 해제되었습니다"` (교사 이름·사유 비노출, D-31 격리 승계) |
| **D-55** | Classroom 삭제 UX | 확인 모달 — "학부모 N명의 액세스를 해제합니다" 경고 + 학급명 재입력 확인 |
| **D-56** | `year_end` Cron | **미구현 확정** (enum 값은 수동 사유로만 존속) |

## 스키마 영향

```prisma
// ParentChildLink.revokedReason
// 기존: "teacher_revoked" | "year_end" | "parent_self_leave" | "rejected_by_teacher" | "auto_expired_pending" | "code_rotated"
// 추가: | "classroom_deleted"
```

## 작업 카드 추가

**PV-17 (신규, 1.5일)** — Classroom 삭제 cascade revoke
- 삭제 확인 모달 (학급명 재입력 + "학부모 N명 액세스 해제" 경고)
- 단일 트랜잭션으로 해당 학급 학생의 전 active `ParentChildLink` revoke (`classroom_deleted`)
- `ParentSession` 즉시 차단
- 학부모 cascade 안내 이메일 (교사 정보 비노출)
- 의존: PV-8, PV-14
- E2E 테스트: cascade 후 학부모 401 확인

## 총 공수

v2 원안 33~34일 → **34.5~35.5일** (+1.5일)

## 수용 기준 추가

- [ ] Classroom 삭제 시 해당 학급 전 active `ParentChildLink` cascade revoke (`classroom_deleted`) + ParentSession 즉시 차단
- [ ] Classroom 삭제 확인 모달에 "학부모 N명 액세스 해제" 경고 + 학급명 재입력 확인 표시
- [ ] Cascade 학부모 안내 이메일에 교사 이름·사유 비노출, 학급명만 포함

## 변경된 ideation 측 원본

- `ideation/plans/parent-viewer-roadmap.md` §1.2 Revoke 표 + Prisma 주석 + §6 작업 카드 + §8 수용 기준 + §11 변경 로그 (amendment 행 추가)
- `ideation/tasks/2026-04-13-parent-class-invite-refine/phase3/decisions.md` §6-A (D-51~56 추가)

## 소비자 지침

- 기존 seed.yaml + handoff_note.md는 스냅샷으로 유지
- 구현 시 본 amendment의 D-51~56을 acceptance_criteria에 추가하여 반영
- PV-17은 PV-8·PV-14 완료 후 착수
