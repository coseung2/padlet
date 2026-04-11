# Design Doc — classroom-qr-registration

## 1. 데이터 모델 변경

### 신규 모델

```prisma
model Classroom {
  id        String   @id @default(cuid())
  name      String                          // "3학년 2반"
  code      String   @unique                // 6자리 영숫자 (교사 공유용)
  teacherId String                          // User.id (선생님)
  createdAt DateTime @default(now())

  teacher   User       @relation(fields: [teacherId], references: [id])
  students  Student[]
  boards    Board[]    @relation("ClassroomBoards")

  @@index([teacherId])
  @@index([code])
}

model Student {
  id          String   @id @default(cuid())
  classroomId String
  name        String                        // 학생 이름
  qrToken     String   @unique              // UUID — QR 인코딩 대상
  textCode    String   @unique              // 6자리 영숫자 (수동 입력용)
  createdAt   DateTime @default(now())

  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)

  @@index([classroomId])
  @@index([qrToken])
  @@index([textCode])
}
```

### 기존 모델 수정

```prisma
model Board {
  // 기존 필드 유지
  classroomId String?                       // 신규 — 학급 소속 (nullable)
  classroom   Classroom? @relation("ClassroomBoards", fields: [classroomId], references: [id], onDelete: SetNull)
}

model User {
  // 기존 필드 유지
  classrooms  Classroom[]                   // 신규 — 선생님이 관리하는 학급들
}
```

### 마이그레이션 전략
- `prisma db push` (SQLite dev 환경, 비파괴적 추가)
- Board.classroomId는 nullable → 기존 보드 영향 없음
- Student 모델은 User와 완전 분리 (OAuth/세션 체계 독립)

## 2. API 변경

### 신규 엔드포인트

| Method | Path | 요청 | 응답 | 인증 |
|---|---|---|---|---|
| POST | `/api/classroom` | `{ name }` | `{ id, name, code }` | NextAuth (선생님) |
| GET | `/api/classroom` | — | `Classroom[]` (내 학급) | NextAuth |
| GET | `/api/classroom/[id]` | — | `{ ...classroom, students[] }` | NextAuth (소유자) |
| PATCH | `/api/classroom/[id]` | `{ name }` | `{ id, name }` | NextAuth (소유자) |
| DELETE | `/api/classroom/[id]` | — | `204` | NextAuth (소유자) |
| POST | `/api/classroom/[id]/students` | `{ names: string[] }` | `Student[]` (토큰 포함) | NextAuth (소유자) |
| DELETE | `/api/classroom/[id]/students/[studentId]` | — | `204` | NextAuth (소유자) |
| POST | `/api/classroom/[id]/students/[studentId]/reissue` | — | `{ qrToken, textCode }` | NextAuth (소유자) |
| POST | `/api/student/auth` | `{ token }` (QR 토큰 또는 텍스트 코드) | `Set-Cookie: student_session` + redirect | 없음 (공개) |
| GET | `/api/student/me` | — | `{ id, name, classroom, boards[] }` | student_session 쿠키 |

### 학생 인증 플로우 (NextAuth와 별도)
```
QR 스캔 → GET /qr/[token] (Next.js page)
  → POST /api/student/auth { token }
  → DB에서 Student 조회 (qrToken 또는 textCode)
  → 없으면 404 에러 페이지
  → 있으면 student_session 쿠키 설정 (HttpOnly, SameSite=Lax, 30일)
  → 쿠키 값: 서명된 JSON { studentId, classroomId, exp }
  → redirect → /student
```

### 쿠키 서명
- `AUTH_SECRET` 환경변수 (NextAuth와 공유) + HMAC-SHA256
- `src/lib/student-auth.ts`에 `signStudentToken()` / `verifyStudentToken()` 구현

## 3. 컴포넌트 변경

### 신규 페이지

```
src/app/
├── classroom/
│   └── page.tsx              # 선생님 학급 목록 (Server Component)
├── classroom/[id]/
│   └── page.tsx              # 학급 상세: 학생 명단 + QR 카드 (Server + Client)
├── student/
│   └── page.tsx              # 학생 대시보드: 소속 보드 목록 (Server Component)
├── qr/[token]/
│   └── page.tsx              # QR 랜딩: 인증 처리 + 리다이렉트 (Server Component)
└── student/login/
    └── page.tsx              # 텍스트 코드 입력 폼 (Client Component)
```

### 신규 컴포넌트

```
src/components/
├── ClassroomList.tsx          # 학급 카드 그리드 (선생님 대시보드)
├── ClassroomDetail.tsx        # 학생 명단 테이블 + 추가/삭제/재발급
├── StudentQRCard.tsx          # 개별 학생 QR 카드 (이름 + QR + 텍스트코드)
├── QRPrintSheet.tsx           # A4 PDF 출력용 QR 카드 격자 (Client)
├── AddStudentsModal.tsx       # 학생 이름 일괄 입력 모달
├── StudentDashboard.tsx       # 학생용 보드 목록
├── StudentLoginForm.tsx       # 텍스트 코드 수동 입력 폼
└── CreateClassroomModal.tsx   # 학급 생성 모달
```

### 기존 컴포넌트 수정

```
src/components/
├── Dashboard.tsx              # 학급 관리 링크 추가 (선생님 뷰)
├── CreateBoardModal.tsx       # classroomId 선택 드롭다운 추가
```

### 상태 위치

| 데이터 | 위치 | 이유 |
|---|---|---|
| 학급 목록 | Server (RSC) | 정적 CRUD, 실시간 불필요 |
| 학생 명단 | Server (RSC) | 동일 |
| QR 렌더링 | Client | `qrcode` 라이브러리 canvas/SVG 렌더링 |
| PDF 생성 | Client | `jspdf` 클라이언트 사이드 |
| 학생 세션 | Cookie | HttpOnly, 서버에서 검증 |

## 4. 데이터 흐름 다이어그램

### 선생님: 학급 생성 + 학생 등록
```
[선생님 브라우저]
  │ POST /api/classroom { name: "3학년 2반" }
  ├──→ [API Route]
  │      ├── NextAuth 세션 확인
  │      ├── 6자리 코드 생성 (충돌 체크 루프)
  │      └── Classroom INSERT → DB
  │
  │ POST /api/classroom/[id]/students { names: ["김철수", "이영희", ...] }
  ├──→ [API Route]
  │      ├── 소유권 확인 (teacherId == session.user.id)
  │      ├── 학생마다: UUID qrToken + 6자리 textCode 생성
  │      └── Student BULK INSERT → DB
  │
  │ [ClassroomDetail 페이지]
  │      ├── StudentQRCard × N (qrcode 라이브러리로 SVG 렌더)
  │      └── "QR 출력" 버튼 → QRPrintSheet → jspdf → PDF 다운로드
  ▼
[프린터] → A4 용지에 QR 카드 격자
```

### 학생: QR 스캔 → 대시보드
```
[학생 기기]
  │ 카메라로 QR 스캔 → URL: /qr/{qrToken}
  ├──→ [/qr/[token] 페이지 — Server Component]
  │      ├── POST /api/student/auth { token: qrToken }
  │      ├── DB에서 Student 조회 (qrToken match)
  │      ├── 없으면 → 에러 페이지 ("유효하지 않은 QR")
  │      ├── 있으면 → student_session 쿠키 설정
  │      └── redirect → /student
  │
  ├──→ [/student 페이지 — Server Component]
  │      ├── student_session 쿠키에서 studentId 추출
  │      ├── Student → Classroom → Boards 조회
  │      └── 보드 목록 렌더링 (StudentDashboard)
  ▼
[학생: 보드 클릭 → /board/[id] 진입]
```

## 5. 엣지케이스 (7개)

| # | 케이스 | 처리 |
|---|---|---|
| 1 | QR 토큰 유출 (다른 학생이 스캔) | 선생님이 "재발급" → 기존 토큰 무효화 + 새 토큰 생성 |
| 2 | 학급 코드 충돌 | 생성 시 `while` 루프로 유니크 확인 (6자리 영숫자 = 2.1B 조합, 충돌 확률 극히 낮음) |
| 3 | 학생 이름 중복 (같은 반 동명이인) | 허용. Student.id로 구분. UI에 번호 표시 |
| 4 | 만료/삭제된 QR로 접근 | `/api/student/auth`에서 404 → 에러 페이지 + "선생님에게 문의" 안내 |
| 5 | 선생님이 학급 삭제 시 학생 데이터 | `onDelete: Cascade` → Student 레코드 자동 삭제, 쿠키는 만료 안 됨 → 다음 접근 시 404 |
| 6 | Board에 classroomId 설정 후 학급 삭제 | `onDelete: SetNull` → Board.classroomId = null, 보드는 남지만 학급 접근 해제 |
| 7 | 학생 30명 초과 시 PDF | 30명씩 페이지 분할. jspdf `addPage()` |

## 6. DX 영향

- **패키지 추가**: `qrcode` (QR 생성), `jspdf` (PDF), `html5-qrcode` (QR 스캔 — 학생 로그인 페이지)
- **타입**: `src/types/student.ts`에 Student/Classroom 타입 추가
- **린트/빌드**: 기존 설정 변경 없음
- **환경변수**: 추가 없음 (`AUTH_SECRET` 재사용)
- **DB**: `prisma db push`로 테이블 추가 (기존 데이터 영향 없음)
- **시드**: `prisma/seed.ts`에 테스트 학급 + 학생 3명 추가

## 7. 롤백 계획

1. 브랜치 `feat/classroom-qr-registration`에서 작업 → main에 PR 머지
2. 롤백 시: `git revert <merge_commit>` → `prisma db push` (Classroom, Student 테이블 잔존하나 무해)
3. Board.classroomId nullable이므로 기존 보드 기능에 영향 없음
4. student_session 쿠키는 NextAuth 세션과 독립 → 롤백 시 쿠키 무시됨 (검증 실패 → 자연 만료)
