# Scope Decision — student-portfolio

## 1. 선택한 UX 패턴

phase1 [ux_patterns.json](../phase1/ux_patterns.json) 8개 중 본 task v1에 채택한 5개:

| 패턴 ID | 채택 | 사유 (research_pack 근거) |
|---|---|---|
| `two-pane-peer-roster` | ✅ 포트폴리오 페이지 골격 | 사용자 명시 ("좌측에 학생목록 + 이름 클릭"), Mobbin/Slack 보편 |
| `profile-gallery-grid` | ✅ 우측 콘텐츠 영역 | Padlet Gallery 구조와 동일, 기존 `CardBody.tsx` 재활용 가능 |
| `pinned-top-feed` | ✅ 자랑해요 메커니즘 | Instagram pinned posts + Seesaw "Pinned items appear at top" 패턴 일치 |
| `feature-flag-badge` | ✅ 자랑해요 시각 표식 | Behance Feature Flag — 작은 코너 배지 (🌟) |
| `source-breadcrumb-meta` | ✅ 카드별 출처 표시 | 사용자 명시 ("어떤 보드인지, 주제별이면 어떤 주제") |

기각:
- `editorial-featured` — 큐레이션 정신 안 맞음, 솔로 프로젝트라 큐레이터 부재
- `approval-gated-visibility` — request.json non_goals 명시 (학생 자율)
- `chronological-grid-fallback` (제거) — 너무 자명, 별도 패턴 처리 안 함

## 2. MVP 범위

### IN (이번 task 구현)

**포트폴리오 페이지 `/student/portfolio`**
1. 좌측 학생 리스트 — 학급 학생 출석번호순, 이름 + 작품 수 뱃지
2. 우측 그리드 — 선택된 학생의 카드(보드에서 작성·공동작성 모두), 시간순(최신 위)
3. 카드별 출처 라벨 — 주제별 보드: `{보드 제목} · {칼럼 제목}` / 그 외: `{보드 제목}`
4. 카드 본문 렌더 — 기존 [`CardBody.tsx`](../../../src/components/cards/CardBody.tsx) 재활용
5. 빈 상태 — 작품 0개일 때 안내 + (본인이면 "보드에서 카드 만드세요" CTA)

**자랑해요 (Showcase)**
6. 카드 컨텍스트 메뉴에 "🌟 자랑해요에 올리기" 토글 — **학생 본인이 작성/공동작성한 카드에서만 노출**
7. 자랑해요 N=3 (학생당) — 4번째 시도 시 "기존 1개 내려야 함" 안내 모달 + 선택 UI
8. 학생 dashboard `/student` 상단 highlight 섹션 — 학급 전체 자랑해요 chronological(자랑해요 등록 시각순), 좌우 스크롤(가로 carousel) 기본 표시 6장
9. 자랑해요 카드 코너에 🌟 배지 — 포트폴리오·dashboard 양쪽
10. 자동 정리 — 카드 삭제 시 자랑해요 자동 해제. 자랑해요 등록자 ≠ 카드 작성자(학생) 시 토글 권한 거부 (server-side)

**학부모 뷰 `/parent/portfolio` (또는 기존 학부모 페이지 확장)**
11. 자녀 본인 카드 + 자녀가 속한 학급의 자랑해요 통합 그리드
12. 자녀 외 학생의 비-자랑해요 카드는 노출 X (서버 권한 필터)
13. 자녀가 여러 명일 시 좌측 자녀 토글(셀렉트) 후 해당 학급 컨텍스트로 전환

### OUT (이번 task 제외)

| 항목 | 사유 | 후속 task |
|---|---|---|
| 검색·필터(보드별/날짜별) | request.json non_goals + v1 chronological 단일로 충분 | 잠재 v2 |
| 좋아요·댓글 | request.json non_goals + 데이터 모델 추가 부담 | 잠재 v2 |
| 교사 모더레이션 / 강제 자랑해요 해제 | request.json non_goals + 학생 자율 정신 | 잠재 v2 |
| 부적절 콘텐츠 신고 버튼 | 사회적 통제(학급 내 공개)로 v1 충분 | incident task |
| 자랑해요 N개 한도 학급 설정 | 학급 customization 추가 부담, 전역 N=3 고정 | v2 |
| Empty-state 일러스트 (커스텀 SVG) | 텍스트 + 이모지로 v1 충분 | 디자인 폴리시 task |
| 자랑해요 알림(다른 학생 자랑해요 올렸을 때 푸시) | 알림 시스템 미존재 | 별도 task |
| 학교 전체 자랑해요 (학급 외 노출) | request.json non_goals + 데이터 모델 큰 변경 | v2 |
| 자랑해요 정렬 옵션 (인기순 등) | 좋아요 비스코프라 인기 신호 없음 | 좋아요와 함께 |

## 3. 수용 기준 (Acceptance Criteria)

검증 가능한 형태 (오케스트레이터·QA 자동 체크 가능):

1. **AC-1 (포트폴리오 진입)**: 학생 로그인 후 `/student/portfolio` 접근 시 좌측 학급 학생 리스트가 출석번호 ASC로 렌더되고, 본인 항목이 시각적으로 강조(`is-self` 클래스)된다.
2. **AC-2 (학생 선택)**: 좌측 학생 이름 클릭 → 우측 그리드가 그 학생이 작성/공동작성한 카드만 노출. 다른 학급 학생 카드는 절대 노출 X (서버 응답에서 검증).
3. **AC-3 (출처 라벨)**: 주제별 보드(layout=columns) 카드는 `{보드 제목} · {칼럼 제목}` 형식, 그 외 layout 은 `{보드 제목}` 형식으로 카드 메타에 출력된다.
4. **AC-4 (자랑해요 토글)**: 학생 본인 카드에서만 ContextMenu에 "🌟 자랑해요" 항목이 보이며, 토글 ON 시 카드 row 의 `isShowcased=true` 가 DB에 저장되고 `/student` dashboard highlight 영역에 카드가 즉시(SSE 또는 200ms 내 refetch) 노출된다.
5. **AC-5 (자랑해요 한도)**: 학생당 자랑해요 카드 4번째 토글 시도 시 "기존 1개 내려야 합니다" 모달 노출 + 기존 자랑해요 3개 중 하나 선택해 해제 가능. 모달 취소 시 4번째 토글 미적용.
6. **AC-6 (자랑해요 배지)**: `isShowcased=true` 카드는 포트폴리오 페이지 + 학생 dashboard 양쪽에서 카드 코너에 🌟 배지 노출. 배지 클릭 시 자기 카드면 토글, 타인 카드면 무반응.
7. **AC-7 (카드 삭제 cascade)**: 보드에서 카드 삭제 시 자랑해요 등록 여부와 무관하게 dashboard / 포트폴리오에서 사라진다 (DB cascade 또는 application-level 자동 해제).
8. **AC-8 (학부모 권한)**: 학부모 계정으로 `/parent/portfolio` 접근 시 자녀 본인 카드 + 자녀 학급의 자랑해요만 노출. 자녀 외 학생의 비-자랑해요 카드는 응답에 포함되지 않는다 (E2E 테스트 verify 0 leak).
9. **AC-9 (다자녀 학부모)**: 자녀 ≥2명 학부모는 좌측 자녀 셀렉터 노출 + 셀렉트 시 그 자녀 학급 컨텍스트로 전환. 자녀 1명 학부모는 셀렉터 숨김.
10. **AC-10 (typecheck + build)**: `npm run typecheck` + `npm run build` 통과. 기존 보드 기능 회귀 0건 (기존 board 페이지 SSR 정상).

## 4. 스코프 결정 모드

**Selective Expansion** — 사용자가 명시한 3축(포트폴리오·자랑해요·학부모뷰) 모두 포함하되, 각 축의 부수 기능(검색·필터·승인·신고·알림 등) 은 명시적 OUT 으로 분리. v1 은 핵심 골격에 집중해 phase3 architect 가 추후 확장 가능한 schema 로 잠금.

## 5. 위험 요소

### R1 — 권한 누출 (CRITICAL)
학부모가 자녀 외 학생 카드를 볼 가능성. RBAC 누출 시 개인정보 사고로 직결.
- **완화**: API 라우트에 `getCurrentParent()` + 자녀 ID 명시 매핑 후 `WHERE student.classroomId IN (자녀 학급들) AND (card.studentAuthorId IN (자녀 ID들) OR card.isShowcased=true)`. AC-8 E2E 테스트 강제.

### R2 — N+1 쿼리 (PERFORMANCE)
포트폴리오 페이지가 카드별로 보드/섹션 메타를 별도 fetch 하면 학급당 카드 100~500개 처리 시 O(N) DB 쿼리. SSR latency > 3s 위험.
- **완화**: Prisma `include: { board: true, section: true }` 단일 쿼리 + 학급 `students` 한번에 fetch. p95 < 1.5s 목표 (success_metric 일치).

### R3 — 자랑해요 한도 race condition
학생이 빠르게 N개 토글 시 4번째가 race로 슬쩍 들어가는 경우. 동시성 보호 미비 시 한도 초과.
- **완화**: PATCH `/api/cards/:id` showcase=true 진입 시 DB 트랜잭션 안에서 `COUNT WHERE studentAuthorId=X AND isShowcased=true < 3` 체크 → fail 시 409 반환. 클라이언트는 미러(낙관적 업데이트) 후 409 시 롤백.

### R4 — 카드 작성자 ≠ 학생 (공동작성)
`Card.authors` 다중 학생일 때 누가 자랑해요 토글 권한? 모든 공동작성자? 첫 번째만?
- **완화 결정**: **공동작성자 누구나 토글 가능. 단 한 카드는 한 학생의 자랑해요 슬롯 1개에만 매핑.** ShowcaseEntry 모델 시 `(cardId, studentId)` 복합 unique. → architect phase3 에서 schema lock.

### R5 — 출처 보드가 비공개/삭제된 경우
포트폴리오에 카드 표시했는데 원본 보드가 삭제/접근 불가 상태일 때 deep-link 깨짐.
- **완화**: 카드 row 자체에 board 메타 join. 보드 삭제 시 카드 cascade 삭제 → 자랑해요 cascade 해제 (AC-7). 비공개 전환은 학급 내 보드는 케이스 X (학급 학생 모두 접근).

### R6 — 자랑해요 dashboard highlight 영역 시각 압도
학급 30명 × 3개 = 90개 자랑해요. 단일 화면에 풀 노출 시 시각 피로.
- **완화**: 가로 carousel + 기본 노출 6장 + "더 보기" 토글로 페이지 펼침. phase4 designer 가 인터랙션 확정.

### R7 — 모바일 두 칼럼 레이아웃 깨짐
`two-pane-peer-roster` 데스크톱에서만 자연. 모바일은 stack 변환 필요.
- **완화**: phase4 design_planner 가 breakpoint 정의 (≥768px two-pane / <768px 학생 리스트→상세 페이지 stack).

---

## 핸드오프

phase3 architect 는 다음을 잠그어야 한다:
- ShowcaseEntry vs Card.isShowcased 데이터 모델 결정 (R4 의 공동작성자 슬롯 분리 가능성 고려)
- API 라우트 명세 (`/api/student-portfolio/:studentId`, `/api/showcase`, `/api/parent/portfolio`)
- 권한 가드 패턴 (RBAC 헬퍼 재사용 vs 신규)
- SSE/refetch 동기화 전략 (자랑해요 토글 → dashboard 즉시 반영)
