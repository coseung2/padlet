# Diff Summary — classroom-qr-registration

## 데이터 모델
- `Classroom` 모델 추가 (id, name, code, teacherId)
- `Student` 모델 추가 (id, classroomId, name, qrToken, textCode)
- `Board.classroomId` nullable 필드 추가
- `User.classrooms` relation 추가
- 패키지: `qrcode`, `jspdf`, `@types/qrcode` 추가

## 라이브러리
- `student-auth.ts`: HMAC-SHA256 기반 학생 세션 쿠키 관리 (sign/verify/create/get/clear)
- `classroom-utils.ts`: 학급 코드, QR 토큰, 텍스트 코드 생성 유틸

## API (7개 신규)
- `POST/GET /api/classroom`: 학급 CRUD
- `GET/PATCH/DELETE /api/classroom/[id]`: 학급 상세/수정/삭제
- `POST /api/classroom/[id]/students`: 학생 일괄 등록
- `DELETE /api/classroom/[id]/students/[studentId]`: 학생 삭제
- `POST .../reissue`: QR/텍스트코드 재발급
- `POST /api/student/auth`: QR 토큰/텍스트 코드 로그인
- `GET /api/student/me`: 현재 학생 정보 + 보드 목록

## 페이지 (5개 신규)
- `/classroom`: 선생님 학급 목록
- `/classroom/[id]`: 학급 상세 (학생 명단, QR, 보드)
- `/student`: 학생 대시보드
- `/student/login`: 텍스트 코드 로그인
- `/qr/[token]`: QR 랜딩 → 자동 인증 → 리다이렉트

## 컴포넌트 (9개 신규)
- ClassroomList, ClassroomListPage, ClassroomDetail
- CreateClassroomModal, AddStudentsModal
- StudentQRCard, QRPrintSheet
- StudentDashboard, StudentLoginForm

## 기존 파일 수정 (4개)
- Dashboard.tsx: "학급 관리 →" 링크 추가
- CreateBoardModal.tsx: classroomId 선택 드롭다운 추가
- boards/route.ts: classroomId 옵션 추가
- globals.css: classroom.css, student.css import 추가

## 스타일 (2개 신규)
- classroom.css: 학급 관리 UI 전체 스타일
- student.css: 학생 대시보드 + 로그인 스타일
