# Doc Updates — plant-journal-v2

## 업데이트된 문서
- `docs/current-features.md`: plant-roadmap layout 설명을 "노선도"→"세로 타임라인"으로 교체; `Plant Journal` 섹션에 v2 서브섹션 추가 (세로 레이아웃 + 교사 드릴다운 라우트 + 권한 완화 + nickname PATCH).

## 업데이트하지 않은 문서 (사유)
- `docs/architecture.md`: 코어 스택 문서 — plant 내부 구현은 별도 표 없음. 이번 변경은 라우트 1개 신설 + API 권한 완화로 아키텍처 계약(Next.js App Router + Prisma + NextAuth)에 해당하지 않아 수정 불필요.
- `docs/design-system.md`: `tokens_patch.json = { additions: [], removals: [] }`이므로 skip.
- `CLAUDE.md`: 경로/오케스트레이션 규칙 변경 없음.
- `README.md`: 사용자 문서에 plant 세부 가이드는 기존에도 없음.
- `canva project/plans/plant-journal-roadmap.md`: 이 worktree의 git tree에 해당 경로 없음(Obsidian vault 사용자 파일로 보임). 본 task 산출물(`tasks/2026-04-13-plant-journal-v2/phase2/scope_decision.md` + `phase9/qa_report.md §AC11`)에 "세로 타임라인" 기록이 남아 있으므로, 사용자 쪽 repo-외 doc은 사용자가 업데이트하도록 위임.

## 회고 (3줄)
- **잘된 점**: v2 레이아웃 변경이 컴포넌트 경계를 유지하면서(ObservationEditor/NoPhotoReasonModal/라이트박스 그대로 재사용) 달성됐고, 교사 드릴다운은 `RoadmapView`의 `editAnyStage` 한 프롭만으로 재사용됐다. API 권한 완화는 `canAccessStudentPlant`의 기존 teacher gate를 믿고 얹기만 하면 되어 감사 경로가 단순해졌다.
- **아쉬운 점**: canva-side 로드맵 문서가 repo 밖에 있어 AC11이 자동으로 수렴되지 않았다. 솔로 프로젝트라도 FEEDBACK 경로를 repo 안에 두는 관례를 세우면 다음 task에서 자동 검증 가능해진다.
- **다음 task에서 적용할 것**: 교사 감사 배지(P6)와 "교사가 수정함" 플래그는 `editorId`/`editedAt` 컬럼이 필요한 후속 feature task로 분리. 이번에 세운 `TeacherStudentPlantView` 경계가 배지를 추가해도 깔끔히 확장될 수 있게 설계돼 있음.

## 학습 포인트 (memory-worthy)
- "Edit-on-behalf" 기능 추가 시, 최소 침습 경로는 **기존 `canAccess*` gate 안의 teacher 분기를 신뢰하고, 개별 mutation 핸들러의 owner 전용 가드만 `actor.kind==="teacher"` OR로 확장**하는 것. 새 permission 레이어 만들지 말 것.
- 가로 → 세로 타임라인 같은 레이아웃 전환은 CSS Grid `grid-template-columns: 48px 1fr`가 "레일 + 본문" 메타포를 한 줄로 해결한다. 기존 `.plant-obs-*` 클래스는 컨테이너와 독립적이므로 재사용이 쉬웠다.
