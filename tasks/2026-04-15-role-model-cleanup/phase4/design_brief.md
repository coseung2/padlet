# Phase 4 — Design Brief · role-model-cleanup

이 task 는 **권한 primitive 재설계**가 본질이라 시각적 변경은 미미. 새 UI 컴포넌트 0, 새 토큰 0, 새 레이아웃 0. phase5 (shotgun mockups) 는 **skip** — 사실상 변경할 비주얼이 없음.

## 1. 화면/상태 — 달라지는 것만

### 1.1 교사 보드 (freeform/grid/stream/columns) 기존
- FAB / 삭제 / 편집 버튼 — **변함없음** (identity=teacher+ownsBoard → canEdit=canDelete=canAdd=true).

### 1.2 학생 보드 (같은 classroom)
- **FAB (+ 아이콘)**: 이전엔 숨김 → **노출**. 기존 teacher 용 FAB 그대로 재사용.
- **카드 삭제(×) / 컨텍스트 메뉴(⋯)**: 자기 카드에만 노출 (이전엔 전부 숨김).
- **CardDetailModal 편집**: 자기 카드면 제목/본문/이미지/링크 편집 가능 (신규).
- **카드 이동(드래그)**: 자기 카드만 가능 (신규 — freeform 레이아웃).

### 1.3 타 학생 카드 / 교사 카드 (학생 시점)
- 읽기 전용. 모든 편집 UI 숨김 (primitive `canEditCard=false`).

### 1.4 학부모 경로 — 달라지지 않음
- `/parent/(app)/child/[sid]/*` UI 그대로. primitive 는 canView=true, 편집/삭제 false.

## 2. 정보 계층

변화 없음. 버튼 유무만 identity 로 gating.

## 3. 인터랙션 명세

학생 자기 카드 편집 진입 경로:
1. 카드 클릭 → CardDetailModal 오픈 (기존)
2. 모달 내 **"편집"** 버튼 (primitive `canEditCard=true` 일 때 노출)
3. 제목/본문/링크/이미지 inline 편집
4. 저장 → `PATCH /api/cards/[id]` (신규 student path)

학생 카드 이동 (freeform):
1. 카드 드래그 (identity=student + studentAuthorId match 시만 활성)
2. 드롭 → `POST /api/cards/[id]/move`

## 4. 접근성

- **키보드**: 편집 / 삭제 버튼은 identity 조건에 맞게만 DOM 에 노출. aria-label 기존 유지.
- **스크린리더**: CardDetailModal 편집 모드 시 `aria-live="polite"` 알림 기존 사용 패턴 그대로.
- **대비 / 포커스**: 변경 없음.

## 5. 디자인 시스템 확장

**필요 없음**. 기존 토큰 / 컴포넌트 그대로 재사용.

## 6. phase5 skip 결정

phase5 designer 의 4~6 mockup shotgun 은 **시각 변경 대상 부재로 skip** 권장. phase6 reviewer 는 design_brief 단일 입력으로 진행 가능. phase7 coder 가 코드 변경만 집중.

## 7. Phase 4 판정

**PASS** — 5섹션 최소 충족. phase6 reviewer 가 경량 review → phase7 coder 진입.
