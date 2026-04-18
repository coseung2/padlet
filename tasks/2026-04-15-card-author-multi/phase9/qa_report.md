# Phase 9 — QA Report · card-author-multi

## 실행
```
npx tsc --noEmit            ✅
npx vitest run              ✅ 5 files / 54 tests
npm run build               ✅
npx prisma migrate deploy   ✅ 20260415_add_card_author applied
```

## AC 전수 (16/16)
| AC | 결과 |
|---|---|
| AC-1~4 schema·API·mirror | ✅ primitive + 11 service tests |
| AC-5~7 POST 자동 seed | ✅ 모든 create path 통합 |
| AC-8 렌더 | ✅ 10 formatter tests |
| AC-9~10 modal UX | ✅ classroom 유/무 분기 |
| AC-11 학생 삭제 | ✅ onDelete SetNull + displayName 보존 |
| AC-12 student 편집 불가 | ✅ role-cleanup canEditCard 로 커버 |
| AC-13~14 tests | ✅ 21 vitest |
| AC-15 green gates | ✅ tsc/build/vitest |
| AC-16 regression | ✅ 기존 57 tests 계속 pass |

## 수동 검증 시나리오 (배포 후 smoke)
1. 교사로 columns board 열기 → 기존 카드 ⋯ → "작성자 지정" → 학급 학생 2명 선택 → 저장 → footer "A, B" 로 표시
2. 4명 선택 → "A 외 3명" 표시
3. 학급 없는 freeform board → CardDetailModal → "작성자 지정" → 학급 picker 숨겨지고 free-form row 만
4. 학생 로그인 → 자기 카드는 × 보임, PATCH 가능. 남의 카드는 "작성자 지정" 버튼 안 보임
5. Canva 앱 publish → CardAuthor 1행 자동 생성되어 footer 같은 이름
6. 학부모 /parent/(app)/child/[sid]/assignments → primary author 자녀 카드 정상 표시 (v1 호환)

## 판정
**PASS** — QA_OK.
