# Research Pack — classroom-qr-registration

## 벤치마크 요약

### 1. ClassDojo (개별 QR 카드)
- 선생님이 학급 생성 → 학생 이름 입력 → "Get Printouts" → PDF에 학생별 QR 카드 출력
- 두 가지 QR: (a) 학급 공유 QR (학생이 이름 목록에서 선택), (b) 개별 QR (직접 로그인)
- 4시간 만료 텍스트 코드도 병행
- 이메일/비밀번호 불필요, K-8 대상
- **장점**: 가장 폭넓은 사용처, 학부모 연동까지 지원
- **단점**: QR 분실 시 선생님이 재발급해야 함

### 2. Seesaw (Home Learning Code)
- 학생별 개별 QR + 16자리 텍스트 코드 (1년 유효)
- 세 가지 모드: 학급 QR (공유 기기), Home Learning Code (1:1), 이메일/SSO (고학년)
- PDF/CSV 다운로드 지원
- **장점**: 모드 분리가 명확, 코드 유효기간 1년으로 긺
- **단점**: 16자리 텍스트 코드는 길어서 수동 입력 불편

### 3. Discovery Education (QR 뱃지)
- "My Classrooms" 에서 학생별 QR 뱃지 생성
- 기존 로그인 방식과 병행 (QR은 추가 옵션)
- **장점**: 기존 계정 체계 유지하면서 QR 추가
- **단점**: QR 전용 모드 아님, 설정 복잡

### 4. Schoology/PowerSchool (초등 전용 QR)
- 초등 모드에서만 QR 로그인 활성화
- 웹/iOS/Android 모두 지원
- **장점**: LMS 통합, 학교 단위 관리
- **단점**: 무거운 시스템, 솔로 프로젝트에 부적합

### 5. Google Classroom (학급 코드)
- 6~8자리 영숫자 코드로 학급 가입
- Google 계정 필수 (초등학생 장벽)
- **장점**: 생태계 통합
- **단점**: QR 미지원, 이메일 필수

### 6. Kahoot (세션 PIN)
- 6~10자리 숫자 PIN + 닉네임, 일회성
- **장점**: 최저 마찰, 즉시 참여
- **단점**: 신원 불명, 세션 종료 시 데이터 소실

## 핵심 UX 패턴 분석

### P1: 개별 QR 카드 (ClassDojo/Seesaw)
가장 적합한 패턴. 교사가 학생 이름만 입력하면 시스템이 UUID 토큰 생성 → QR 인코딩 → PDF 레이아웃. 학생은 스캔만으로 로그인.
- **마찰도**: 최초 1회 (이후 세션 유지)
- **보안**: 토큰 유출 시 재발급 필요 (선생님 조작)
- **기기 의존**: QR 카메라 필요 (대안: 텍스트 코드)

### P2: 학급 코드 (Google Classroom)
학급 단위 접근. 코드 하나로 다수 가입. 개별 신원은 계정으로 구분.
- 우리는 P1과 결합: 학급 코드 = 학급 식별, QR 토큰 = 개별 신원

### P3: 세션 PIN (Kahoot)
라이브 활동 전용. 현재 퀴즈 보드에서 이미 사용 중 (roomCode).
- 2차 task에서 QR 학생과 통합 예정

### P4: PDF 카드 레이아웃
ClassDojo/Seesaw 공통: A4/Letter 1장에 학생 카드 격자 배치 (보통 5열 6행 = 30명). 각 카드에 학생 이름 + QR + 텍스트 코드.
- 절취선 가이드 있으면 교사 편의 향상

## 기술 스택 후보

| 기능 | 라이브러리 | 비고 |
|---|---|---|
| QR 생성 | `qrcode` (npm) | 서버사이드 SVG/PNG, Next.js API route에서 사용 |
| PDF 생성 | `jspdf` 또는 `@react-pdf/renderer` | 클라이언트 사이드 PDF 렌더링 |
| QR 스캔 | `html5-qrcode` 또는 `@yudiel/react-qr-scanner` | 카메라 기반 스캔 |
| 토큰 | `crypto.randomUUID()` | Node.js 내장, 별도 패키지 불필요 |

## 결론

**P1(개별 QR 카드) + P2(학급 코드) 결합**이 최적. ClassDojo/Seesaw 패턴을 참고하되, 우리 프로젝트 규모에 맞게 단순화.
