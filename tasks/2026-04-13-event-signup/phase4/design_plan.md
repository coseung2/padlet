# Phase 4 — Design Plan (Event-signup)

## UX goals per screen
| Screen | Primary goal | Key decisions |
|---|---|---|
| Teacher /event/edit | 5분 이내 행사 세팅 완료 | 단일 스크롤, 섹션 4개(기본정보/폼문항/영상정책/발표모드), sticky "저장+발행" 버튼 |
| Teacher /event/review | 100건에서도 빠른 훑기 + 1-click 상태 변경 | 좌: 리스트(가상화) / 우: 상세 드로어, 필터 칩(pending/submitted/approved/rejected) |
| Public /b/[slug] | 모바일 1-scroll 제출 | 포스터 상단 → 기본정보 입력 → 커스텀 문항 → 영상 → hCaptcha → 제출 |
| Public /b/[slug]/my | 내 제출 상태 확인 + 수정 경로 | 상태 배지(접수됨/승인대기/승인됨/반려) + "수정" 버튼(마감 전만) |
| Public /b/[slug]/result | 발표 모드별 UI | public-list: 간단한 이름표 그리드 / private-search: 이름+학번 입력폼 / private: "비공개" 안내만 |

## Layout decisions
- **모바일 우선**: 신청폼은 360–480px 기준 디자인. 데스크톱은 max-w-2xl 중앙.
- **교사 화면 리뷰 대시보드**: 데스크톱 우선(1024+), 태블릿(768+) 에서 리스트/상세 토글.

## 디자인 토큰 사용 (docs/design-system.md)
- 색상: 기존 브랜드 primary/neutral 그대로. 상태 배지는 semantic tokens (success/warn/danger/neutral).
- 타입: 기존 typography scale. 헤드라인은 `text-2xl` / 본문 `text-base`.
- spacing: 기존 `space-y-*` 패턴.
- **새 토큰 없음**.

## 인터랙션 규칙
- 제출 버튼: 전송 중 disabled + spinner, 완료 시 "제출 완료" 전면 카드 + 확인 토큰 표시(복사 버튼).
- 리뷰 드로어: ESC로 닫힘, 좌/우 화살표로 prev/next submission.
- 토큰 회전: confirm 모달 "이전 QR이 무효화됩니다"
- 마감 임박(≤24h): 폼 상단 배너.

## 접근성
- 폼 input 모두 `<label htmlFor>` + aria-describedby 에러.
- QR 이미지 alt: "행사 신청 QR — {boardTitle}".
- 상태 배지 색+텍스트 동시 전달(색맹 대응).
- 키보드만으로 제출 flow 완결.

## 수용 기준 → 화면 매핑
- AC1 → teacher /event/edit
- AC2,AC9,AC10 → public /b/[slug]
- AC3 → public /b/[slug]/my
- AC4 → QrShareCard (rotate 버튼 + confirm)
- AC5,AC6 → teacher /event/review
- AC8 → public /b/[slug]/result
- AC7 → 422 응답 + 폼 상단 에러 배너
