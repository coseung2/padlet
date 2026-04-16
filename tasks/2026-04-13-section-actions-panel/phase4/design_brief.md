# Design Brief — section-actions-panel

## 1. 정보 구조 (IA)
```
Column header
└── [⋯] trigger (canEdit only)
     └── SidePanel (right, 420px / bottom sheet on mobile)
          ├── Head: 섹션 제목 + close [×]
          ├── Tablist: [공유] [이름 변경] [삭제(danger)]
          └── Tabpanel
               ├── 공유: link input + 생성/회전/복사
               ├── 이름 변경: input + 저장
               └── 삭제: 경고 + 체크박스 + 빨간 버튼
```

## 2. 상태 매트릭스

| 상태 | Trigger | Panel | Tabpanel |
|---|---|---|---|
| closed | hidden | not rendered | — |
| open(share, owner, no token) | ⋯ 클릭 | slide-in | "아직 공유 링크가 없습니다" + 생성 버튼 |
| open(share, owner, has token) | ⋯ | in | URL input + 복사/새로생성 |
| open(share, editor) | ⋯ | in | "소유자만 링크를 관리할 수 있어요" 안내 |
| open(rename) | tab | in | title input + 저장 (busy) |
| open(delete) | tab | in | 경고 + 체크박스(초기 off) + 빨간 버튼(disabled) → 체크 후 활성 |
| loading(rename save) | submit | in | 버튼 "저장 중..." |
| loading(delete) | 버튼 | in | "삭제 중..." |
| error(api fail) | — | in | inline message |

## 3. 인터랙션 규약
- 열림 애니메이션: 250ms ease-out (translateX(100%) → 0). CSS transition.
- 닫힘: 200ms ease-in
- backdrop fade 150ms
- mobile(<768px): translateY(100%) → 0 (바텀시트)
- 탭 전환: no animation, 탭 콘텐츠 즉시 교체

## 4. 디자인 시스템 갭 분석
- 토큰 추가 불필요: plant-sheet 이미 `--color-surface`, `--shadow-card`, `--color-border`, `--color-text-muted`, `--radius-card`, `--radius-btn` 사용.
- 파괴적 액션 색: `--color-danger` 존재 여부 확인 필요. 없으면 inline `#d33` fallback + tokens_patch 에 추가 제안.
- 탭 셀렉터: 기존 없음 → 신규 `.side-panel-tab` / `.side-panel-tab[aria-selected=true]` 스타일 (border-bottom accent).
- ⋯ 트리거 버튼: 기존 `.section-actions-trigger` 같은 class 없음 → 신규. `ContextMenu` 와 시각적 크기 맞춤(28x28).

## 5. a11y 체크리스트
- [ ] SidePanel root: `role=dialog`, `aria-modal=true`, `aria-labelledby`
- [ ] 열릴 때 close 버튼 or initialFocusRef focus
- [ ] ESC 닫기
- [ ] Tab/Shift+Tab 포커스 트랩 (first/last 순환)
- [ ] backdrop: `<button aria-label="닫기">`
- [ ] 탭: `role=tablist` / `role=tab` / `aria-selected` / `aria-controls`
- [ ] 탭패널: `role=tabpanel` / `id` 매칭
- [ ] 삭제 버튼: `aria-describedby` 로 경고 문구 연결
- [ ] 공유 URL input: `readOnly` + onFocus select (기존 SectionShareClient 보존)
- [ ] 모션 감소 사용자: `@media (prefers-reduced-motion: reduce)` 에서 transition 제거

## 6. 시각 스타일 방향
- surface: `var(--color-surface)` (light) 그대로
- 패널 좌측 그림자: `box-shadow: -8px 0 24px rgba(0,0,0,0.08)`
- 헤더 구분선: `border-bottom: 1px solid var(--color-border)`
- 탭바 배경: `var(--color-bg)` (연한 회색), 선택 탭 배경 `var(--color-surface)` + 상단 2px accent
- 삭제 탭 배경: 약간 경계색 있는 카드 (경고감)
- 모바일: 바텀 시트 바깥 드래그 핸들(작은 회색 바) 추가 시도 — MVP 에선 선택

## 7. 변형 개수
shotgun 에서 3개 변형 작성 (피드백 요구: 최소 3~4):
- v1: `right-drawer-tabs` 표준
- v2: `right-drawer-segmented` (iOS 스타일 세그먼트 컨트롤)
- v3: `right-drawer-accordion` (참고용, fit_score 낮지만 대비)
