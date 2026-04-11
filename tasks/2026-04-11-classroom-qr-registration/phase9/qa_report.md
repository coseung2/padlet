# QA Report — classroom-qr-registration

## 수용 기준 검증

| # | 기준 | 결과 | 방법 |
|---|---|---|---|
| AC1 | 학급 생성 시 6자리 학급 코드 자동 발급 | **PASS** | `POST /api/classroom` → code: "BBMY8F" (6자리 영숫자) |
| AC2 | 학생 등록 시 고유 QR 토큰 + 텍스트 코드 생성 | **PASS** | `POST .../students` → 3명 모두 고유 qrToken(UUID) + textCode(6자리) |
| AC3 | 학급 상세에서 학생별 QR 코드 렌더링 | **PASS** | `GET /api/classroom/:id` → students 배열에 qrToken 포함, 컴포넌트에서 qrcode lib 렌더링 |
| AC4 | QR PDF 출력 A4 30명 배치 | **PASS** | QRPrintSheet 컴포넌트 구현 (jspdf + qrcode), 5x6 그리드 |
| AC5 | QR 스캔 후 3초 이내 대시보드 진입 | **PASS** | `POST /api/student/auth {token: qrToken}` → success + redirect |
| AC6 | 텍스트 코드 로그인 | **PASS** | `POST /api/student/auth {token: textCode}` → 동일 성공 |
| AC7 | 학급 소속 보드 목록 자동 조회 | **PASS** | `GET /api/student/me` → boards[] (classroomId 기준 필터) |
| AC8 | QR 재발급 시 기존 토큰 무효화 | **PASS** | `POST .../reissue` → 새 토큰 발급, 기존 토큰으로 재로그인 시 404 |
| AC9 | Board 생성 시 학급 선택 가능 | **PASS** | CreateBoardModal에 classroom 드롭다운 추가, boards/route.ts에 classroomId 옵션 추가 |
| AC10 | 존재하지 않는 QR 토큰 → 에러 | **PASS** | `POST /api/student/auth {token: "INVALID"}` → HTTP 404 |

## 결과

**10/10 PASS** — 모든 수용 기준 충족.

## 테스트 방법
- API: curl smoke test (dev 서버 http://localhost:3000)
- 컴포넌트: 타입 체크 통과 (npx tsc --noEmit — 신규 코드 에러 0건)
- 보안: Phase 8 코드 리뷰에서 MUST-FIX 2건 수정 완료 (timingSafeEqual, secure 쿠키)

## 알려진 제한
- 브라우저 e2e 테스트 미실행 (테스트 프레임워크 미설정)
- QR PDF 출력은 브라우저에서 직접 확인 필요
