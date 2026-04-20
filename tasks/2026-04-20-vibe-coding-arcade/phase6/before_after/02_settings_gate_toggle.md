# Diff — S5.4 설정 탭 gate-toggle 명시

## Before

설정 탭은 6필드 폼 + 긴급 정지 버튼만. FeatureFlag.vibeArcadeGate 토글 노출 위치 불분명.

## After (phase6 §4.2)

```
설정 탭 최상단에 sticky 영역:
  row: "이 보드의 학급 아케이드"
  우측: 큰 토글 스위치 (ON/OFF)
  토글 off 시 모든 하위 필드 disabled
  토글 aria-label "학급 아케이드 활성화"
  변경 시 confirm 모달 "{n}명 학생에게 영향. 정말 변경할까요?"
  FeatureFlag.vibeArcadeGate + 보드 별도 레벨 플래그 조합
```

## 사유

brief §1 S5.4 gate-toggle 상태 반영. 런칭 플래그 UX 명확화.
