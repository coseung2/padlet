# Current Features — Aura-board

Live feature inventory. Update when merging feature tasks.

## Board layouts
| Layout | Description |
|---|---|
| `freeform` | 자유 배치 — react-draggable 카드 |
| `grid` | 그리드 정렬 |
| `stream` | 세로 피드 |
| `columns` | 칼럼(Kanban) |
| `assignment` | 과제 배부 + 제출 |
| `quiz` | 실시간 퀴즈 |
| `plant-roadmap` | 식물 관찰일지 노선도 (2026-04-12 PJ-1~6) |

## Classroom & Student
- 교사 `Classroom` 생성/수정 + 6-char classroom code
- `Student` 목록, QR + textCode 로그인, session cookie(HMAC)

## Plant Journal (2026-04-12)
- 10종 식물 카탈로그(`PlantSpecies` + `PlantStage`) — 토마토/딸기/해바라기/메리골드/무/상추/강낭콩/오이/고추/팬지
- 교사 `ClassroomPlantAllow`로 학급별 허용 종 제어
- 학생 `StudentPlant`: (board,student) 고유, 별명 1~20자, 단계 진행
- `PlantObservation` 사진 ≤10장 + 메모 ≤500자, 선택적 noPhotoReason
- 단계 역행 불가(자기 선언 advance만), 사진 0 + 사유 없음 → 400
- 교사 요약 뷰 (분포 badge + 학생 list + 7일+ 정체 경고)
- 교사 매트릭스 뷰 (owner + desktop≥1024 전용, 칼럼 virtualization)

## Auth
- NextAuth v5 + Google OAuth (teacher)
- 쿠키 기반 student session (qrToken/textCode)
- Dev mock auth (`as=owner|editor|viewer` cookie)

## Canva
- OAuth + iframe oEmbed + PDF export
