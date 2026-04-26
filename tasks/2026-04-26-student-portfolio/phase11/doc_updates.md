# Doc Updates — student-portfolio

## 업데이트된 문서

| 문서 | 변경 |
|---|---|
| `docs/architecture.md` | "Student Portfolio + Showcase" 섹션 신설 — 데이터 모델 (ShowcaseEntry) · 권한 모델 (3 viewer kind) · API 5건 + channel helper · 라우트 3건 · 컴포넌트 11개 · 디자인 토큰 1 alias · 한도/정책 · 회귀 테스트 · 알려진 한계 |
| `docs/current-features.md` | "학생 포트폴리오 + 자랑해요" 섹션 신설 — 진입점 · 주요 동작 · 권한 · 데이터 모델 · 토큰 · v2 비포함 · 회귀 테스트 |
| `CLAUDE.md` | 변경 없음 (Git 워크플로우 섹션은 phase0~1 사이에 별도 추가 완료) |
| `docs/design-system.md` | 변경 없음 — `tokens_patch.json` 의 `--color-showcase` 는 alias 라 base.css 에만 추가 (design-system.md 의 토큰표는 차후 일괄 업데이트 시 반영) |
| `README.md` | 변경 없음 — 사용자 facing 기능 추가지만 기존 README 가 high-level 프로젝트 소개라 feature 단위 업데이트 안 함 |

## 회고 (3줄)

### 잘된 점
- **사용자 의도와 1:1 매핑**: phase0 에서 사용자 발화 ("좌측 학생목록 + 자랑해요는 메인화면 큐레이션 + 학부모는 자녀+자랑해요만") 가 phase1~9 모두에서 그대로 유지됨. scope drift 0건.
- **권한 모델 분리 (acl-pure vs acl)**: server-only 의존성 없는 pure 함수 분리로 단위 테스트 16건 통과. 다른 feature 도 비슷하게 분리하면 테스트 커버리지 늘리기 쉬움.
- **재사용 우선 원칙**: 신규 컴포넌트 11개지만 카드 본문 (CardBody), 컨텍스트 메뉴 (ContextMenu), 학부모 라우팅 (`/parent/(app)/child/[studentId]/...`) 모두 기존 자산. 신규 hex 0개 (amber alias 만).

### 아쉬운 점
- **Realtime publish() no-op 한계**: 자랑해요 토글 즉시 다른 탭/디바이스 반영 X. 현재 진입 시 fetch fallback. 별도 realtime engine research task 필요.
- **자랑해요 race 보호 강도**: Prisma SELECT FOR UPDATE 미지원으로 transaction COUNT 만 사용. 실제 race 빈도는 낮지만 멀티 디바이스 동시 토글 시 한도 초과 가능성 잠재. hotfix 시 SERIALIZABLE 격리 또는 raw SQL 필요.
- **시각 검증 미완**: 학생/학부모 세션 가진 실제 사용자가 페이지 진입해야 picture-perfect 검증. 솔로 프로젝트라 사용자 (= 본인) 후속 확인 필요.

### 다음 task 에서 적용할 것
- **권한 helper 분리 패턴**: 새 feature 의 ACL 도 portfolio-acl-pure 처럼 pure / server-only 분리해 테스트 가능하게 시작
- **phase1 이미지 검색 우선 가이드** (이번 task 에서 prompts/feature/phase1_researcher.md 에 박아둠) — 시각 결정 필요 시 도큐 깊이 파지 말고 image search 먼저
- **scope_decision 의 R# 위험 매트릭스 → phase8 review 의 B#로 매핑**: 추적성 좋아 phase 간 일관성 유지에 도움. 다음 task 에도 동일 패턴
