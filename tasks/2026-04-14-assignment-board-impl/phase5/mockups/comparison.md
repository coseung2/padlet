# Mockup Comparison — assignment-board grid view

4개 변형 모두 phase4 `design_brief.md` 요구사항(5×6 격자, 상태 4종, 번호+이름+썸네일, 미제출 회색 placeholder+번호, 접근성)을 충족한다. 차이점은 **시각 톤 / 상태 표현 방식 / 정보 밀도**.

공통 컴포넌트(모달·학생 반려 뷰)는 별도 파일로 분리:
- `modal-fullscreen.html` — 풀스크린 모달 (반려 inline 확장 + prev/next 네비)
- `student-returned-view.html` — 학생 반려 배너(가이드 상단 고정)

---

## v1 — Notion Minimal (`v1-notion-minimal.html`)

**특징**
- 기존 padlet 디자인 시스템(`--color-surface` 흰 배경 + `--color-border` 1px + `--radius-card` 12px) 그대로 확장
- 상태 = pill 뱃지 4종 (`--color-status-*` 신규 토큰 6개와 직결)
- 미제출 = 회색 placeholder에 큰 번호 숫자만

**장점**
- ✅ 기존 카드(Breakout, plant-roadmap 등)와 시각 일관성 최상 — AI slop 위험 최소
- ✅ 신규 토큰이 디자인 시스템 "시맨틱 상태색" 규칙 기존 관례에 매끄럽게 편입
- ✅ 정보 밀도 적정 — 5×6 격자에서 번호·이름·상태·썸네일 4개 레이어 모두 읽힘

**단점**
- ⚠ bulk scan 시 pill 뱃지가 썸네일 영역 밖에 있어 스캔 속도는 v3/v4보다 느림

---

## v2 — Seesaw Warm (`v2-seesaw-warm.html`)

**특징**
- 따뜻한 베이지/오렌지 팔레트 + drop shadow + 둥근 14~18px 라디우스 + 이모지
- 초등 저학년 친화적 톤

**장점**
- ✅ 아동 대상 감성 톤으로 Seesaw/Classroom 레퍼런스 중 "따뜻함" 최대
- ✅ hover 시 lift 애니메이션으로 터치 피드백 강함

**단점**
- ❌ **디자인 시스템 일관성 파괴** — 기존 `--color-bg:#f6f5f4` / Inter / 12px radius 원칙에서 이탈
- ❌ 이모지 남용 = AI slop 경계선
- ❌ 신규 토큰 수가 v1 대비 3배 이상 필요(warm 팔레트 전체 신설)
- ❌ Aura-board는 이미 Notion 톤으로 플랫폼 정체성 고정 → 단일 기능만 Seesaw 톤을 쓰면 모순

→ **탈락**: AI slop + 디자인 시스템 비일관성

---

## v3 — Classroom Compact (`v3-classroom-compact.html`)

**특징**
- 썸네일 주변 3px 컬러 outline = 상태 표현
- 우상단 8px dot = 상태 색 반복 (리던던시)
- 라디우스 10px, gap 8px로 v1보다 밀도 높음

**장점**
- ✅ 상태색이 썸네일과 밀착 → bulk scan 매우 빠름
- ✅ 태블릿 세로 뷰에서 v1보다 1~2row 더 들어감 (밀도↑)

**단점**
- ⚠ outline-offset:-3px로 썸네일 내부를 침범 — 썸네일 이미지 가장자리가 outline에 먹힘
- ⚠ dot과 outline의 이중 색 표현이 일부 색각이상에게 혼란 유발 가능
- ⚠ 뱃지 텍스트가 없어 스크린리더 라벨을 추가로 합성해야 함 (v1은 pill 텍스트 그대로 차용 가능)

---

## v4 — Dashboard Scan (`v4-dashboard-scan.html`)

**특징**
- 상단에 `미제출 14 / 제출 10 / 확인 5 / 반려 1` **bulk stat 바** 추가
- 각 slot 상단에 4px 컬러 status bar (Linear/Jira 칸반 스타일)

**장점**
- ✅ 교사 워크플로우("누가 안 냈나" 먼저) 직접 해결 → summary stat으로 즉시 답
- ✅ status bar는 썸네일과 분리돼 이미지 가장자리 침범 없음

**단점**
- ⚠ summary stat은 **phase2 scope OUT-1 (SubmissionHistory 엔티티)** 과는 무관하지만, stat 집계 로직이 v1에 없는 추가 구현 — scope 경계 확장 소지
- ⚠ 30개 slot에서 status bar 4px + 썸네일 + 메타 = DOM 자식 수 증가 (R1 DOM≤180 여유 축소)
- ⚠ 4열 stat 바가 태블릿 가로 768px에서 깨짐 (반응형 breakpoint 추가 필요)

---

## 최적안 결정 근거

| 차원 | v1 | v2 | v3 | v4 |
|---|---|---|---|---|
| 디자인 시스템 일관성 | 9 | 3 | 8 | 7 |
| bulk scan 속도 | 7 | 6 | 9 | 9 |
| 접근성(색각/라벨) | 8 | 6 | 6 | 7 |
| AI slop 내성 | 9 | 4 | 8 | 7 |
| scope 준수 | 10 | 8 | 10 | 7 |
| 탭 S6 Lite DOM 여유 | 9 | 7 | 9 | 6 |
| 평균 | **8.67** | 5.67 | 8.33 | 7.17 |

**선정: v1 — Notion Minimal**

- 디자인 시스템 정체성과 직결되는 "일관성 / AI slop / scope" 3개 축에서 독보적.
- bulk scan 약점은 `modal-fullscreen.html`의 prev/next + 반려 사유 inline으로 보완됨(한 번 열면 연속 탐색).
- v3의 썸네일 outline 아이디어는 **v1의 pill 뱃지 보조로 차용 불가** — 혼합 시 상태 색 중복 → 탈락.
- v4의 summary stat은 **v2 research 이월 후보** (본 task의 `/reminder` 엔드포인트 UX와 결합 가능).

v2 → `rejected/`로 이동, v3·v4는 감사 이력으로 `mockups/` 유지(차용 여지 있음).
