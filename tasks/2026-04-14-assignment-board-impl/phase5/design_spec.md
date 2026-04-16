# Design Spec — assignment-board

## 1. 선택된 변형

**`mockups/v1-notion-minimal.html`** + `mockups/modal-fullscreen.html` + `mockups/student-returned-view.html`

선택 사유: `mockups/comparison.md` §최적안 결정 근거 평균 8.67점. 디자인 시스템 일관성(9) / AI slop 내성(9) / scope 준수(10) 3축에서 타 변형 압도. v3·v4의 bulk-scan 강점은 본 task scope 밖(summary stat = v4는 v2 research 이월 후보, v3 outline은 pill 뱃지와 색 중복)이라 차용 거부.

---

## 2. 화면 상태별 최종 디자인

### 2.1 교사 격자 뷰 `/board/[id]` (v1)

| 상태 | 최종 레이아웃 |
|---|---|
| **empty** | `.assign-guide` 상단 고정 + 격자 자리에 `.assign-grid__empty` — "학급에 학생이 없습니다" 메시지 + `[로스터 동기화]` 1차 CTA (`--color-accent`) |
| **loading** | 격자 자리 30개 `.assign-slot--skeleton` (회색 pill + 회색 썸네일 placeholder, opacity 60% pulse, `prefers-reduced-motion` 시 static) |
| **ready** | 상단 `.assign-guide`(제목 + label + body) + 하단 `.assign-grid`(5열 × 6행, gap 12px, `max-width:960px`). slot = 헤더(번호/pill 뱃지) + 썸네일(4:3) + 이름 |
| **error** | 격자 자리에 `.assign-grid__error` 배너 — "과제 목록을 불러오지 못했습니다" + `[다시 시도]` ghost 버튼 |
| **success** (POST 직후) | toast(`--color-status-submitted-bg`/`text`) + 새 slot의 뱃지 optimistic 전환 |

### 2.2 교사 풀스크린 모달 (modal-fullscreen)

| 상태 | 최종 레이아웃 |
|---|---|
| **viewing** (첫 오픈) | topbar(번호·이름·상태뱃지 + 제출/확인시각 + X) / stage(좌 `‹` 네비 + 중앙 media-box + 우 `›` 네비) / footer(반려하기 ghost + 확인됨 primary). media-box는 `aspect-ratio:4/3` + `max-height: calc(100dvh - 64px topbar - 64px footer - var(--reason-panel-h, 0px) - 40px margin)`; reason-panel open 시 `--reason-panel-h:160px`로 설정돼 180ms transition 동안 media-box 세로 비례 축소. 세로 제한이 aspect-ratio를 이길 경우 `object-fit:contain`으로 미디어 원본 보존 |
| **returning** (inline) | footer 아래 `.reason-panel.open` — label "반려 사유" + textarea(min-height 72px, placeholder 제공) + counter "N / 200" + [취소 ghost, 반려하기 danger] |
| **reviewed** (성공) | 상단 뱃지 `.badge--reviewed` 전환 + toast "확인됨으로 표시했습니다". 모달 자동 닫힘 없음 |
| **error** | footer 상단에 `.modal-inline-error` 한 줄 메시지 + optimistic state 롤백 |

### 2.3 학생 뷰 `/board/[id]` (student-returned-view 기반)

| 상태 | 최종 레이아웃 |
|---|---|
| **assigned** | `.assign-guide` + `.assign-submit-card`(빈 썸네일 + `[제출하기]` primary) |
| **returned** | `.return-banner`(role="alert", `--color-status-returned-bg` + 빨간 `!` 아이콘 + "반려됨 — 재제출 필요" 타이틀 + reason 본문) **→ guide 위**. 그 아래 guide + submit-card |
| **submitted** | guide + submit-card(이전 제출물 썸네일 + "제출 완료" 뱃지 + 조건부 `[편집]` 버튼) |
| **disabled** | submitted 레이아웃 + 편집 버튼 `aria-disabled=true` + 툴팁 "채점 완료된 과제는 수정할 수 없습니다" |

### 2.4 학부모 뷰 `/parent/child/[id]/assignment`

| 상태 | 최종 레이아웃 |
|---|---|
| **empty** | center-aligned 안내 "배정된 과제가 없습니다" |
| **ready** | read-only `.parent-assign-card` (학생 slot 1개 + 상태 뱃지 + 썸네일 lightbox 가능) |

---

## 3. 사용된 토큰

### 3.1 기존 토큰 (변경 없음)
- 배경: `--color-bg`, `--color-surface`, `--color-surface-alt`
- 텍스트: `--color-text`, `--color-text-muted`, `--color-text-faint`
- 액센트: `--color-accent`, `--color-accent-active`, `--color-accent-tinted-bg`, `--color-accent-tinted-text`
- 보더: `--color-border`, `--color-border-hover`
- 파괴적: `--color-danger`, `--color-danger-active` (반려하기 버튼)
- 라디우스: `--radius-card` (12px), `--radius-btn` (4px / 모달 내 6px 예외), `--radius-pill` (뱃지)
- 타이포: Display 26/700, Title 20/700, Subtitle 16/700, Label 13/600, Body 15/400, Badge 12/600, Micro 11/600

### 3.2 신규 토큰 (tokens_patch.json 참조)
```
--color-status-submitted-bg : #f2f9ff
--color-status-submitted-text : #1565c0
--color-status-reviewed-bg : #e8f5e9
--color-status-reviewed-text : #2e7d32
--color-status-returned-bg : #ffebee
--color-status-returned-text : #c62828
--color-slot-placeholder : var(--color-surface-alt)
```

모두 WCAG AA 이상 (AAA 2종). 적용 위치: `src/styles/base.css` `:root` 블록 하단 "시맨틱 상태색" 코멘트 구역 확장.

### 3.3 간격
- 격자 gap `12px`, 카드 내부 padding `10px`, 모달 topbar `12px 20px`, reason-panel textarea `10px`, banner `14px 18px` — 모두 기존 Spacing 체계(4/8/10/12/14/16/18/20/24 선형)에 정합.

---

## 4. 컴포넌트 목록

### 4.1 신규 (phase7 coder 구현 대상)

| 컴포넌트 | 파일 경로(제안) | 역할 |
|---|---|---|
| `<AssignmentBoard>` (rewrite) | `src/components/AssignmentBoard.tsx` | 교사/학생/학부모 분기 컨테이너. server component + identity 기반 렌더 트리 선택 |
| `<AssignmentGridView>` | `src/components/assignment/AssignmentGridView.tsx` | 5×6 격자 + empty/loading/ready/error 상태 분기 |
| `<AssignmentSlotCard>` | `src/components/assignment/AssignmentSlotCard.tsx` | slot 1개(번호/이름/썸네일or placeholder/pill 뱃지) |
| `<AssignmentFullscreenModal>` | `src/components/assignment/AssignmentFullscreenModal.tsx` | 풀스크린 모달 + prev/next + inline 반려 확장. 기존 card-modal primitive 재사용 |
| `<ReturnReasonInlineEditor>` | `src/components/assignment/ReturnReasonInlineEditor.tsx` | reason-panel 확장 textarea + counter + 검증 |
| `<ReturnReasonBanner>` | `src/components/assignment/ReturnReasonBanner.tsx` | `role="alert"` 학생 뷰 상단 배너 |
| `<AssignmentStudentView>` | `src/components/assignment/AssignmentStudentView.tsx` | 학생 단일 slot + 조건부 편집/재제출 |
| `<ParentAssignmentView>` | `src/components/assignment/ParentAssignmentView.tsx` | 학부모 read-only + lightbox |
| `<AssignmentBulkStatBar>` (future, OUT) | — | v4 아이디어. 본 task에서 구현 금지, 후속 이월 표식만 |

### 4.2 기존 재사용 (수정 없음)

| 컴포넌트 | 재사용 위치 |
|---|---|
| 기존 card-modal primitive (`feat/card-modal-*` 누적) | `<AssignmentFullscreenModal>` 의 prev/next, fullscreen, ESC 처리 |
| `<OptimizedImage>` | 격자 썸네일 lazy 로딩 |
| `parent-scope.ts` | `<ParentAssignmentView>` 가드 |
| `requirePermission` 변형 | API 레이어(phase3 `api_contract.md` §Auth) |
| toast 인프라 | 모달 액션 결과 피드백 |

### 4.3 기존 제거/파기 (phase7 cleanup)

- `src/components/AssignmentBoard.tsx` 내부 **Submission + BoardMember.role 기반 렌더 로직** — AssignmentSlot 체계로 완전 대체 (memory `project_permission_model` 정합)

---

## 5. Phase 5 판정

**PASS** — 변형 4개 생성(v1~v4), 비교 분석 `comparison.md` 완성, v2 `rejected/`로 이동, v3·v4 감사 이력 유지. 선정안 v1 + 공통 modal/student 모듈로 `design_spec.md` 4섹션(선택 사유 / 상태별 최종 / 토큰 / 컴포넌트) 충족. phase4 `design_brief.md` 요구사항 전체 반영 확인 (5×6 격자·상태 5종·반려 inline·학생 배너 guide 상단·미제출 placeholder 번호만·접근성 3개). phase6 design_reviewer로 핸드오프.
