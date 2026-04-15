# Phase 4 — Design Brief · card-author-multi

## 1. 화면/상태 목록

### 1.1 CardAuthorEditor 모달 (신규)
| 상태 | 표시 |
|---|---|
| empty | (학급 연결 보드) 학급 학생 체크박스 리스트 + "아직 선택 안 됨" |
| loading | 학급 학생 fetch 중 — skeleton rows |
| ready | 좌측: 체크박스 학생 리스트 / 우측: 선택된 순서 리스트 + "추가 이름" free-form 필드 |
| error | 학급 학생 fetch 실패 — "불러오기 실패 [재시도]" |
| saving | 저장 버튼 disabled + spinner |
| validation error | 각 필드 하단 인라인 에러 |

### 1.2 카드 footer (렌더 변경)
| 작성자 수 | 표시 |
|---|---|
| 0 | 폴백 (기존 pickAuthorName 결과) |
| 1 | "김철수" |
| 2 | "김철수, 이영희" |
| 3 | "김철수, 이영희, 박민수" |
| 4+ | "김철수 외 N명" (클릭/hover 시 전체 리스트 tooltip — 선택, 본 phase 에선 스킵) |

## 2. 정보 계층

- 모달 상단: "작성자 지정" 제목 + 닫기
- 좌측 panel: 학급 학생 리스트 (번호.이름), 체크박스
- 우측 panel: 선택된 작성자 순서 리스트. order=0 이 primary 뱃지 📌
- 하단: "+ 학급 밖 이름 추가" 버튼 → free-form 입력 row
- 푸터: "저장" primary + "취소" ghost

## 3. 인터랙션

- 체크박스 ON → 우측 리스트 끝에 추가
- 체크박스 OFF → 우측 리스트에서 제거
- 우측 리스트 각 행에 ↑/↓ 버튼 (order 변경)
- free-form row 는 삭제 버튼 별도
- 10명 초과 시 체크박스 비활성 + "최대 10명" tooltip
- 저장 시 `PUT /api/cards/[id]/authors` → 성공 200 → 모달 닫기 + 카드 state 업데이트

## 4. 접근성

- `role="dialog" aria-labelledby="card-author-editor-title"`
- 체크박스 리스트 `role="group" aria-label="학급 학생 목록"`
- 순서 변경 버튼 `aria-label="위로 이동 / 아래로 이동"`
- primary 뱃지 시각 + screen reader 텍스트 "대표 작성자"
- 키보드: Tab 순서, Enter 저장, ESC 닫기

## 5. 디자인 시스템 확장

**없음**. 기존 토큰 + 모달/버튼/input 패턴 재사용.
