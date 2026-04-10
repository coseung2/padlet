# Tasks

작업 단위 산출물 저장소. 1 task = 1 디렉토리.

## 이름 규칙

`{YYYY-MM-DD}-{slug}`

예시:
- `2026-04-09-card-drag-drop` (feature)
- `2026-04-09-fix-realtime-disconnect` (incident)
- `2026-04-09-liveblocks-vs-yjs` (research)

## 구조

파이프라인별로 다름. 각 파이프라인 `_index.md`의 "task 디렉토리" 섹션 참조.

```
tasks/
└── 2026-04-09-card-drag-drop/
    ├── phase0/
    ├── phase1/
    └── …
```

## 감사 원칙

- 태스크 디렉토리는 삭제하지 않는다 (감사 이력)
- 중간 산출물도 보존 (재실행 추적용)
- 실패/중단한 task는 `FAILED.md`로 사유 기록 후 보존
- 마커 파일(`REVIEW_OK.marker`, `QA_OK.marker` 등)은 커밋에 포함하지 않아도 됨 (선택)
