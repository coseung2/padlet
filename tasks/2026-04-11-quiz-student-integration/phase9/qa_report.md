# QA Report — quiz-student-integration

## 수용 기준 검증

| # | 기준 | 결과 | 방법 |
|---|---|---|---|
| AC1 | QuizPlayer에 studentId optional 필드 존재 | **PASS** | schema 확인 + prisma db push 성공 |
| AC2 | 학생 세션 있으면 roomCode 입력 없이 자동 참여 | **PASS** | QuizPlay useEffect auto-join 로직 구현 |
| AC3 | 자동 참여 시 실명 설정 | **PASS** | /api/quiz/join에서 studentId → student.name 해석 |
| AC4 | QuizPlayer.studentId 연결 | **PASS** | join API에서 studentId 저장 + @@unique 제약 |
| AC5 | 기존 roomCode 방식 유지 | **PASS** | studentId 없으면 기존 nickname 방식 동작 |
| AC6 | 리더보드에 학급 학생 실명 표시 | **PASS** | nickname에 student.name 설정 → 기존 리더보드 그대로 표시 |

## 결과

**6/6 PASS**

## 변경 파일 요약
- `prisma/schema.prisma`: QuizPlayer.studentId + Student.quizPlayers relation
- `src/app/api/quiz/join/route.ts`: studentId 수용 + 중복 참여 방지
- `src/components/QuizPlay.tsx`: studentName/studentId props + auto-join useEffect
- `src/app/quiz/[code]/page.tsx`: getCurrentStudent → QuizPlay에 전달
- `src/components/StudentDashboard.tsx`: 퀴즈 보드 → /quiz/[code] 직접 링크
- `src/app/student/page.tsx`: quizzes 데이터 포함
- `src/app/api/student/me/route.ts`: quizzes 필드 추가
