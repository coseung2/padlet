# Phase 1 — Research Pack

## 조사 범위

`request.json` 의 두 축에 매핑되는 벤치마크 + UX 패턴 수집:

| 축 | 우리 요구 | 1차 벤치마크 |
|---|---|---|
| 친구 작품 모아보기 (per-student aggregation) | 좌측 학생 리스트 + 우측 작품 그리드 | Seesaw Journal · Padlet Gallery profile · Mobbin contact app |
| 옵트인 큐레이션 (자랑해요) | 학생 본인 토글로 메인화면 핀 | Instagram pinned posts · Seesaw pinned items · Behance Featured |
| 학부모 뷰 권한 모델 | 자녀 결과물 + 자랑해요 | ClassDojo Portfolio · Seesaw Family Journals |

조사 방법: phase1_researcher.md 의 "조사 우선순위" 가이드대로 **이미지 검색 우선 → 정책 비교만 도큐 텍스트 보강**. 벤치마크 7건, 모두 [`benchmark_index.json`](benchmark_index.json) 에 captured_id 와 함께 기록.

---

## 핵심 발견

### 1. 학생 포트폴리오 페이지 — 어떻게 생겼나

**검증된 패턴: 좌측 사람 리스트 + 우측 그 사람 작품 그리드**

이미지 검색 (`user profile gallery grid sidebar contacts app ui design`, `student portfolio dashboard sidebar layout ui`) 결과 contact 앱·Slack 류·LMS 대시보드 모두 동일 골격. 우리 사용자가 명시적으로 요구한 레이아웃과 1:1 매핑.

> 사용자 발화: "좌측에 학생목록이 있고, 서로서로 이름 눌러서 작품을 볼 수는 있음."

장점:
- 학생 컨텍스트 스위칭이 클릭 1번 — 비교·탐색 시간 짧음
- 모바일에선 stack(리스트→상세) 으로 자연스럽게 변환

단점·리스크:
- 좌측 리스트가 길어지면(학급 30+ 명) 스크롤 길어짐 — 출석번호/이니셜 그룹 chip 으로 빠른 점프 추가 가치 있음
- 빈 상태(작품 0개) 학생은 "아무것도 없어요" 일러스트 + 본인이면 "보드에서 카드 만들어보세요" CTA 권장

**Padlet Gallery profile** (https://padlet.com/gallery) 가 가장 가까운 reference: 한 사용자의 padlet들이 썸네일 그리드 + 제목 + 메타로 깔끔히 정렬. 다만 Padlet 는 "보드 단위" 그리드, 우리는 "카드 단위" 그리드라 카드 디자인 자체는 우리 [`CardBody.tsx`](../../../src/components/cards/CardBody.tsx) 재활용 + 출처 라벨만 추가.

### 2. 자랑해요 — Pinned vs Featured 모델 비교

| 모델 | 작동 | 우리에 적합? |
|---|---|---|
| **Editorial Featured** (Behance Discover) | 큐레이터가 hand-pick. 사용자 의지 무관 | ❌ 솔로 프로젝트 + 학급 자율 정신과 안 맞음 |
| **Pinned by author** (Instagram, Seesaw, Twitter) | 작성자 본인이 N개까지 핀. 피드 최상단 노출 | ✅ 사용자 요구와 1:1 |
| **Algorithmic trending** | 좋아요/댓글 수 기반 자동 노출 | ❌ v1 좋아요/댓글 비스코프 |

→ **결정 권고: Instagram-style pinned-by-author**. Seesaw 도 동일 패턴 (`"Pinned items will appear at the top, with all other student work appearing in chronological order."` — Seesaw Help Center).

핵심 디자인 결정 사항:
- **N=얼마?** Instagram 은 3개. 우리도 학생당 3~5개 권장 (phase2 strategist 가 확정). 너무 많으면 "자랑해요 = 일반 피드".
- **메인화면 어디?** 학급 메인 (학생이 로그인 후 보는 dashboard) 의 상단 highlight 영역. 모든 학생의 자랑해요를 시간순/랜덤으로 합쳐 노출.
- **시각 구분 배지** Behance 처럼 카드 코너에 작은 🌟/📌 배지. 포트폴리오 페이지에서도 동일 배지로 자랑해요 항목 식별 가능.

### 3. 가시성·권한 모델 — 우리는 어디 위치하나

이미지로는 안 보이는 정책 차원이라 도큐 텍스트로 비교:

| 제품 | 학생 ↔ 학생 | 학부모 ↔ 자녀 | 학부모 ↔ 다른 학생 | 교사 승인 게이트 |
|---|---|---|---|---|
| **Seesaw** | ❌ (자기 journal 만) | ✅ | ❌ | 부분적 (댓글 등) |
| **ClassDojo** | ❌ | ✅ (승인 후) | ❌ | ✅ 전면 |
| **우리 안** | ✅ (학급 내) | ✅ (자녀 결과물 + 자랑해요) | ❌ (자랑해요만 노출, 무자녀 학생 결과물은 X) | ❌ (학생 자율) |

**우리 모델의 독특한 점**: 학생 ↔ 학생은 보드에서 이미 공개돼 있어 포트폴리오 페이지는 단순 aggregation. ClassDojo/Seesaw 는 가족 채널 중심이라 peer-visible 컨셉이 없음. 즉 **벤치마크가 부분만 매핑** — peer 측은 Mobbin/Slack 등 일반 contact 패턴, family 측은 Seesaw/ClassDojo.

**리스크**: 교사 승인 게이트 없음 → 학생이 부적절한 카드를 자랑해요에 올릴 위험. 완화책 후보:
1. 학급 내 공개 컨텍스트라 사회적 통제가 작동 (다른 학생·교사가 즉시 봄)
2. 교사가 학생별 자랑해요 N개 한도를 학급 설정으로 둘 수 있게 (phase2 검토)
3. 부적절 신고 버튼 (v1 비스코프, 후속 task)

### 4. 출처 표시 — 카드별 breadcrumb

사용자 명시: "어떤 보드인지, 어떤 주제였는지, 주제별보드가 아니라면 주제는 생략"

벤치마크:
- Padlet Gallery: 카드 하단 작성자 + 시간 (`Gallery · 16일`)
- Behance: project 페이지에 'In: Branding' 류 컬렉션 라벨
- Seesaw: post 가 Activity 와 연결 (`Activity: Math worksheet`)

→ 우리 카드는 보드+칼럼 이중 컨텍스트. 권고 형식:
- 주제별 보드: `{보드 제목} · {칼럼 제목}` (예: "미술 4월 · 입체파")
- 주제별 아닌 보드(freeform/grid/stream/dj-queue 등): `{보드 제목}` 만
- 클릭 시 원본 카드 위치로 deep-link (board id + section id)

---

## 적용 권고 (phase2 strategist 입력)

| 결정 영역 | 권고 | 근거 |
|---|---|---|
| 포트폴리오 페이지 레이아웃 | 좌측 학생 리스트 + 우측 카드 그리드 (two-pane peer roster) | 사용자 요구 + Mobbin/Slack 보편 패턴 |
| 카드 디자인 | 기존 [`CardBody.tsx`](../../../src/components/cards/CardBody.tsx) 재활용 + 출처 라벨 한 줄 추가 | 새 디자인 토큰 만들 이유 없음, 일관성 |
| 출처 라벨 | `{보드 제목} · {칼럼 제목}` (주제별만) / `{보드 제목}` (그 외) | 사용자 명시 + Padlet/Seesaw 패턴 |
| 자랑해요 데이터 모델 | `Card.isShowcased boolean` (B 안: 별도 ShowcaseEntry 모델은 N대1 매핑 필요해질 때) | 현 보드 구조와 동일 컨벤션. phase3 architect 에서 schema lock |
| 자랑해요 UI 위치 | 학급 메인(`/student` dashboard) 상단 highlight 섹션 | "메인화면에 띄운다" 사용자 발화 직접 매핑 |
| 자랑해요 시각 표식 | 카드 코너 작은 🌟 배지 (포트폴리오·메인 양쪽) | Behance Feature Flag 패턴 |
| 자랑해요 학생당 한도 | v1 3~5개 (정확값 phase2 결정) | Instagram 3 / Twitter 1 / Seesaw 무제한 — 학생 자율도 + 메인화면 시각적 정리 균형 |
| 학부모 뷰 | 좌측 자녀 리스트(다자녀 시) + 우측 = 자녀 카드 ∪ 학급 자랑해요 | Seesaw Family Journals 동일 골격, 권한만 우리 정책으로 필터 |

## 명시적 비포함 (벤치마크 있으나 v1 보류)

- 검색·필터 (Seesaw 폴더 필터 X — request.json non_goals)
- 좋아요·댓글 (ClassDojo/Seesaw 풀 기능 X — request.json non_goals)
- 교사 승인 워크플로 (ClassDojo 에 있음 — request.json non_goals, "학생 자율" 채택)
- 부적절 신고 버튼 (별도 후속 task)

## 미해결 질문 (phase2 strategist 가 잠가야 함)

1. 자랑해요 N=얼마? (학생당, 학급 단위)
2. 자랑해요 제거 정책 — 학생 자기 토글만? 카드 삭제 시 자동 제거? 교사 강제 제거 권한?
3. 학부모 뷰의 자랑해요 — 학급 전체 자랑해요 vs 자녀 학급만? (자녀가 한 학급에만 속하면 동일하지만 형제일 때 분기)
4. 포트폴리오 페이지 진입 경로 — 학생 사이드 nav 의 별도 탭? 학급 페이지의 학생 카드에서 진입?
