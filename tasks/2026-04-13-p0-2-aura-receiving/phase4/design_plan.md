# Phase 4 — Design plan: /account/tokens

## Page goal
Give teachers a short, obvious flow to (1) create a PAT, (2) copy it once, (3) revoke later.

## Layout (desktop, Galaxy Tab S6 Lite baseline = 1200×752)
```
┌──────────────────────────────────────────────────────────┐
│ 내 외부 연동 토큰                                          │
│ Canva 콘텐츠 퍼블리셔 등 외부 앱이 이 계정 보드에 카드를      │
│ 자동 생성할 때 사용하는 Personal Access Token입니다.         │
│                                                          │
│                            [ + 새 토큰 발급 ]              │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 라벨            │ 마지막 사용   │ 생성일     │ 관리   │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ 내 Canva 앱 v1  │ 3일 전        │ 2026-04-10 │ 폐기 │   │
│ │ 테스트 토큰      │ (없음)        │ 2026-04-11 │ 폐기 │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```
Tab breakpoint: table → stack cards with same fields.

## Interactions
1. 발급 버튼 → Dialog: 라벨 input + 발급 버튼.
2. 발급 성공 → Dialog 내용 교체: 평문 토큰을 monospace `code` 박스에 표시 + "복사" 버튼 + 경고 banner("이 토큰은 다시 볼 수 없습니다. 지금 저장하세요.") + "확인" 버튼 (닫기 전 경고 확인).
3. 폐기 → 확인 dialog ("이 토큰을 폐기하면 사용 중인 외부 앱 연결이 끊깁니다. 계속할까요?") → DELETE → toast.

## Design-system compliance (docs/design-system.md)
- 색상: `bg-amber-50 border-amber-200 text-amber-900` for warning banner.
- 코드 박스: `font-mono bg-slate-100 px-3 py-2 rounded-md text-sm`.
- 버튼: primary `bg-blue-600 text-white`; destructive `bg-red-600 text-white`.
- 간격: `space-y-4` between sections; table padding `py-3 px-4`.

## Accessibility
- Dialog: focus trap, ESC close, `aria-describedby` for warning.
- 복사 버튼 성공 시 `aria-live="polite"` 토스트.
- 토큰 표시 영역 `role="region"` + label "생성된 토큰".

## Empty state
"아직 발급된 토큰이 없습니다. 외부 앱 연동을 시작하려면 '새 토큰 발급'을 눌러주세요."

## Error states
- 네트워크 실패 → inline `text-red-600` below 버튼
- 10개 초과 → 모달 내부 "최대 10개까지 발급 가능합니다. 사용하지 않는 토큰을 먼저 폐기하세요."

## Handoff to phase5
Designer produces Tailwind JSX in `TokensClient.tsx` matching the above. Use `useState` for dialog open, `useTransition` for POST/DELETE loading. SSR page passes initial list.
