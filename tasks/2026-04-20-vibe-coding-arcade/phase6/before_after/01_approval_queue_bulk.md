# Diff — S5.1 승인 큐 bulk-mode 추가

## Before (phase5/design_spec.md §2.5.1)

S5.1에는 기본 승인 큐(단건 선택) · 자동 거절 접기 · A/R 단축키만 명세. 복수 선택 처리 누락.

## After (phase6 §4.1, design_spec.md에 merge)

```
복수 선택 모드:
  각 행 좌측 checkbox 체크 시 상단에 sticky action bar 등장
  "선택된 {n}건"  [일괄 승인 A]  [일괄 반려 R]  [취소]
  일괄 반려는 공통 노트 1개 input
  A/R 단축키는 선택된 n건에 적용
  최대 선택 가능 50건 (이상은 차례로 처리 안내)
```

## 사유

brief §1 S5.1 bulk-mode 요구 반영. 교사 부담 완화(R-7) 효과 확장.
