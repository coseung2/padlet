# Design Review — student-portfolio

## 평가

| 차원 | 점수 (0~10) | 코멘트 |
|---|---|---|
| 일관성 (디자인 시스템) | 9 | 신규 토큰 1개만(`--color-showcase` alias). 카드/모달/ContextMenu 모두 기존 컴포넌트 재사용. 좌측 학생 리스트 행 스타일은 기존 classroom 패턴(아바타+이름+메타) 과 일관 |
| 계층 (정보 우선순위) | 9 | 카드: 콘텐츠 → 제목 → 출처 → 자랑해요 배지 순으로 시각 가중. 좌측: 본인 강조 → 학생명 → 작품 수. brief 의 우선순위 1~3 충실 반영 |
| 접근성 (WCAG) | 8 | 키보드 동작·aria-label·focus outline·44px 터치타겟 모두 design_brief §4 에 명시. 색만으로 정보 전달 회피 (본인 인디케이터 = 색+굵기+점). 한도 모달 focus trap 명시. 0.875rem 학생명은 작은 편이라 모바일 zoom 시 가독성 확인 phase9에서 |
| 감성·톤 | 8 | 학급 친구 아이덴티티(이모지 🟢 본인 표시)와 자랑해요 amber 의 따뜻함이 어울림. 기존 plant-roadmap/vibe-arcade 의 emoji-rich 톤과 일관. AI generated stock 일러스트 도입 X (직접 emoji 사용) |
| AI slop 감지 | 9 | placeholder lorem ipsum 없음, 무의미한 그라디언트 없음, 의미 있는 이모지(📚 📭 🌟 🔒) 만 사용. design_spec ASCII 와이어프레임은 이미지 의존도 0 |
| 반응형 | 8 | ≥768px 2-pane / <768px stack 명시, scroll-snap carousel, `auto-fill minmax` 그리드. 태블릿 중간 폭(768~1024px) 좌측이 너무 좁아질 가능성 있음 — `clamp(220px, 22%, 280px)` 로 가드는 했으나 phase7 구현시 실측 확인 필요 |

**전체 평균: 8.5 / 10** ✅ phase7 진입 가능 (CLAUDE.md 임계 ≥8 만족).

## design_brief.md 요구사항 매핑 검증

| 요구사항 | spec 반영 | 비고 |
|---|---|---|
| 화면 A 5상태 (empty/loading/ready/error/success) | ✅ | spec §2 A 모든 상태 wireframe |
| 화면 B 3상태 | ✅ | spec §2 B (empty=섹션 미노출 명시) |
| 화면 C ready | ✅ | spec §2 C 모달 wireframe |
| 화면 D 3상태 | ✅ | spec §2 D 자녀 1명/≥2명/empty |
| 정보 우선순위 1~3 | ✅ | spec wireframe 시각 가중치 일치 |
| 인터랙션 명세 (호버·드래그·키보드) | ✅ | brief §3 → spec §2 wireframe 행동 일치 |
| 접근성 5개 | ✅ | brief §4 그대로 — spec §2 wireframe 에 a11y 마크업 가이드 포함 |
| 디자인 시스템 신규 토큰 | ✅ | tokens_patch.json `--color-showcase` |

## 권장 수정 (phase5/design_spec.md 덮어쓸 수정사항)

1. **태블릿 폭 보강**: 좌측 폭 `clamp(220px, 22%, 280px)` → `clamp(220px, 28%, 280px)` 으로 살짝 보수적 ratio. (phase7 구현 후 실측)
2. **빈 학생(작품 0개)** 시각: spec §2 좌측 wireframe `(0)` 뱃지 — 회색만 말고 `--color-text-faint` 명시 (이미 §3 토큰에 있음, wireframe 와 분리돼 있어 구현시 누락 가능 → 노트 추가)
3. **공동작성자 본인 표시**: 본인이 공동작성한 카드는 좌측 리스트 어디에 노출? — 작성자(studentAuthorId) 학생 화면에서 보이고, 공동작성자(authors) 화면에서도 동일 카드 보임. 양쪽 그리드에 중복 노출 OK (PortfolioStudentView 가 OR 조건으로 fetch). 메모만 추가, 디자인 변경 X.

위 3건은 spec 노트 추가만, 변형 재선택 X. 즉시 phase7 진입.

## AI slop 감지 — 통과

체크리스트:
- ✅ Lorem ipsum 없음
- ✅ 의미 없는 그라디언트 없음 (모든 색상 토큰 시맨틱)
- ✅ 무의미한 반복 패턴 없음 (학생 리스트는 데이터 기반)
- ✅ stock photo placeholder 없음 (실제 카드 콘텐츠가 들어감)
- ✅ "예시 텍스트" 류 placeholder 없음 (구체 wireframe — "김민수의 작품 12개" 같은 실제 라벨)

## 핸드오프

평균 8.5 ≥ 8 통과. design_spec.md 주요 변경 없음 (수정 권고 3건은 phase7 구현 시점 메모로). phase7 coder 진입.
