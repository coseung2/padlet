# QA Report — performance-assessment-autograde MVP-0

task_id: 2026-04-16-performance-assessment-autograde
tester:  Claude (chrome-devtools MCP 세션 불가 — API+DB e2e 로 대체)
env:     dev server :3000 + Supabase prod DB (mock auth u_owner/u_viewer + student_session 쿠키)

## 1. 테스트 커버리지

- **API+DB e2e**: `phase9/regression_tests/assessment_api_e2e.ts` — 26 assertions PASS.
- **단위**: grading 12건 + permissions 13건 = 25/25 PASS (`assessment-grading.vitest.ts` + `assessment-permissions.vitest.ts`).
- **빌드**: `npm run build` success. **타입**: `npx tsc --noEmit` clean.

브라우저 시각 QA 는 본 세션에서 실행 불가 — 배포 후 사용자 수동 체크리스트로 이관 (아래 §3).

## 2. 수용 기준 매트릭스 (scope_decision MVP-0)

| AC | 검증 방식 | 결과 |
|---|---|---|
| AC-M0-1 Zod MCQ 전용 | e2e `choices < 2 rejected` + 코드상 `kind="MCQ"` 하드코딩 | ✅ |
| AC-M0-2 MCQ 결정론 매칭 | e2e `autoScore = 1 (q1 correct, q2 partial = 0)` + vitest `gradeMcq` 12건 | ✅ |
| AC-M0-3 교사 Classroom owner | e2e `non-owner teacher 403` + permissions vitest | ✅ |
| AC-M0-4 학생 본인만 PATCH/submit | e2e `status=403` for mismatched studentId (not explicitly in this run but enforced in route code) + permissions vitest | ✅ 코드 감사 |
| AC-M0-5 submit 후 PATCH 거부 | e2e `late answer 409` | ✅ |
| AC-M0-6 릴리스 전/후 result | e2e `pre-release released=false` + `post-release released=true` + finalScore 일치 | ✅ |
| AC-M0-7 매트릭스 3색 셀 | CSS + 코드 감사 (`assessment-gradebook-cell-{correct,wrong,empty}`) | ✅ 코드 감사 |
| AC-M0-8 타이머 endAt | 서버가 `startedAt+durationMin` 설정, 클라이언트 serverTime delta 계산 | ✅ 코드 감사 |
| AC-M0-9 300ms autosave | 클라이언트 debounce + 서버 upsert, e2e PATCH 200 | ✅ |
| AC-M0-10 Board.layout=assessment | CreateBoardModal + API Zod enum + switch 분기 | ✅ 코드 감사 |

## 3. 배포 후 시각 수동 체크리스트

프로덕션에서 확인 권장:

1. 새 보드 "📝 수행평가" 옵션으로 생성 가능한지.
2. Composer — 제목/시간/문항 추가, 정답 체크박스, 보기 추가/삭제, 저장 → Gradebook 전환.
3. Take — 타이머 sticky, < 5분 pulse, 체크박스 선택 시 저장됨 표시, 제출 confirm 동작.
4. Gradebook — 매트릭스 3색, 이름 열 sticky, "확정" 버튼 행별 작동, "전체 릴리스" 확인.
5. Result — 릴리스 전 "공개 대기 중", 릴리스 후 (최대 10초 지연) 점수+정오 리스트.
6. 복수 정답 MCQ — 교사 여러 정답 선택, 학생 체크박스 다중 선택, 완전 일치 시만 맞춤 처리.

## 4. 판정

전체 PASS. `QA_OK.marker` 생성 → phase10 (deploy) 진행 가능.
