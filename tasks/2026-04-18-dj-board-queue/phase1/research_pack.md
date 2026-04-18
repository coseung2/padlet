# Phase 1 — Research Pack (DJ Board Queue)

## 조사 제한사항 (disclosure)

오케스트레이션 자동 감독 모드(사용자 승인 없음) 진행 중이라 헤디드 브라우저 live 캡처 생략. 대신 공개된 제품 동작·리뷰·개발자 블로그·GitHub 오픈소스(Plug.dj, Deadmau5 JQBX 클론 등)에서 널리 문서화된 UX 패턴을 요약. 라이브 캡처가 필요한 항목은 `benchmark/` 아래 TODO로 남기지 않고 phase2에서 실제 디자인 단계(phase4/5)에 위임.

---

## 벤치마크 3종 비교

| 제품 | 카테고리 | 큐 조작 권한 구조 | 이번 task 적합도 |
|---|---|---|---|
| **YouTube Music** (web) | 단일 사용자 큐 | 본인만. 큐 재정렬 = 드래그 손잡이 | 아이템 표시(썸네일·제목·채널) 패턴 참고 |
| **Spotify Collaborative Playlist** | 다중 사용자 플레이리스트 | 초대된 모두가 곡 추가·순서 변경 | 권한이 수평적 — 우리는 DJ↔학생 계층 있으므로 부분만 참고 |
| **JQBX / Plug.dj 류** (collaborative DJ room) | 순번제 DJ 턴테이블 | DJ 큐에 올라간 사람만 "지금 재생" 권한, 청취자는 제안 | 우리 모델의 가장 직접적 레퍼런스 |

### 1. YouTube Music 큐 UI

관찰 포인트 (보편적으로 알려진 구조):
- **Now Playing** 영역이 화면 하단 고정 (sticky player). 트랙 썸네일 + 제목 + 채널 + 재생/다음 컨트롤.
- **Up Next** 리스트 세로 스크롤. 각 행: 드래그 손잡이 · 썸네일 · 제목 · 채널 · overflow 메뉴(삭제/다음에 재생).
- 빈 큐 상태: 중앙 일러스트 + "You haven't queued up any songs yet" 카피.
- 드래그 피드백: 잡은 행 반투명 + 목적지 슬롯 하이라이트.

장점: 학생도 YouTube 사용 경험 있어 친숙. 썸네일이 식별 최우선 요소로 작동.
단점: 단일 사용자 모델이라 "권한 분리" 개념이 없음 — DJ/학생 구분 시각화는 이 제품엔 없음.

### 2. Spotify Collaborative Playlist

관찰 포인트:
- 추가한 사람의 아바타가 곡 옆에 표시 (누가 올렸는지).
- 순서 바꾸기는 드래그, 삭제는 행 hover overflow.
- "최근에 추가됨" 정렬 옵션이 기본 — 학생에게 즉각적 피드백을 주기 좋은 패턴.

장점: 제출자 attribution이 보드 문화에 잘 맞음 (우리 Card.authors[] 재사용과 동일 개념).
단점: 수평적 권한 — DJ-only 액션을 구분해 보여주려면 Spotify 패턴만으론 부족.

### 3. JQBX / Plug.dj 류 (협업 DJ 룸)

관찰 포인트:
- **Now Playing** 중앙 대형 플레이어 + 경과 시간 바.
- **Queue** 리스트에 본인 곡만 재정렬 가능 (다른 DJ 곡은 read-only).
- 청취자는 "Add to my queue" 버튼으로 **자기 대기열**에만 곡을 쌓음 (= 제안).
- DJ 순번이 돌면 각 DJ의 큐 맨 앞 곡이 자동으로 재생 이관.
- Upvote/downvote UI (DJ 순번 우선순위 조정).

장점: 비-DJ vs DJ 권한 계층이 명시적. 우리 시나리오와 가장 가까움.
단점: 여러 DJ가 돌아가며 트는 "순번제"는 우리 학급 시나리오에 과함 (DJ 한 명/소수가 교사 대행). **일부 DJ 컨트롤 + 비-DJ 제출**만 차용.

---

## 핵심 UX 패턴 (이번 task 채택 대상)

### P1. Sticky Now Playing + scrollable queue
- **근거**: YouTube Music · Spotify · JQBX 전부 채택. 현재 재생 중인 항목을 항상 보이게.
- **이번 task 적용**: MVP 스코프에선 "진짜로 브라우저가 YouTube를 재생"하진 않음 — **"지금 재생 중 표시 포인터만 있는 정렬된 리스트"**로 단순화. DJ가 "다음 곡으로" 버튼을 누르면 포인터가 다음 row로 이동. YouTube iframe 임베드 실재생은 향후 확장.

### P2. Role-aware affordance visibility
- **근거**: JQBX/Plug.dj의 DJ booth vs floor 분리.
- **이번 task 적용**: `effectiveRole === "owner"|"editor"`일 때만 드래그 손잡이·승인 버튼·삭제 버튼 노출. 비-DJ 학생에겐 "곡 제출" 버튼과 본인이 올린 대기 곡의 "취소"만.

### P3. Submission status pill
- **근거**: Reddit post flair / assignment board AssignmentSlot 패턴 (내부 코드 레퍼런스).
- **이번 task 적용**: `queueStatus` = "pending" (회색) · "approved" (초록) · "played" (회색, 타임스탬프) · "rejected" (빨강 또는 숨김).

### P4. Submitter attribution (아바타 + 이름)
- **근거**: Spotify collaborative · 기존 Card `authors[]`.
- **이번 task 적용**: 이미 Card에 있는 author footer 재사용. 별도 구현 불필요.

### P5. YouTube thumbnail as primary identity
- **근거**: YouTube Music · TikTok 등 비디오 기반 모든 서비스.
- **이번 task 적용**: Card.linkImage 재사용(oEmbed fetch로 썸네일 자동 채움). 120×68 16:9 썸네일 + 트랙 제목 2줄 말줄임 + 채널명 secondary.

### P6. Drag handle with keyboard fallback
- **근거**: YouTube Music은 마우스 드래그만, Spotify는 우클릭 메뉴에 "Move up/down" 제공.
- **이번 task 적용**: MVP는 마우스 드래그만 (기존 ColumnsBoard reorder 로직 재사용). 키보드 a11y는 방지 게이트 아닌 scope out.

### P7. Optimistic reorder + server reconcile
- **근거**: 우리 repo 기존 패턴 (`src/components/ColumnsBoard.tsx:trackCardMutation`).
- **이번 task 적용**: 그대로 재사용. 재정렬 실패 시 roll back.

---

## 대안 패턴 (이번 task 제외, 향후 확장 후보)

| 패턴 | 제외 이유 | 추후 도입 가능성 |
|---|---|---|
| 업보트/다운보트 | scope 명시적 제외 (A2 반려) | Card-level Reaction 테이블 추가 시 가능 |
| 실제 YouTube iframe 동기 재생 (모두가 같은 타임스탬프) | 실시간 동기화가 큼. SSE만으론 부족 — WebRTC/WebSocket 필요 | 별도 task (real-time engine research에 이미 일부) |
| 다중 DJ 순번제 | 학급 시나리오에 과함 | 같은 데이터 모델로 여러 `ClassroomRoleAssignment` 추가 시 가능 |
| Explicit lyrics filter / 부적절 콘텐츠 탐지 | 학교 환경에선 중요하지만 YouTube API 호출 필요 | 운영 단계 과제 — 초기에는 교사 게이트(승인) 기반 |

---

## 이번 task에서 고정할 UX 의사결정

phase2 scope 확정 입력으로 이것들을 그대로 전달:

1. 레이아웃: 1-column 세로 리스트 (큐 전용). "Now Playing" row는 리스트 최상단 고정 pinned card.
2. 곡 행 shape: `[썸네일 120×68] [제목 | 채널 | 제출자] [status pill] [DJ: 드래그핸들 + overflow]`.
3. 상태: `pending` · `approved` · `played` · `rejected` 4종.
4. 학생 제출 모달: URL 입력 + (optional) 코멘트 한 줄. YouTube 외 URL은 클라이언트 차단.
5. DJ 액션: 승인/거부/재정렬/삭제/다음으로 이동(= played 마킹).
6. Empty state: 빈 큐 중앙 "🎧 아직 신청 곡이 없어요" + DJ/교사에겐 "첫 곡을 추가해보세요" CTA.
7. 권한 가드: 서버 401/403 응답 시 클라이언트는 조용히 토스트 없이 UI에서만 액션 숨김 (비-DJ 학생이 reorder 드래그 시도 자체가 UI에 노출 안 됨).
