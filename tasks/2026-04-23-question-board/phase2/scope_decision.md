# Scope Decision — question-board

## 1. 선택한 UX 패턴

`ux_patterns.json` 에서 7개 패턴 채택:

1. `teacher_prompt_single_topic` — 주제는 교사 설정 1개 (request.json 확정)
2. `realtime_response_stream` — 기존 SSE 재사용 (research_pack: "새 엔진 도입 없음")
3. `teacher_mode_toggle` — 시각화 모드는 교사가 전환, 학생 화면 동기화
4. `word_cloud_frequency_size` — d3-cloud 채택 (research_pack 번들 비교)
5. `bar_chart_frequency_rank` — 상위 10 + 기타
6. `pie_chart_share` — 응답군 3~5 때 유용
7. `timeline_chronological` — 등록 시각순, 최신 sticky
8. `list_simple` — fallback + 접근성

탈락: `moderation_optional` — 후속 task.

## 2. MVP 범위

### 포함 (IN)

- **보드 레이아웃**: `layout: "question-board"` 추가
- **데이터 모델**: `BoardResponse (id, boardId, studentId, text, createdAt)` + `Board.questionPrompt` + `Board.questionVisualizationMode`
- **API**:
  - `POST /api/boards/[id]/responses` — 학생 응답 생성
  - `GET /api/boards/[id]/responses` — 응답 목록 (교사/학생 모두)
  - `PATCH /api/boards/[id]/question-config` — 주제·시각화 모드 변경 (교사)
- **UI (웹)**: `QuestionBoard.tsx` + 5개 시각화 컴포넌트 (WordCloud, Bar, Pie, Timeline, List)
- **UI (모바일)**: 웹과 동일 구조의 RN 이식 (시각화는 리스트·바 우선, 워드클라우드는 웹 전용 MVP → 모바일은 후속)
- **실시간**: 기존 SSE 경로에 `response_created` / `question_config_updated` 이벤트 추가
- **권한**: 교사/owner 는 모든 API, 학생은 보드 멤버여야 POST 가능

### 제외 (OUT)

- **응답 기한 / 자동 마감**: UI 복잡도 증가 대비 수업 중 교사 수동 제어로 충분. 후속 task.
- **응답 삭제/편집**: 학생이 자기 응답 수정. 부정적 UX 위험, MVP 에선 **교사만 삭제 가능**.
- **Moderation (승인 후 표시)**: 수업 속도 느려짐. 후속 task `question-board-moderation`.
- **익명/닉네임 전환**: 기본 기명. 후속 task `question-board-anonymous`.
- **객관식/리커트**: 자유 텍스트 only. 후속 task `poll-board` (별개 레이아웃 가능).
- **AI 요약·감성분석**: 후속.
- **모바일 워드클라우드**: 웹만. 모바일은 바/리스트로 대체.
- **시각화 PNG export**: 후속.

## 3. 수용 기준 (Acceptance Criteria)

| # | 기준 | 검증 방법 |
|---|---|---|
| AC-1 | 교사가 보드 생성 시 `layout: "question-board"` 를 선택하면 주제 설정 입력창이 상단에 노출된다 | 브라우저 수동 + DOM 확인 |
| AC-2 | 교사가 주제를 저장하면 학생 화면 상단에 주제가 표시된다 | SSE 이벤트 확인 |
| AC-3 | 학생이 응답을 제출하면 1초 이내에 교사 화면에 반영된다 | 실시간 확인 + SSE timestamp |
| AC-4 | 교사가 시각화 모드를 전환하면 5초 이내 학생 화면도 같은 모드로 전환된다 | 다중 브라우저 수동 |
| AC-5 | 갤럭시 탭 S6 Lite 에서 응답 100개 상태 워드클라우드 첫 페인트 < 2초 | DevTools Performance |
| AC-6 | 시각화 모드 전환 렌더 시간 < 200ms | React Profiler |
| AC-7 | 비어 있는 보드는 "아직 응답이 없어요" empty state 를 각 시각화별로 노출 | 수동 |
| AC-8 | 학생이 비멤버인 보드엔 응답 POST 가 403 으로 차단된다 | API 테스트 |
| AC-9 | 교사만 응답 삭제 가능. 학생 DELETE 는 403 | API 테스트 |
| AC-10 | 워드클라우드는 2자 이하 단어·공백 제외하고 빈도 집계한다 | 유닛 테스트 |

## 4. 스코프 결정 모드

**Selective Expansion** — 새 레이아웃 1개 + 5개 시각화 동시 도입이므로 확장이지만, moderation/poll/anonymous 등 근접 기능은 단호히 제외.

## 5. 위험 요소

### R-1 워드클라우드 성능 (태블릿)
- d3-cloud 는 JS 계산 집약. 100+ 단어 레이아웃 계산이 Galaxy Tab S6 Lite 에서 1초+ 걸릴 수 있음.
- **완화**: `requestIdleCallback` 사용, 단어 상한 60개로 clamp, placement 결과 memoize.

### R-2 한국어 워드클라우드 노이즈
- "좋아요", "좋았어요", "좋음" → 같은 의미지만 다른 단어로 집계됨. 조사("을/를", "이/가") 때문에 "감사" ≠ "감사를".
- **완화**: MVP 는 조사 휴리스틱(마지막 1~2 글자가 "이/가/을/를/은/는/도/의/에" 일 때 제거) 만. 형태소 분석은 후속.

### R-3 실시간 동시 응답 폭주
- 수업 시작 시 30명이 동시 POST → DB 쓰기 스파이크.
- **완화**: BoardResponse 테이블 INSERT only (UPDATE 없음). 기본 Prisma 연결 풀로 충분. 부하 테스트는 QA phase.

### R-4 교사 권한 우회
- 학생이 `PATCH /question-config` 호출 → 주제·모드 변경 시도.
- **완화**: 서버에서 `getEffectiveBoardRole` === "owner"|"editor" 체크. 클라 숨김 + 서버 차단 2중.

### R-5 학생 응답 수 제한 없음
- 한 학생이 1000개 응답 도배 가능.
- **완화**: MVP 에 rate limit (학생당 분당 10개). 근본 해결은 후속 task.

### R-6 보드 삭제 시 응답 cascade
- `Board` 삭제 시 `BoardResponse` 고아 레코드 발생.
- **완화**: `onDelete: Cascade` FK. 마이그레이션에 명시.

### R-7 d3-cloud SSR 미호환
- d3-cloud 는 canvas 사용 → Next 서버 컴포넌트에서 import 불가.
- **완화**: `"use client"` 컴포넌트로 격리 + `dynamic(() => import(...), { ssr: false })`.
