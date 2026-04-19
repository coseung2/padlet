# Hotfix Deploy — dj-board-layout

## 1. PR/머지 정보
- **PR URL**: 없음 (solo project direct-merge 관행, memory: `feedback_solo_direct_merge.md`).
- **병합 방식**: `fix/dj-board-layout` → `main` fast-forward (2 커밋).
- **병합 SHA 범위**: `bdf00bf..cfdecd1`
  - `9f506d8 fix: dj-board 우측 랭킹 컬럼 가변폭 + sticky 제거 (dj-board-layout)` — 실제 CSS·회귀 테스트
  - `cfdecd1 docs(dj-board-layout): phase0-3 incident artifacts + REVIEW_OK` — 파이프라인 산출물
- **병합/푸시 시각**: 2026-04-19 23:43 UTC (= 2026-04-20 KST 08:43).
- **사전 검증**: 로컬 `tsc --noEmit` 통과 · vitest 회귀 `2 passed (2)` · phase3 REVIEW_OK.marker 존재.

## 2. 배포 파이프라인
- **CI/배포**: Vercel 자동 배포. `main` push 이벤트가 프로덕션 빌드 트리거.
- **배포 ID**: Vercel 대시보드(`vercel.com/[team]/padlet/deployments`)에서 `cfdecd1` SHA 배포 확인 필요. CLI 로그인 시 `vercel inspect` 로 자동 파싱 가능.
- **리전 정렬 확인**: icn1 Functions + Supabase ap-northeast-2 구성 유지됨 (CSS-only 변경이라 런타임 영향 없음, memory: `project_vercel_supabase_region.md`).

## 3. 프로덕션 검증 (즉시)

### 재현 절차 (diagnosis.md §1 기반)
1. DJ 역할 학생 또는 교사 계정으로 `/board/[id]` (layout=`dj-queue`) 보드 진입
2. 큐에 YouTube 곡 5곡 이상 신청 + 몇 곡 `played` 처리
3. 뷰포트 ≥ 1280px 로 관찰
4. 페이지 스크롤

### 기대 결과
- 우측 `.dj-ranking` 영역이 뷰포트 폭에 따라 260~340px 가변으로 확장
- 스크롤 시 사이드바가 본문과 함께 이동 (sticky 해제) → 본문 하단에 과도한 우측 공백 없음

### 실측 상태
**사용자 확인 대기**. 이 hotfix 파이프라인 세션에서는 프로덕션 계정/Vercel 대시보드 접근이 없어 자동 검증 불가.

## 4. 롤백 절차

### 즉시 롤백 (Vercel 대시보드)
1. `vercel.com/[team]/padlet/deployments`
2. 직전 배포(`bdf00bf feat(classroom-bank): …`) 항목 → `Promote to Production`
3. 확산 10~30초 이내 롤백 완료

### Git 롤백 (main에 revert)
```bash
cd "/mnt/c/Users/심보승/Desktop/Obsidian Vault/padlet"
git revert --no-edit cfdecd1 9f506d8
git push origin main
```
- 산출물 + CSS 변경 모두 되돌림. 회귀 테스트도 제거되므로 재발 방어는 사라짐 — 원인 재분석 후 재착수 필요.

### 롤백 트리거 조건
- DJ 보드 배포 후 5분 이내 프런트엔드 레이아웃 크리티컬 이상(예: 컬럼 겹침, 카드 비가시)
- 랭킹 사이드바 기능 손상 보고(스크립트 에러 콘솔)
- Lighthouse/CWV 관측치가 배포 전 대비 유의한 회귀

## 5. 카나리 관찰(phase5) 핸드오프
- severity: low. `_index.md` §카나리 기준 최소 30분 관찰.
- 이상 신호 감지 시 phase5 `canary_report.md` 이상 기록 + 상기 §4 절차로 롤백.
