# Design Spec (v1 — right-drawer-tabs)

## 1. 레이아웃

### Desktop (>=768px)
```
┌──────────────────────────────────┐ backdrop (fade rgba(0,0,0,0.35))
│                                  │
│                   ┌──────────────┤ panel (width 420px, right-fixed, full height)
│                   │ 제목       × │
│                   ├──────────────┤ border-bottom
│                   │ [공유][이름][삭제]│  tablist
│                   ├──────────────┤
│                   │              │
│                   │  tabpanel    │
│                   │              │
└───────────────────┴──────────────┘
```

### Mobile (<768px)
panel → bottom sheet: `left:0; right:0; bottom:0; max-height:85vh; border-radius:16px 16px 0 0`.

## 2. 토큰 사용
- 배경: `var(--color-surface)`
- 구분선: `var(--color-border)`
- 그림자: `var(--shadow-card)` + inline `box-shadow: -8px 0 24px rgba(0,0,0,0.08)` 보강
- 헤더 제목 폰트: `18px / 700`
- 탭 폰트: `14px / 600`
- 선택 탭 accent: `var(--color-accent)` (#0075de) — 하단 2px underline
- 위험 버튼 배경: `var(--color-danger)` — **신규 추가 토큰** `#c62828`
- 위험 버튼 텍스트: `#fff`

## 3. 토큰 패치 (tokens_patch.json)
```json
{
  "add": {
    "--color-danger": "#c62828",
    "--color-danger-active": "#a01b1b"
  }
}
```

## 4. 세부 스타일 (side-panel.css 요약)
```css
.side-panel-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:90; border:0; cursor:default; }
.side-panel { position:fixed; top:0; bottom:0; right:0; width:420px; max-width:100%; background:var(--color-surface); box-shadow:-8px 0 24px rgba(0,0,0,0.08); z-index:100; display:flex; flex-direction:column; transform:translateX(0); transition:transform 250ms ease-out; }
.side-panel[data-open="false"] { transform:translateX(100%); pointer-events:none; }
@media (max-width:767px) { .side-panel { top:auto; left:0; right:0; width:auto; max-height:85vh; border-radius:16px 16px 0 0; transform:translateY(0); } .side-panel[data-open="false"] { transform:translateY(100%); } }
.side-panel-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--color-border); }
.side-panel-title { font-size:18px; font-weight:700; }
.side-panel-close { background:none; border:0; font-size:22px; cursor:pointer; padding:4px 8px; }
.side-panel-body { padding:16px 20px; overflow-y:auto; flex:1; }
.side-panel-tabs { display:flex; gap:4px; padding:0 20px; border-bottom:1px solid var(--color-border); }
.side-panel-tab { background:none; border:0; padding:10px 12px; font-size:14px; font-weight:600; color:var(--color-text-muted); cursor:pointer; border-bottom:2px solid transparent; }
.side-panel-tab[aria-selected="true"] { color:var(--color-text); border-bottom-color:var(--color-accent); }
.side-panel-tab.danger[aria-selected="true"] { border-bottom-color:var(--color-danger); color:var(--color-danger); }
.section-actions-trigger { background:none; border:0; font-size:18px; line-height:1; padding:4px 8px; cursor:pointer; color:var(--color-text-muted); border-radius:6px; }
.section-actions-trigger:hover { background:var(--color-surface-alt); color:var(--color-text); }
.section-delete-confirm { padding:12px; border:1px solid var(--color-border); border-radius:var(--radius-card); background:var(--color-bg); }
.section-delete-btn { background:var(--color-danger); color:#fff; border:0; padding:10px 16px; border-radius:var(--radius-btn); font-weight:600; cursor:pointer; }
.section-delete-btn:disabled { opacity:0.5; cursor:not-allowed; }
@media (prefers-reduced-motion: reduce) { .side-panel { transition:none; } }
```

## 5. 한글 카피
- 헤더: `{섹션명} 옵션`
- 탭: `공유` / `이름 변경` / `삭제`
- 공유 탭 (editor, viewer 안내): `공유 링크는 소유자만 관리할 수 있습니다.`
- 이름 변경 탭 라벨: `섹션 이름`, 저장 버튼: `저장` / 진행중 `저장 중...`
- 삭제 탭 경고: `이 섹션을 삭제합니다. 섹션에 있던 카드는 "섹션 없음" 상태로 이동합니다.`
- 삭제 확인 체크박스: `삭제한다는 것을 이해했어요`
- 삭제 버튼: `섹션 삭제` / 진행중 `삭제 중...`
- 닫기 aria: `닫기`
- trigger aria: `{섹션명} 섹션 옵션`

## 6. 포커스 순서
1. open 시 close 버튼 focus (또는 initialFocusRef)
2. Tab → tablist 선택 탭 → tabpanel 의 첫 interactive
3. Shift+Tab → 역순
4. last 에서 Tab → close 버튼 (순환)

## 7. 모션 접근성
`prefers-reduced-motion: reduce` 에서 transition 제거.
