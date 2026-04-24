# 2026-04-24 AI 평어 + Aura 통합 — Shipped

> **Phase 0 → 직코딩 (orchestration 우회)**: 결정사항이 미리 다 합의돼 있어서 phase1~6 (researcher/strategist/architect/designer/design-reviewer) 은 스킵, 바로 구현 들어갔음. Aura 측 답변 릴레이로 통합 계약을 확정하면서 진행.

## 한 줄

교사가 학생 카드(작품 이미지 포함) 보면서 단원·평가항목 입력 → Gemini Vision 으로 평어 일괄 생성·UPSERT → Aura 컴패니언이 OAuth 2.0 으로 풀.

## 진입점

| 위치 | 컴포넌트 | 동작 |
|---|---|---|
| 컬럼보드 헤더 ⋯ kebab | `ColumnsBoard.tsx` → `AiFeedbackModal` | 칼럼 카드 작성자만 roster, sectionId 로 비전 이미지 scope |
| 과제 채점 fullscreen 모달 | `AssignmentFullscreenModal.tsx` → `AiFeedbackModal` | 단일 학생 preset, sectionId 없음 (학생 가장 최근 카드 이미지 fallback) |
| 교사 설정 페이지 | `/teacher/settings` → `ConnectedAppsSection` | OAuth 연결된 외부 앱 표시 + 연결 해제 |

## 데이터 모델

```prisma
model AiFeedback {
  id          String   @id @default(cuid())
  teacherId   String
  classroomId String
  studentId   String
  subject     String   // v1 'art' (free string for future expansion)
  unit        String   // 빈 문자열 허용 — 학기 전반 톤
  criterion   String   // 빈 문자열 허용
  comment     String   @db.Text
  model       String   // e.g. "gemini-2.5-flash"
  sentAt      DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@unique([studentId, subject, unit, criterion])  // UPSERT 정책
}
```

### OAuth 확장 (기존 테이블에 userId nullable 추가)

```prisma
model OAuthAuthCode {
  studentId String?  // Canva 페어링
  userId    String?  // Aura 컴패니언 교사
  // CHECK: 정확히 하나만 NOT NULL
  ...
}
// OAuthAccessToken / OAuthRefreshToken 동일 패턴
```

## 엔드포인트 (신규)

### 내부 (교사 UI)
- `POST /api/ai-feedback/preview` — LLM 호출만, DB 저장 X
- `POST /api/ai-feedback` — 단건 UPSERT
- `POST /api/ai-feedback/batch` — N명 일괄 (concurrency 4, 학생당 비전 이미지 base64 첨부)
- `DELETE /api/ai-feedback/[id]`
- `POST /api/teacher/oauth-clients/[clientId]/disconnect`

### 외부 (Aura 컴패니언)
- `GET /api/external/feedbacks` — OAuth bearer 또는 bridge token. flat 배열
- `GET /api/external/grades` — 동일 인증, 이미 있던 OMR 채점 결과 + classroomCode 필드 추가
- `GET /api/oauth/me` — 디버그용 토큰 → 교사 식별 확인

기존 `/oauth/authorize`, `/api/oauth/{token,revoke}` 는 subject 분기 추가 (Canva 학생 + Aura 컴패니언 교사 동시 처리).

## 핵심 결정사항

### AI 평어
| 항목 | 결정 |
|---|---|
| 프로바이더 | A — `TeacherLlmKey` BYOK (Gemini/Claude/OpenAI/Ollama) |
| 영속 정책 | B — UPSERT 정책. preview 는 휘발 |
| 학생/학부모 노출 | X (교사·Aura 만) |
| 입력 UX | 모달 — 학생 다중 선택 (전체 선택 포함) → 단원/평가항목(선택) → 일괄 생성 |
| Tier 게이트 | Free 허용 |
| 비전 모델 | Gemini Vision 만 (inlineData base64). 다른 provider 는 텍스트 fallback |
| 프롬프트 룰 | 주제·물체 명사 추측 금지, 색감/구도/질감/표현 노력만 묘사, 사진 배경 무시 |

### Aura OAuth 통합 (양쪽 합의)
| 항목 | 결정 |
|---|---|
| Client | confidential, PKCE S256 필수 |
| Scope | `external:read` 단일, read-only |
| Token | Access 1h, Refresh 30d, rotate-on-use |
| CLIENT_ID | `aura-companion` (고정) |
| Redirect URIs | `https://aura-teacher.com/integrations/aura-board/callback`, `http://localhost:4000/integrations/aura-board/callback` |
| 전환기 | shared-secret `AURA_BRIDGE_TOKEN` 와 동시 동작. 응답에 Deprecation/Sunset 헤더 |
| Sunset | OAuth 양쪽 prod 배포 + 2주 (~2026-05-08) |

상세 사양 → `docs/integrations/aura-companion.md`

## Shipped 커밋

| 커밋 | 요약 |
|---|---|
| `94a544d` | columns 자동 학생 섹션 옵션화 + 가로스크롤 가시화 (사이드 작업) |
| `3fbcf72` | AI 평어 v0 — 모델 + 4개 엔드포인트 + 모달 |
| `d4bf26c` | 자유 주제 칼럼에서도 메뉴 + 모달 학생 picker |
| `66ee328` | 다중 학생 + 일괄 생성 (POST batch) |
| `da00114` | 모달 학생 목록을 칼럼 카드 작성자로 좁힘 |
| `501d3d5` | Gemini thinking 토큰 본문 잘림 fix |
| `674b4af` | Gemini Vision (inlineData base64, sectionId scope) |
| `79c4f09` | 주제 식별 금지 프롬프트 + 비전 사용 진단 뱃지 |
| `861d87a` | Aura companion 교사 OAuth 2.0 + bridge token transition |
| `9ad09e9` | 교사 설정 "연결된 외부 앱" UI |
| `a5a4920` | 시드 pepper 가드 (회귀 방지) |

## 운영 체크리스트

- [x] Aura E2E 검증 통과 (2026-04-24)
- [ ] **Sunset 일자 명시 — 양쪽 prod 배포일 + 2주 = 약 2026-05-08**
- [ ] Sunset 도래 시 `AURA_BRIDGE_TOKEN` Vercel env 양쪽 제거 + `aura-bridge-auth.ts` 의 bridge 분기 코드 삭제
- [ ] Aura 마이그레이션 완료 모니터링 (응답 헤더 `Deprecation: true` 가 나오는 호출이 0이 되는지)

## 후속 후보 (현 task 스코프 외)

- **Claude/OpenAI Vision** — 현재 Gemini 만. provider 다양화 시 추가
- **다과목 UI** — `AiFeedback.subject` 는 free string. 과목 picker 추가하면 다과목 평어 생성 가능
- **AiFeedback 페이지네이션** — 1000 row 초과 시 cursor 도입
- **Multi-client teacher OAuth** — 추가 client 등록 시 `src/lib/oauth-subject.ts` allowlist 갱신
- **Audit log 연계** — `AuditEvent` 에 OAuth 토큰 발급/폐기 기록
