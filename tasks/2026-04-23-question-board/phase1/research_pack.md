# Research Pack — question-board

## 요약

Mentimeter / Slido 류가 이 기능 공간의 지배적 디자인. 공통 구조는:

- **교사 = presenter**: prompt 설정, 시각화 전환 제어
- **학생 = participant**: prompt 에 응답만, 화면 모드는 교사가 지정
- **실시간 동기화**: 응답·모드 둘 다 모든 연결된 클라이언트에 푸시

## 패턴별 장단점

### 1. Word Cloud (빈도 기반 크기)
- **장점**: 시각적 임팩트 강함, "많은 학생이 같은 생각 → 커다란 단어" 가 즉각적으로 읽힘. 수업 환기에 최적.
- **단점**: 긴 문장/서술형엔 부적합. 띄어쓰기·조사·동의어 문제로 노이즈 발생. 한국어는 특히 어미 변형이 많아 정제 필요.
- **판정**: MVP 포함. 전처리는 공백 단위 split + 2자 이하 단어 제외 정도로만 시작. 고급 NLP 는 후속.

### 2. Bar / Pie Chart
- **장점**: 정량적 해석 쉬움. 설문 모드에 최적.
- **단점**: 자유 질문(질문보드 모드)엔 동일 응답이 거의 없어 무의미함.
- **판정**: MVP 포함. 응답군이 < 10 종류 일 때만 의미 있어서 UX 상 "상위 N 막대 + 나머지 기타" 로 제한.

### 3. Timeline (시간순)
- **장점**: 토론/Q&A 흐름 자연스러움. 모더레이션 없이도 안전하게 흐름 제공.
- **단점**: 응답 많아지면 스크롤 폭주. 프리젠테이션 시 시각 임팩트 약함.
- **판정**: MVP 포함. 최신 N개 sticky + 자동 스크롤.

### 4. List (등록순 단순 리스트)
- **장점**: 가장 보수적·접근성 우수. 저사양/비쥬얼 피로 싫은 교사 선택지.
- **단점**: "다양한 시각화" 요건을 형식적으로만 충족. 단독 가치는 낮음.
- **판정**: MVP 포함 (fallback + a11y).

### 5. Moderated Q&A (교사 승인 후 표시)
- **판정**: 비목표. MVP 에서 제외. 후속 task `2026-XX-question-board-moderation`.

## 기술 요소

### Word Cloud 라이브러리 후보

| 후보 | 크기 | 리액트 친화 | 판정 |
|---|---|---|---|
| d3-cloud | ~15KB | 직접 wrapping 필요 | **채택** — 커스텀 폰트·색·인터랙션 자유 |
| react-wordcloud | ~40KB (d3 포함) | 바로 쓰기 쉬움 | 탈락 — 번들 과다 + 마지막 릴리스 오래됨 |
| 직접 구현 | ~2KB | 완전 제어 | 검토 — 빈도 정렬 후 rect packing 대략 구현하면 될지. 충돌 방지가 난제 |

### 차트 라이브러리
- 프로젝트에 이미 Chart 라이브러리 없음 → MVP 는 SVG 직접 렌더 (바/파이) 로 해결 가능. 100개 응답 기준 충분.

### 실시간
- 기존 SSE 인프라 (`/api/boards/[id]/stream` 추정) 재사용. 새 엔진 도입 없음.

## 감지된 UX 패턴 (상세는 `ux_patterns.json`)

9개 패턴 감지, 그 중 MVP 채택 7개 (`teacher_prompt_single_topic`, `realtime_response_stream`, `teacher_mode_toggle`, `word_cloud_frequency_size`, `bar_chart_frequency_rank`, `pie_chart_share`, `timeline_chronological`, `list_simple`). 탈락 1개(`moderation_optional`).

## 벤치마크 한계

Solo 프로젝트 + gstack `/browse` 미실행으로 실제 UI 스크린샷 없음. 대신 공개 문서/제품 경험 기반 요약. 추후 QA phase 에서 실제 Mentimeter/Slido 캡처 비교 시 gaps 있을 수 있음.
