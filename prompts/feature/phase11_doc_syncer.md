# Phase 11 — Doc Syncer

배포된 변경을 문서에 반영한다. 재사용 가능한 패턴은 메모리로 저장.

## 입력

- `phase3/design_doc.md`
- `phase5/design_spec.md`
- `phase5/tokens_patch.json`
- `phase7/files_changed.txt`
- `phase10/deploy_log.md`

## 출력

`phase11/doc_updates.md` + 실제 문서 파일 수정

### 동기화 대상

| 문서 | 언제 업데이트 |
|---|---|
| `docs/architecture.md` | 데이터 모델/API/컴포넌트 트리 변경 시 |
| `docs/current-features.md` | 모든 feature task에서 반드시 |
| `docs/design-system.md` | `tokens_patch.json`이 있을 때 |
| `CLAUDE.md` | 경로/환경/오케스트레이션 규칙 변경 시 |
| `README.md` | 사용자 facing 기능 변경 시 |

## 절차

1. 각 동기화 대상 문서를 읽고 영향 판단
2. 변경이 필요한 문서만 수정 (불필요한 문서 수정 금지 — diff 노이즈 회피)
3. `/document-release` 실행 — 프로젝트 문서 자동 동기화
4. `/retro` 실행 — 이번 task의 회고 + 학습 포인트
5. `/learn` 실행 — 재사용 가능한 패턴은 프로젝트 메모리로

### doc_updates.md 구조

```markdown
# Doc Updates — {slug}

## 업데이트된 문서
- docs/architecture.md (섹션/라인)
- ...

## 회고 (3줄)
- 잘된 점
- 아쉬운 점
- 다음 task에서 적용할 것
```

## gstack 스킬

- `/document-release` — README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md 동기화
- `/retro` — 엔지니어링 회고, 학습 포인트 추출
- `/learn` — 세션 간 패턴/선호 메모리 저장

## 금지

- 실제 변경과 다른 문서 내용
- 영향 없는 문서 수정 (diff 노이즈)
- 회고 섹션 공란

## 핸드오프

`doc_updates.md` 완성 → 오케스트레이터 push 검증(`npm run build` + `npm run typecheck` 성공) 통과 → `git push`.
