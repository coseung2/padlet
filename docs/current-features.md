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
| `plant-roadmap` | 식물 관찰일지 세로 타임라인 (2026-04-12 PJ-1~6, 2026-04-13 v2) |
| `drawing` | Drawpile 공동 그림판 + 학생 라이브러리 (2026-04-13, **schema + UI stub only** — 서버 배포 대기, `BLOCKERS.md`) |

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
- 교사 매트릭스 뷰 (보조 링크로 격하, owner + desktop≥1024, 칼럼 virtualization)

### v2 (2026-04-13)
- 학생 로드맵 레이아웃: 가로 지하철 → **세로 타임라인** (좌측 레일 + 각 단계 우측 인라인 관찰 카드). `StageDetailSheet`는 학생 플로우에서 제거됨 (파일은 보존).
- 교사 드릴다운 라우트: `/board/[id]/student/[studentId]` (board owner 전용, server component, 403 on non-owner).
- 교사가 요약 뷰 학생 행 클릭 → 해당 학생 로드맵을 편집 모드(`canEdit + editAnyStage`)로 열어 관찰 추가/수정/삭제 + 단계 이동.
- `PATCH /api/student-plants/[id]` (신규, nickname 수정) — student owner + classroom teacher 허용.
- `POST/PATCH/DELETE /api/student-plants/[id]/observations[...]` + `advance-stage` — classroom teacher 허용으로 완화.

## Auth
- NextAuth v5 + Google OAuth (teacher)
- 쿠키 기반 student session (qrToken/textCode)
- Dev mock auth (`as=owner|editor|viewer` cookie)

## Canva
- OAuth + iframe oEmbed + PDF export

## Section Actions Panel (2026-04-13)
- columns 보드 섹션 헤더 `⋯` 버튼 → ContextMenu 드롭다운 (owner/editor 노출)
  - 메뉴: **이름 변경**, **섹션 삭제**(danger), **Canva에서 가져오기**, (Canva 링크 존재 시) **PDF 내보내기** / **Canva 폴더로 정리**
  - rename/delete 선택 시 `SectionActionsPanel`(이름 변경 / 삭제 2탭) 오픈
- 신규 범용 프리미티브: `src/components/ui/SidePanel.tsx`
- `plant/StageDetailSheet` 는 동일 `SidePanel` 을 사용하도록 리팩터 (props 시그니처 불변)

## Board Settings Panel (2026-04-13)
- 보드 헤더 `제목` 우측 **⚙ 버튼** — owner/editor 전용
- 클릭 시 `BoardSettingsPanel` 우측 슬라이드 (`SidePanel` primitive 재사용)
- 탭:
  - **브레이크아웃** — 보드 섹션 리스트 + 각 행 링크 **생성/재발급/복사** (`POST /api/sections/:id/share` 재사용, 낙관적 UI + `router.refresh()`). layout != columns 또는 섹션 0개 시 빈 상태 노출
  - **접근 권한 (준비 중)**, **Canva 연동 (준비 중)**, **테마 (준비 중)** — 플레이스홀더
- `/board/[id]/s/[sectionId]/share` 라우트는 하위 호환 fallback 으로 유지 — 배너가 "⚙ 보드 설정 → 브레이크아웃" 경로로 안내
