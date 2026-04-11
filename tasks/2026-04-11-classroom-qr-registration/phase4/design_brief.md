# Design Brief — classroom-qr-registration

## 1. 화면/상태 목록

### A. 학급 목록 (`/classroom`) — 선생님 전용

| 상태 | 보여야 할 정보 | 행동 |
|---|---|---|
| empty | "아직 학급이 없습니다" + 생성 CTA | "학급 만들기" 버튼 → CreateClassroomModal |
| loading | 스켈레톤 카드 3개 | — |
| ready | 학급 카드 그리드 (이름, 코드, 학생 수, 보드 수) | 카드 클릭 → 학급 상세 |
| error | "학급을 불러올 수 없습니다" + 재시도 | 재시도 버튼 |

### B. 학급 상세 (`/classroom/[id]`) — 선생님 전용

| 상태 | 보여야 할 정보 | 행동 |
|---|---|---|
| empty (학생 0명) | 학급 헤더(이름, 코드) + "학생을 추가하세요" CTA | "학생 추가" 버튼 → AddStudentsModal |
| ready | 학급 헤더 + 학생 테이블(이름, QR 미리보기, 텍스트코드, 등록일) + 연결 보드 목록 | 행 hover → 재발급/삭제 아이콘 |
| loading | 스켈레톤 테이블 | — |
| error | 에러 메시지 | 재시도 |

**QR 출력 영역**: 상단에 "QR 카드 출력" 버튼. 클릭 시 jspdf로 PDF 생성 → 다운로드.

### C. 학생 대시보드 (`/student`) — 학생 전용

| 상태 | 보여야 할 정보 | 행동 |
|---|---|---|
| empty (보드 0개) | "아직 보드가 없습니다" + 학급 이름 | 대기 |
| ready | 인사 헤더 ("안녕, {이름}!") + 보드 카드 그리드 | 카드 클릭 → /board/[id] |
| loading | 스켈레톤 3개 | — |
| error | 에러 + "선생님에게 문의" | — |
| expired_session | "다시 로그인해주세요" + 텍스트 코드 입력 폼 | 코드 입력 → 재인증 |

### D. QR 랜딩 (`/qr/[token]`)

| 상태 | 보여야 할 정보 | 행동 |
|---|---|---|
| processing | 로딩 스피너 + "로그인 중..." | 자동 인증 → 리다이렉트 |
| success | — (즉시 /student로 리다이렉트) | — |
| invalid_token | "유효하지 않은 QR 코드입니다" + 텍스트 코드 입력 대안 | 코드 입력 폼 |

### E. 텍스트 코드 로그인 (`/student/login`)

| 상태 | 보여야 할 정보 | 행동 |
|---|---|---|
| ready | 6자리 코드 입력 필드 + "로그인" 버튼 | 입력 → 인증 |
| loading | 버튼 로딩 상태 | — |
| error | "코드가 맞지 않습니다" 인라인 에러 | 재입력 |
| success | — (리다이렉트) | — |

### F. 학급 생성 모달 (CreateClassroomModal)

| 상태 | 내용 |
|---|---|
| ready | 학급 이름 입력 + "만들기" 버튼 |
| loading | 버튼 disabled + 스피너 |
| success | 모달 닫힘 → 목록 갱신 |
| error | 인라인 에러 메시지 |

### G. 학생 추가 모달 (AddStudentsModal)

| 상태 | 내용 |
|---|---|
| ready | 텍스트에어리어 (줄바꿈으로 이름 구분) + "추가" 버튼 |
| loading | 버튼 disabled |
| success | 모달 닫힘 → 명단 갱신 |
| error | 인라인 에러 |

## 2. 정보 계층

### 학급 목록 페이지
1. **학급 이름** (Display, 가장 눈에 띄게)
2. 학급 코드 + 학생 수 (Badge)
3. 보드 수 (Secondary)

### 학급 상세 페이지
1. **학급 이름 + 코드** (헤더, 코드는 복사 가능)
2. **학생 테이블** (메인 콘텐츠)
3. QR 출력 CTA / 학생 추가 CTA (우측 상단)
4. 연결 보드 목록 (하단 섹션)

### 학생 대시보드
1. **인사 ("안녕, {이름}!")** + 학급 이름 (정서적 연결)
2. **보드 카드 그리드** (메인 콘텐츠, 기존 Dashboard와 동일 패턴)

### 시선 흐름
- 좌상단 → 우측 (이름/헤더) → 아래 (콘텐츠) → 우하단 (CTA)
- 학생 대시보드는 초등학생 대상이므로 큰 카드 + 여유로운 간격

## 3. 인터랙션 명세

| 사용자 행동 | 시스템 반응 |
|---|---|
| 학급 카드 hover | `--shadow-card-hover` + `--color-border-hover` |
| 학급 카드 클릭 | `/classroom/[id]`로 이동 |
| "학급 만들기" 클릭 | CreateClassroomModal 열림 (modalIn 애니메이션) |
| 학급 이름 입력 후 "만들기" | 버튼 로딩 → 목록에 카드 추가 (optimistic 아님, 서버 응답 후) |
| "학생 추가" 클릭 | AddStudentsModal 열림 |
| 이름 여러 줄 입력 후 "추가" | 줄바꿈 split → 빈 줄 제거 → POST → 테이블에 행 추가 |
| 학생 행 hover | 재발급/삭제 아이콘 표시 (기존 카드 delete 패턴) |
| "재발급" 클릭 | confirm 다이얼로그 → POST reissue → 새 QR/코드 즉시 반영 |
| "삭제" 클릭 | confirm 다이얼로그 → DELETE → 행 제거 |
| "QR 출력" 클릭 | jspdf 렌더링 → PDF 자동 다운로드 |
| QR 코드 hover (개별 카드) | 확대 미리보기 (scale 1.5, tooltip) |
| 학급 코드 클릭 | 클립보드 복사 + "복사됨" 토스트 (2초) |
| 학생 QR 스캔 | /qr/[token] 진입 → 자동 인증 → /student 리다이렉트 |
| 텍스트 코드 입력 | 6자리 완성 시 자동 submit (autofocus, 대문자 변환) |

## 4. 접근성 요구

1. **키보드 네비게이션**: 학급 카드/학생 행은 Tab으로 이동, Enter로 선택. 모달은 Esc로 닫힘. 포커스 트랩 (모달 내).
2. **스크린리더**: 학급 카드 `aria-label="학급 {이름}, 학생 {N}명"`. QR 이미지 `alt="학생 {이름} QR 코드"`. 모달 `role="dialog" aria-modal="true"`.
3. **명도 대비**: 디자인 시스템 기준 준수 (Primary ~18:1, Secondary ~5.5:1). 텍스트 코드 입력 필드는 `--color-accent` focus border.
4. **터치 타깃**: 모바일에서 학생 행의 재발급/삭제 버튼 최소 32px. 학생 대시보드 보드 카드 최소 48px 높이.
5. **코드 입력 UX**: `inputmode="text"` + `autocomplete="off"` + 대문자 자동 변환. 시각장애 학생 대비 텍스트 코드 크기 18px.

## 5. 디자인 시스템 확장 여부

### 기존 토큰으로 충분한 부분
- 카드 패턴: `--color-surface` + `--border-card` + `--shadow-card` → 학급 카드, 보드 카드
- 모달 패턴: 기존 AddCardModal과 동일 구조
- 뱃지: `--color-accent-tinted-bg/text` → 학급 코드, 학생 수 뱃지
- 버튼: 기존 Primary/Secondary/Destructive 패턴
- 테이블: 기존 Assignment 테이블 스타일 재사용

### 신규 필요

| 항목 | 이유 |
|---|---|
| `.qr-card` 컴포넌트 스타일 | QR 코드 + 이름 + 텍스트코드 조합. 기존에 없는 형태 |
| `.qr-print-grid` 인쇄 스타일 | `@media print` + PDF 레이아웃. 기존에 인쇄 스타일 없음 |
| `.student-greeting` 타이포 | 학생 대시보드 인사 (Display 26px 재사용 가능하나 톤이 다름 — 더 친근한 weight 500 고려) |
| `src/styles/classroom.css` | 학급 관련 스타일 파일 (디자인 시스템 규칙: 신규 보드/탭 → 신규 CSS 파일) |
| `src/styles/student.css` | 학생 대시보드 스타일 |

**토큰 추가 없음** — 기존 base.css 토큰으로 커버. 신규 CSS 클래스만 추가.
