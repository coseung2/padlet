# Phase 5 — Designer

실제 UI 목업을 생성한다. shotgun으로 복수 변형 후 phase6 검수에서 최적안 결정.

## 입력

- `phase3/design_doc.md`
- `phase4/design_brief.md`

## 출력

```
phase5/
├── mockups/           # 4~6개 변형 (v1, v2, …)
├── design_spec.md     # 선택된 변형 스펙
├── rejected/          # 탈락 변형 아카이브
└── tokens_patch.json  # 디자인 시스템 토큰 추가/변경
```

### design_spec.md 필수 섹션

```markdown
# Design Spec — {slug}

## 1. 선택된 변형
`mockups/v{N}` + 선택 사유

## 2. 화면 상태별 최종 디자인
각 상태(empty/loading/ready/error/success) 별 최종 레이아웃

## 3. 사용된 토큰
- 색, 타이포, 간격 (기존/신규 구분)

## 4. 컴포넌트 목록
신규/기존 구분
```

## 절차

1. shotgun으로 4~6개 변형 생성 (`mockups/v1` ~ `mockups/v6`)
2. 각 변형의 장단점을 `mockups/comparison.md`에 기록 → phase6에서 최적안 결정
3. 선택된 변형을 `design_spec.md`에 상세 기록
4. 탈락 변형은 `rejected/`로 이동 (삭제 금지 — 감사 이력)
5. 신규/변경 토큰은 `tokens_patch.json`

## gstack 스킬

- `/design-shotgun` — 4~6개 AI 목업 생성, side-by-side 비교 보드, taste memory learning
- `/design-html` — 선택된 목업을 production HTML/CSS로 변환 (Pretext computed layout, framework-aware)

## 금지

- 변형 < 4개
- 사용자 선택 없이 임의 결정
- 탈락 변형 삭제
- `design_brief.md` 요구사항 누락

## 핸드오프

`design_spec.md` + `tokens_patch.json`을 phase6에 전달. `mockups/`와 `rejected/`는 감사 이력으로 보존.
