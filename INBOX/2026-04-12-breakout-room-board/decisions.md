# Phase 3 — Breakout Room 보드 인터뷰 결정

> task_id: `2026-04-12-breakout-room-board`
> session_id: `interview_20260412_102210`
> 완료 시각: 2026-04-12
> 최종 ambiguity: **0.15** (목표 ≤ 0.2 달성)
> 인터뷰 라운드: 3라운드
> 완료 신호: `Ready for Seed generation`
> 답변 방식: **자율 판단** (사용자 부재, AskUserQuestion 미사용)

---

## 1. 확정 결정 요약

### Q1 — 시스템 기본 제공 템플릿 종류

**결정: v1에 7종 포함, 1종(월드카페) v2 파킹 → 총 8종 카탈로그**

| # | 템플릿 | Tier | recommendedVisibility | 비고 |
|---|---|---|---|---|
| 1 | KWL 차트 | Free | own-only | 전 학년 보편 |
| 2 | 브레인스토밍 | Free | own-only | 발산 오염 방지 |
| 3 | 아이스브레이커 | Free | own-only | 모둠 친밀도 |
| 4 | 찬반 토론 | Pro | own-only | 논지 독립 형성 |
| 5 | Jigsaw | Pro | own-only | expert/home 단계 독립 |
| 6 | 모둠 발표 준비 | Pro | peek-others | 상호 학습 가치 |
| 7 | 갤러리 워크 | Pro | peek-others | 상호 관람이 목적 |
| 8 | 6색 모자 | Pro | own-only | 모자별 역할 독립 사고 |
| — | 월드카페 | v2 | peek-others | 운영 복잡도 높음, v1 제외 |

**근거**:
- Free 3종은 전 학년 보편성·교사 학습 곡선 최저·"첫 수업 성공 경험" 최적화
- Pro 5종은 고급 협력 학습 범주로 묶여 Pro 체감 가치 확보
- 찬반 토론은 중·고 편향이라 Free 제외(저학년 부적합)
- 월드카페는 호스트 학생 지정·시간 단위 로테이션 등 v1 UX 예산 초과 → v2 파킹

---

### Q2 — Section 재활용 vs 신규 BreakoutGroup 엔티티

**결정: Section 재활용 유지 (BreakoutGroup 신설 X)**

**근거**:
- T0-① 섹션 격리 뷰 인프라(WS 채널·rbac·라우트 `/b/:slug/s/:sectionId`)가 이미 Section 단위
- `Section.accessToken`이 "Breakout view teacher-rotatable access token"으로 이미 정의됨
- Jigsaw의 "한 학생 두 모둠 소속" 시나리오는 `BreakoutAssignment.role = "expert" | "home"` 플래그로 처리 가능
- 별도 엔티티 생성 시 `BreakoutGroup.sectionId` 1:1 중복만 남고 쿼리 경로 2배 증가
- 라벨 혼동(모둠 vs 섹션)은 i18n 계층에서 `layout=="breakout"`일 때 "모둠 N"으로 표기하여 해소

---

### Q3 — 모둠 인원·개수 기본값

**결정**:
- 기본 모둠 수: **4**
- 기본 모둠 정원: **6** (soft limit)
- 상한 모둠 수: **10** (성능 예산·UI 제약)
- 상한 정원: **6** (협업·성능 밸런스)

**근거**:
- 한국 공립학교 교실 28~32명 기준 4~5명 × 6~8모둠이 표준 구성
- 기본 4모둠(4×6=24명)은 소규모 학급·특별실 수업에도 대응
- 정원 6은 협업 품질 임계점(7명↑은 "주변부 학생" 증가)
- 모둠 10 상한은 sketch P13(태블릿 성능 체크리스트) 예산 내

---

### Q4 — 모둠 간 상호 열람 기본값

**결정**:
- 기본값: **own-only** (자기 모둠만)
- 템플릿별 `recommendedVisibility` 힌트 제공 (Q1 표 참조)
- 교사 override: 개설 시 드롭다운으로 own-only/peek-others 전환 가능
- **teacher-tour는 기본 권장값에서 제외** — 교사는 모든 템플릿에서 항상 전체 접근 권한 보장(상위 집합). `breakoutVisibility` 필드는 "학생 기준 가시성"만 기술.

**근거**:
- 대다수 교육 활동에서 타 모둠 답 열람은 학습 효과 저하(집단사고·답 베끼기)
- 갤러리 워크·모둠 발표 준비만 예외적으로 peek-others 권장
- 교사 권한은 별도 축(RBAC viewSection)으로 처리 → 가시성 모드와 직교

---

### Q5 — 학생 모둠 이동 허용 여부 (v1)

**결정: v1은 교사 재배정만 허용. 학생 셀프 이동은 v2 파킹.**

**세부**:
- `teacher-assign` 모드: 학생 이동 불가 (신고 버튼만 제공)
- `self-select` 모드: **초기 1회 선택**만 허용, 변경은 교사 승인 필요
- `link-fixed` 모드: 물리적 링크 배포이므로 이동 개념 없음
- `BreakoutAssignment.@@unique([sectionId, studentId])` 제약 유지
- 학생이 이동하더라도 **이전 모둠에 쓴 카드는 원래 섹션에 남음** (`Card.sectionId` 고정, sketch R6 정책)

**근거**:
- self-select의 초기 몰림 완화는 `Section.capacity` soft limit + 정원 표시로 충분
- 학생 자율 이동은 저작권 꼬임·WS 채널 구독 재설정 등 구현 비용 큼 → v2

---

### Q6 — 템플릿 구조 복제: 복사 vs 참조

**결정: 복사(독립) 방식. 모둠마다 다른 버전 공존 허용.**

**세부**:
- 보드 개설 시 `BreakoutTemplate.structure.sectionsPerGroup[]`를 모둠 수(N)만큼 복제하여 Section INSERT
- 모둠 섹션의 카드는 모둠 간 완전 독립 (교사가 1모둠 카드 수정해도 2모둠에 전파 X)
- **예외 — `role="teacher-pool"` 공유 섹션**: 보드 레벨 단일 섹션이라 자연스럽게 전 모둠 공유
- **"전 모둠 일괄 배포" 액션**: 교사 UI에 "모든 모둠에 이 카드 복제" 명시적 버튼 제공(서버가 N모둠 섹션에 INSERT 반복, 단발 액션)
- **템플릿 원본 수정 역전파 X**: `BreakoutTemplate.structure` 수정은 이미 파생된 Board에 영향 없음. 버전 관리는 새 Board 개설 시점에만 반영.

**근거**:
- 복사 방식의 핵심 가치 = "모둠 간 서로 영향 없는 독립 작업 공간" 보장
- drawing-board-library-roadmap의 AssetAttachment 복사 패턴과 일관
- 참조 방식은 카드 실시간 브로드캐스트 비용 폭증 + 학생 입력이 타 모둠에 덮어쓰기 사고 위험

---

### Q7 — Tier 연결 (Free vs Pro 템플릿 접근)

**결정**:
- **브레이크아웃 보드 자체**: Free/Pro 공통 기본 기능 (tier gating 없음)
- **시스템 템플릿**: Free는 3종 (KWL·브레인스토밍·아이스브레이커), Pro는 전체 8종
- **교사 커스텀 템플릿 저장**: Free **3개**까지, Pro **무제한**
- **학교 공용 템플릿 등록** (`scope="school"`): **Pro 전용**
- `BreakoutTemplate.requiresPro=true` 플래그로 시스템 템플릿 4~8번 게이팅
- 쿼터 초과 시: 안내 모달 + 업그레이드 CTA (Seed 2 Tier 정책 승계, 자동 결제 X)

**근거**:
- Seed 2 Tier 정책 (Free 1반→5반은 오타, 실제 1반이 맞음; Pro 5반)과 일관
- 교사 커스텀 3개는 "맛보기" 수준, Pro 전환 유인 확보
- 학교 공용 템플릿은 관리자급 운용이라 Pro 타당
- 브레이크아웃 레이아웃 자체 유료화는 교사 진입 장벽 → 공통 기본으로 유지

---

## 2. 인터뷰 로그 요약

| 라운드 | 질문 | 확정 결정 |
|---|---|---|
| 1 | Q6 복제 방식 세부(수업 중 교사 수정 전파 여부) | 모둠별 독립 버전 공존, 명시적 "전 모둠 복제" 액션 제공 |
| 2 | Q1+Q7 동시 — Free 3종 조합 | Free=KWL·브레인스토밍·아이스브레이커, Pro 5종(찬반·Jigsaw·발표준비·갤러리·6색), 월드카페 v2 |
| 3 | Q4 템플릿별 recommendedVisibility 배분 | own-only 5종 / peek-others 2종 / 6색 모자 own-only / 월드카페(v2) peek-others |

Q2·Q3·Q5는 초안 자율 방향이 충분히 근거 있어 인터뷰 쿼리 없이 통과.

---

## 3. 새로 드러난 분기 (현재 세션 편입 금지 — 파킹 메모)

| 분기 | 내용 | 처리 |
|---|---|---|
| 월드카페 템플릿 | v1 운영 복잡도 초과(호스트 지정·시간 로테이션) | v2 파킹 — `ideas-parking-lot.md`에 기록 권장 |
| 학생 셀프 모둠 이동 | 저작권 꼬임·WS 재구독 비용 | v2 파킹 |
| "전 모둠 일괄 배포" 액션 UX | 명시적 버튼 상세(확인 모달·되돌리기) | phase5 integrate에서 roadmap 카드로 메모 |
| 교사 커스텀 템플릿 저장 UX | 기존 보드 → "템플릿으로 저장" 플로우 구조 JSON 직렬화 상세 | sketch §1-C 보완 여지, phase4 seed 내 편입 가능 |

---

## 4. 검증 게이트 자가 점검

| 항목 | 상태 |
|---|---|
| ambiguity ≤ 0.2 | ✅ 0.15 |
| `Ready for Seed generation` 신호 | ✅ 확인 |
| session_id.txt | ✅ 작성 |
| decisions.md | ✅ 본 문서 |
| 7개 미결 질문 모두 결정 | ✅ Q1~Q7 해소 |
| AskUserQuestion 미사용 (자율 모드) | ✅ 준수 |
| 이전 결정 재질문 없음 | ✅ Seed 2 Tier·매트릭스 데스크톱 등 승계 |

**다음 단계**: phase4 seed-generator가 `ooo seed --session interview_20260412_102210`으로 Seed 생성.
