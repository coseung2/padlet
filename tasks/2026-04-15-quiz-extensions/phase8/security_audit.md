# Security Audit — quiz-extensions

task_id: 2026-04-15-quiz-extensions
scope:   phase7 변경분 (신규 API 6개 + /create 수정 + CSV 내보내기)

## OWASP Top 10 스코어카드

### A01:2021 — Broken Access Control
**영역**: 신규 엔드포인트 7개 + /create 수정.

- `canManageQuiz(quizId, ids)` 가 중심. 교사의 `ownsBoardIds` ∋ quiz.boardId 인 경우에만 true.
- student / parent / anon 은 teacher=null 분기에서 즉시 false. vitest 확인.
- `/api/quiz/draft`, `/api/quiz/create` 는 `canAddCardToBoard` — draft 도 실제 board 소유 검증을 통과해야 LLM 호출까지 진행.
- `/api/quiz/library` 는 teacher 존재 확인 후 `ownsBoardIds` 으로 쿼리 where. 이 교사가 소유하지 않은 board 의 quiz 는 결과에서 제외.
- `/api/quiz/[id]/clone` 은 **이중 검증**: 원본 `canManageQuiz` + 대상 board 가 다른 경우 `canAddCardToBoard`.

**결과**: PASS.

### A02:2021 — Cryptographic Failures
해당 없음 — 새로운 비밀 저장/전송 경로 없음. LLM apiKey 는 기존 cookie 방식 유지.

### A03:2021 — Injection

#### 3-a. SQL/ORM
모든 DB 접근이 Prisma 파라미터화 쿼리. raw SQL 사용 없음. **PASS**.

#### 3-b. CSV Formula Injection 🔴→✅
`src/lib/quiz-report.ts` 의 `reportToCsv` 가 학생 이름·선택 셀을 엑셀로 내보낼 때 `=HYPERLINK(...)` 같은 포뮬라가 실행될 수 있었음.

- 공격 경로: 학생이 join 시 닉네임을 `=HYPERLINK("https://evil/",클릭)` 로 설정 → 교사가 CSV 다운로드 → Excel 에서 포뮬라 자동 실행 → 외부 요청.
- 수정: 셀 첫 글자가 `= + - @ \t \r` 중 하나면 `'` 를 prefix. 이후 표준 CSV quoting.
- 커밋: phase8 후속 수정 블록.

**수정 후 PASS**.

### A04:2021 — Insecure Design
- `parentQuizId` 에 FK 가 없는 건 의도된 설계(원본 삭제 허용). 무한 체인 생성 리스크는 design_doc §5.10 에 문서화.
- clone 엔드포인트 rate limit 부재는 부록(N-3)에 기록, 현 단계 운영상 리스크 수용.

### A05:2021 — Security Misconfiguration
신규 env / 외부 서비스 없음. 기존 LLM 환경(openai/anthropic) 재사용.

### A06:2021 — Vulnerable Components
신규 의존성 없음.

### A07:2021 — Identification and Authentication Failures
해당 없음 — 인증 로직 자체는 변경 없음. 세션 검사 오직 `resolveIdentities` 재사용.

### A08:2021 — Software and Data Integrity
PUT `/questions` 는 트랜잭션으로 일관성 보장. 트랜잭션 실패 시 기존 question 셋이 유지.

### A09:2021 — Security Logging & Monitoring
- `console.error` 로 에러 로깅, 요청 바디/apiKey 는 로그에 포함되지 않음.
- 404/403/422 는 의미 있는 에러 코드 반환, 민감 정보 노출 없음.

### A10:2021 — SSRF
해당 없음 — 외부 URL fetch 는 없음.

## STRIDE 요약

| 카테고리 | 해당 변경 | 평가 |
|---|---|---|
| **S**poofing | draft → create 승격 시 draftQuestions 신뢰 | 서버가 draftQuestions 스키마/옵션 4개/answer 도메인 재검증 → PASS |
| **T**ampering | PUT /questions 로 임의 질문 교체 | canManageQuiz + active 상태 차단 → PASS |
| **R**epudiation | 클론 origin 추적 | parentQuizId 로 감사 흔적 확보 |
| **I**nfo Disclosure | 리포트/라이브러리 데이터 | 교사 소유 board 에만 노출 → PASS |
| **D**oS | LLM 호출 비용, CSV 대용량 | design_doc §5.7 제한치(30명×20문항) 이내, rate limit 은 부록 N-3 |
| **E**levation of Privilege | /create 권한 신규 도입 | 기존 누락 수정 → PASS |

## 파일 업로드

`/api/quiz/draft` 의 PDF 파싱 경로는 기존 `/api/quiz/create` 와 동일 (`pdf-parse`, `file.type === "application/pdf"` 분기). 신규 공격면 증가는 없음.

- 파일 크기 제한은 Next.js 기본 `bodyParser.sizeLimit` (4MB) 적용. 추가 제한은 현재 미도입(기존 동일).
- text 파일 경로는 `file.text()` — 신뢰 경계 밖 텍스트지만 이후 LLM 프롬프트로만 사용, 서버 내부 명령 실행 경로 없음.

## 결론

모든 카테고리 **PASS** (CSV injection 자동 수정 완료 후). 별도 보안 TODO 없음.
