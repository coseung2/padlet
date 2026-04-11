# Design Spec — classroom-qr-registration

## 1. 선택된 변형

`mockups/v2` (페이지 분리 + 카드 그리드). 기존 Dashboard 패턴 완전 재사용.

선택 사유: 앱 전체의 네비게이션 모델(카드 그리드 → 상세 페이지)과 일치. 디자인 시스템 토큰 추가 없이 구현 가능. 학생 대시보드도 동일 구조로 통일.

## 2. 화면 상태별 최종 디자인

### 학급 목록 (`/classroom`)
- **헤더**: 좌측 "내 학급" (Display 26px/700), 우측 "+ 학급 만들기" (Primary 버튼)
- **empty**: 중앙 "아직 학급이 없습니다" (text-muted, 15px) + CTA 버튼
- **ready**: 카드 그리드 (grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)), gap 20px)
  - 카드: surface + border-card + shadow-card + radius-card
  - 카드 내부: 학급 이름 (Subtitle 16px/700), 학급 코드 뱃지 (accent-tinted), 학생 수 (text-muted)
  - hover: shadow-card-hover + border-hover

### 학급 상세 (`/classroom/[id]`)
- **헤더**: 학급 이름 (Display 26px/700, EditableTitle 재사용) + 학급 코드 뱃지 (클릭 → 복사)
- **액션 바**: "학생 추가" (Secondary 버튼) + "QR 카드 출력" (Primary 버튼)
- **학생 테이블**: assignment.css 테이블 패턴 재사용
  - 컬럼: #, 이름, QR 미리보기 (48x48px), 텍스트 코드, 등록일, 액션
  - 행 hover: bg rgba(0,0,0,0.02) + 재발급/삭제 아이콘 표시
  - 빈 상태: "학생을 추가하세요"
- **연결 보드 섹션**: 하단, "연결된 보드" 소제목 + 보드 카드 (기존 Dashboard 카드와 동일)

### 학생 대시보드 (`/student`)
- **헤더**: "안녕, {이름}!" (Display 26px/700) + 학급 이름 뱃지
- **보드 그리드**: 기존 Dashboard 카드 그리드와 동일 패턴
- **empty**: "아직 보드가 없습니다" (text-muted)
- **세션 만료**: 텍스트 코드 입력 폼으로 전환

### QR 랜딩 (`/qr/[token]`)
- 중앙 정렬, 로딩 스피너 + "로그인 중..." (text-muted)
- 성공: 즉시 리다이렉트 (화면 전환 없음)
- 실패: 에러 아이콘 + "유효하지 않은 QR" + 텍스트 코드 입력 폼

### 텍스트 코드 로그인 (`/student/login`)
- 중앙 카드 (모달 스타일, max-width 400px)
- 제목: "학생 로그인" (Title 20px/700)
- 6자리 코드 입력 (font-size 24px, letter-spacing 8px, 중앙 정렬)
- "로그인" Primary 버튼
- 에러: 입력 아래 인라인 (color: #c62828)

### QR 카드 (개별)
- 카드 크기: 180px × 220px
- 상단: QR 코드 (120x120px)
- 하단: 학생 이름 (14px/700), 텍스트 코드 (12px/600, monospace)
- 배경: white, 보더: 1px solid #ddd (인쇄 최적화)

### QR 출력 PDF
- A4 세로 (210 × 297mm)
- 마진: 10mm
- 5열 × 6행 = 30명/페이지
- 카드 간 간격: 2mm
- 상단: 학급 이름 + 날짜
- 페이지 번호: 하단 중앙

## 3. 사용된 토큰

### 기존 토큰 (전부 재사용)
| 토큰 | 용도 |
|---|---|
| `--color-surface` | 카드/모달/테이블 배경 |
| `--color-bg` | 페이지 배경 |
| `--color-text` | 학급 이름, 학생 이름 |
| `--color-text-muted` | 설명, 등록일, empty 상태 텍스트 |
| `--color-accent` | CTA 버튼, 코드 입력 focus |
| `--color-accent-tinted-bg/text` | 학급 코드 뱃지, 학생 수 뱃지 |
| `--border-card` | 카드/테이블 보더 |
| `--shadow-card` / `--shadow-card-hover` | 카드 기본/hover |
| `--radius-card` | 카드, 모달 |
| `--radius-btn` | 버튼 |
| `--radius-pill` | 뱃지 |

### 신규 토큰
**없음.** 기존 토큰으로 전체 커버.

## 4. 컴포넌트 목록

### 신규
| 컴포넌트 | 유형 | 비고 |
|---|---|---|
| ClassroomList | Server → Client | 기존 Dashboard 패턴 복제 |
| ClassroomDetail | Server → Client | 테이블 + 액션바 |
| StudentQRCard | Client | QR 렌더링 (qrcode 라이브러리) |
| QRPrintSheet | Client | PDF 생성 (jspdf) |
| AddStudentsModal | Client | 기존 AddCardModal 패턴 복제 |
| CreateClassroomModal | Client | 기존 CreateBoardModal 패턴 복제 |
| StudentDashboard | Server → Client | 기존 Dashboard 패턴 복제 |
| StudentLoginForm | Client | 코드 입력 폼 |

### 기존 수정
| 컴포넌트 | 변경 |
|---|---|
| Dashboard | "학급 관리" 링크 추가 |
| CreateBoardModal | classroomId 선택 드롭다운 추가 |
