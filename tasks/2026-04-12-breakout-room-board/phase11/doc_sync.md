# Phase 11 — Doc Sync

## 동기화 대상
- `docs/architecture.md` — BreakoutTemplate/Assignment/Membership 섹션 추가
- `docs/current-features.md` — "모둠 학습 보드" 기능 항목 추가
- (design-system.md 변경 없음 — 기존 토큰만 재사용)
- (README.md / CLAUDE.md 변경 없음 — 경로/환경 무변경)

## BR-5~9 핸드오프 노트

이 agent는 **BR-1 ~ BR-4 foundation만** 완료했다. 다음 agent는:

### BR-5: Deploy Mode 런타임
- `link-fixed`: 섹션별 accessToken을 URL로 배포 (교사가 카카오톡/구글클래스룸으로 공유)
- `self-select`: 학생이 모둠 목록에서 초기 1회 선택 → BreakoutMembership INSERT (@@unique로 중복 방지)
- `teacher-assign`: 교사가 학생 리스트에서 모둠 드래그 배정
- 파일 후보: `src/app/api/breakout/assignments/[id]/deploy/route.ts`, `src/app/api/breakout/memberships/route.ts`

### BR-6: Visibility WS 게이팅
- `own-only`: 학생 WS 구독 시 본인 BreakoutMembership.sectionId 채널만 subscribe
- `peek-others`: 전체 group section 채널 subscribe 허용 (교사-pool은 계속 제외 가능)
- `src/lib/realtime.ts` 확장 지점

### BR-7: 교사 배정 관리 UI
- BreakoutBoard에 "배정 관리" 버튼 → 학생 리스트 ↔ 모둠 드래그 UI
- BR-5에서 API 선행 필요

### BR-8: 학생 명단 CSV import
- 기존 classroom CSV import 패턴 승계 (plant-journal 참조)

### BR-9: 분석/통계
- 모둠별 카드 수, 학생 참여도, 정체 감지 (plant-journal의 stalled 로직 패턴 참조)

### 미결 파킹
- **월드카페 템플릿** (v2): `ideas-parking-lot.md` 기록 필요
- **학생 셀프 모둠 이동** (v2): WS 재구독 비용
- **Tier 엔티티**: User.tier 필드 신설 + 결제 통합

### Foundation 이월 파일
- `src/lib/tier.ts` — process.env.TIER_MODE stub. 실제 User.tier로 swap
- `src/lib/breakout.ts::BreakoutConfigSchema` — deployMode/visibility/groupCount 등 재사용
- `prisma/seed-breakout-templates.ts` — 새 템플릿 추가 시 상수 배열에 append
