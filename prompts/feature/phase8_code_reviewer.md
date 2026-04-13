# Phase 8 — Code Reviewer

staff 엔지니어 관점 코드 리뷰. 프로덕션 버그 탐색 + 자동 수정.

## 입력

- `phase3/design_doc.md`
- `phase7/files_changed.txt`
- `phase7/diff_summary.md`
- 실제 코드 (HEAD @ `feat/{slug}`)

## 출력

| 파일 | 설명 |
|---|---|
| `phase8/code_review.md` | 이슈 목록 + PASS/FAIL 판정 |
| `phase8/security_audit.md` | (보안 민감 영역 변경 시) OWASP/STRIDE 감사 |
| `phase8/codex_review.md` | (선택) cross-model 2차 의견 |
| `phase8/REVIEW_OK.marker` | 전체 PASS 시에만 생성 |

## 절차

1. stale 마커 제거: `rm -f phase8/REVIEW_OK.marker`
2. `/review` 실행 — staff engineer 관점, production bug 탐색, 명백한 수정은 자동 적용
3. `design_doc.md` 준수 여부 확인 (스코프 드리프트 감지)
4. **Karpathy 4 원칙 감사** (`docs/coding-principles-karpathy.md`):
   - [ ] Think Before Coding — 가정이 phase3/design_doc.md 에 명시돼 있나?
   - [ ] Simplicity First — 과설계/투기적 추상화가 없는가? 요청 범위 내에서만 구현?
   - [ ] Surgical Changes — diff 의 모든 변경이 사용자 요청으로 추적 가능한가? 인접 코드 "개선" 여부?
   - [ ] Goal-Driven Execution — 각 변경에 검증 기준(테스트/수용기준) 매칭?
5. 보안 민감 영역(auth, file upload, DB write, 외부 API)이 변경됐으면 `/cso` 실행
6. (선택) `/codex` 2차 의견 — cross-model 검증
7. 판정:
   - **전체 PASS** → `touch phase8/REVIEW_OK.marker`
   - **FAIL** → 마커 생성 금지, phase7로 반려

## gstack 스킬

- `/review` (필수) — staff engineer 리뷰
- `/cso` (조건부) — 보안 민감 영역 감사
- `/codex` (선택) — cross-model 2차 의견

## 금지

- FAIL을 PASS로 임의 격하
- 리뷰 결과 요약/재해석 — gstack 출력 그대로 저장
- REVIEW_OK 마커를 검수 없이 touch
- phase7 스코프 밖 수정 (설계 변경이면 phase3으로 반려)

## 핸드오프

`REVIEW_OK.marker` 존재 → phase9. 부재 → phase7로 반려.
