# Scope Decision — quiz-student-integration

## 1. 선택한 UX 패턴

학급 학생 자동 참여 + 기존 roomCode 병행 (하이브리드).

## 2. MVP 범위

### IN
- QuizPlayer 모델에 `studentId` optional 필드 추가
- 학생 세션이 있으면 퀴즈 참여 시 자동으로 studentId 연결 + 실명 사용
- 학생 대시보드에서 퀴즈 보드 클릭 → 자동 참여 (roomCode 건너뜀)
- 퀴즈 결과(리더보드)에 학생 실명 표시
- 선생님 퀴즈 결과 화면에서 학생 이름으로 성적 조회

### OUT
- 학생별 성적 이력 누적 뷰 (별도 task)
- 퀴즈 생성 시 학급 선택 (이미 Board.classroomId로 연결됨)
- 퀴즈 재응시 제한

## 3. 수용 기준

1. QuizPlayer에 studentId optional 필드가 존재한다
2. student_session 쿠키가 있는 학생이 퀴즈 보드 접근 시 roomCode 입력 없이 자동 참여된다
3. 자동 참여 시 QuizPlayer.nickname에 학생 실명이 설정된다
4. 자동 참여 시 QuizPlayer.studentId에 Student.id가 연결된다
5. 기존 roomCode 방식은 그대로 동작한다 (studentId = null)
6. 리더보드에서 학급 학생은 실명으로 표시된다

## 4. 스코프 결정 모드

Selective Expansion — QuizPlayer 모델 확장 + 참여 플로우 수정.

## 5. 위험 요소

| 리스크 | 완화 |
|---|---|
| 동일 학생 중복 참여 | QuizPlayer에 @@unique([quizId, studentId]) 제약 추가 |
| 비학급 퀴즈 보드 접근 | Board.classroomId 없으면 기존 roomCode 방식 유지 |
| 기존 QuizPlayer 데이터 | studentId nullable이므로 기존 데이터 영향 없음 |
