# Deploy Log — board-settings-panel

## 1. PR 정보

**오케스트레이터 지시**: Round A 에이전트는 push/merge 하지 **않음**. 사용자가 모든 Round A 완료 후 통합 머지.

- branch: `feat/board-settings-panel`
- base: `main`
- local commits: phase0–phase10 (분리 commit, 아래 §2 참조)
- PR URL: (사용자가 생성 예정)
- merge SHA: (미정)

## 2. CI 결과 (로컬 검증)

- `npx tsc --noEmit` → EXIT=0
- `npm run build` → EXIT=0
- dev smoke: `/`, `/board/columns-demo?as=owner|viewer`, `/board/columns-demo/s/s_todo/share?as=owner|viewer`, `POST /api/sections/s_todo/share?as=owner` 모두 정상

## 3. 배포 대상

- preview: 없음(머지 보류)
- production: 없음(머지 보류)

## 4. 프로덕션 검증

머지 후 사용자가 수행할 체크리스트:
- [ ] 프로덕션 `/board/{owner-owned-columns}` 진입 → ⚙ 버튼 노출 확인
- [ ] ⚙ 클릭 → BoardSettingsPanel → "브레이크아웃" 탭에서 섹션 링크 생성/회전/복사 3동작 확인
- [ ] 섹션 헤더 ⋯ 1개만 노출, 이름 변경/삭제/Canva 메뉴 전체 작동
- [ ] viewer 계정으로 접속 시 ⚙ 미노출, 섹션 ⋯ 미노출
- [ ] `/board/[id]/s/[sectionId]/share` 진입 시 배너 문구 "보드 설정 → 브레이크아웃" 확인
- [ ] Galaxy Tab S6 Lite(Chrome Android UA, 1500×2000) 직접 확인: 패널 애니메이션/레이아웃 OK

## 5. 롤백 절차

- 단일 브랜치 revert: `git revert <merge-sha> -m 1`
- 부분 롤백: `src/components/BoardSettings{Launcher,Panel}.tsx` 제거 + BoardHeader에서 `<BoardSettingsLauncher/>` 렌더 제거 + `SectionActionsPanel` 의 Tab union에 `"share"` 복원 + `ColumnsBoard` 이전 이중 ⋯ 구조 복원.
- DB 변경 없음 → DB 롤백 불필요.

## 6. 코디네이션 주의

- 병렬 Round A 에이전트(`image-pipeline`, `iframe-virtualization`)가 `DraggableCard.tsx`/`next.config.ts`를 건드릴 수 있음. 본 task는 두 파일 미접촉 → 물리적 충돌 없음.
- 공유 파일 `src/app/board/[id]/page.tsx` 는 본 task 가 `BoardHeader` 구조 + `settingsSections` prop 만 추가. 다른 에이전트가 같은 파일의 다른 영역을 수정했다면 cherry-pick 머지로 해결.
