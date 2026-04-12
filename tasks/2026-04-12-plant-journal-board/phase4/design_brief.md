# Design Brief — plant-journal-board

## 1. 화면/상태 목록

### 학생: 식물 선택 (PlantSelectStep)
| 상태 | 내용 |
|---|---|
| empty | 허용된 종 없음 — "담임 선생님께 문의하세요" 안내 + 새로고침 |
| ready | grid(2~3열)로 종 카드(이모지/이름/난이도 badge), 카드 1개 선택됨 → 하단 별명 input 활성 |
| loading | "저장 중…" 스피너, CTA 비활성 |
| error | "시작 실패: {message}" inline + 재시도 |
| success | 노선도 뷰로 자동 전환(같은 페이지 안에서) |

### 학생: 노선도 뷰 (RoadmapView)
| 상태 | 내용 |
|---|---|
| empty | (없음 — 선택하면 바로 RoadmapView) |
| ready | 상단 헤더(식물 이모지+별명), 가로 스크롤 SVG 노선(10노드), 현재 단계 노드 확대+그림자, 완료 단계 녹색, 미래 단계 회색. 현재 단계 노드 아래 CTA "관찰 기록 보기". 바닥 시트(dismissible) 상세. |
| loading | 서버에서 observation list 도착 전 skeleton 3개 |
| error | "기록 불러오기 실패" + 재시도 링크 |

### 학생: 단계 상세 시트 (StageDetailSheet)
| 상태 | 내용 |
|---|---|
| empty | 관찰 포인트 질문 리스트 + "관찰 추가" 버튼 강조(primary), 본인 사진/메모 없음 |
| ready | 질문 리스트 + 본인 기록 카드 timeline(최신 상단) + 다음 단계 버튼(현재 단계일 때만) |
| loading | skeleton |
| error | "기록 불러오기 실패" |

### 학생: 관찰 에디터 (ObservationEditor)
| 상태 | 내용 |
|---|---|
| empty | 최초 진입, 이미지 0장, 메모 placeholder |
| ready | 이미지 썸네일 grid (±x 삭제), 메모 textarea, 하단 "저장" primary |
| uploading | 각 이미지에 progress, 저장 버튼 비활성 |
| error | inline error per image, 전역 error bar |
| success | 모달 닫힘, 시트 리스트 갱신 |

### 사진 없음 사유 모달 (NoPhotoReasonModal)
| 상태 | 내용 |
|---|---|
| ready | 4개 프리셋(날씨/깜빡/수업 없음/기타) radio + 자유 입력, "계속" primary disabled 미선택 시 |
| error | 서버 reject 시 inline |

### 교사: 요약 뷰 (TeacherSummaryView)
| 상태 | 내용 |
|---|---|
| empty | 학생 아무도 식물 미선택 — "아직 아무도 시작하지 않았어요" |
| ready | 상단 단계별 분포 bar(10 stage × 학생 수 badge) + 하단 학생 table(이름·종·현재단계·최근관찰일·정체 경고) |
| loading | skeleton row 5개 |
| error | 메시지 |

### 교사: 매트릭스 뷰 (TeacherMatrixView)
| 상태 | 내용 |
|---|---|
| empty | 학생 0명 — 안내 |
| ready | sticky left column(stage name), sticky top row(student name), cells = 썸네일 or "·" empty |
| forbidden | desktop 아님 / editor / viewer → "이 뷰는 담임 계정으로 데스크탑에서만 열 수 있어요" 안내 카드 |
| loading | grid skeleton |

### 교사: Allow-list 관리 (PlantAllowListModal)
| 상태 | 내용 |
|---|---|
| ready | 10종 체크박스 list(이미지+이름+난이도), 기선택 체크, 저장/취소 |
| saving | 저장 버튼 spinner |

## 2. 정보 계층

- **학생 노선도**: 1) 지금 내 단계 2) 본인 최근 사진/메모 3) 다음 단계 CTA
- **단계 상세**: 1) 관찰 포인트 질문 2) 내 기록 timeline 3) 액션
- **교사 요약**: 1) 분포 badge bar 2) 정체 경고 3) 학생 list
- **매트릭스**: 1) 진행 분포(한 행 한 학생) 2) cell tap → 원본

시선 흐름 — 모바일 학생: 상단 헤더 → 노선 중앙 active 노드 → 하단 시트 CTA. 데스크탑 교사: 상단 요약 → 하단 table.

## 3. 인터랙션 명세

- **노드 tap**: bounce scale 0.95→1, 시트 200ms slide-up
- **사진 업로드 drop-zone**: dashed border, drag-over 시 tint
- **다음 단계 버튼**: 활성 때 primary, 사진 0 && 첫 클릭 → 사유 모달(블로킹)
- **매트릭스 cell hover(desktop)**: 썸네일 확대 200ms, cursor=zoom-in, click=modal

## 4. 접근성 요구 (최소 3개)

1. 모든 버튼/노드는 Tab 포커스 가능, 현재 단계 노드는 `aria-current="step"`
2. 각 노드에 `aria-label="3단계: 잎이 나요 (완료)"` 형식 음성 라벨
3. 사진 미첨부 사유 모달은 focus trap + Escape 닫기
4. 대비: 현재 노드 active 색상 AA 4.5:1 이상 (design-system.md color 준수)
5. 업로드 버튼은 `<input type="file" accept="image/*">`로 스크린리더 네이티브 노출

## 5. 디자인 시스템 확장 여부

### 기존 토큰만으로 가능
- 배경/표면/텍스트/보더/반경/그림자/애니메이션

### 신규 토큰 필요 (최소)
- `--color-plant-active`: 현재 단계 노드 색 — 기존 `--color-accent`는 CTA에 예약, 노선도 "나의 단계"는 별도 시그니처 필요 → `#27a35f` (식물 그린)
- `--color-plant-visited`: 완료 단계 노드 톤 — `#b8dfc7`
- `--color-plant-upcoming`: 미래 단계 톤 — `#d0cfcd` (text-faint 톤 차용)
- `--radius-stage-node`: `50%` (원형 노드 전용 — 기존 radius와 의미 분리)

### 신규 컴포넌트 (기존 패턴 확장)
- `StageDetailSheet` — 기존 모달 위에서 bottom-sheet 변형 추가(position: fixed bottom)
- `NodeButton` — 버튼 파생. 3개 상태(`visited/active/upcoming`) variant
- `DistributionBar` — TeacherSummaryView에서만 사용, 재사용 예정 없음
