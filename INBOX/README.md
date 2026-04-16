# Aura-board (padlet) INBOX

## 이게 뭔가요

이 폴더는 **`canva project/` (브레인스토밍 작업실)에서 정교화된 아이디어**의 받은편지함입니다. canva project는 사용자가 AI와 함께 아이디어를 시드화하는 공간이고, 대상 프로젝트가 **Aura-board (이 padlet 저장소)**로 라우팅된 경우 이 폴더로 전달됩니다.

## 어디서 왔나요

- 출처: `/mnt/c/Users/심보승/Desktop/Obsidian Vault/canva project/`
- 배송 에이전트: `canva project/agents/dispatcher.md`
- 배송 시점: 각 하위 폴더(task) 안의 `MANIFEST.md` 참조

## 폴더 구조

```
INBOX/{YYYY-MM-DD-slug}/
├── MANIFEST.md            # 배송 메타 (주제·근거·시드 ID·배송 시각)
├── request.json           # Aura-board feature 파이프라인 phase0 진입 자료
├── handoff_note.md        # 에이전트에게 줄 프롬프트
├── seed.yaml              # Ouroboros 시드 전문
├── decisions.md           # 정교화 과정에서 확정된 결정 요약
└── context_links.md       # canva project 내 관련 문서 경로
```

## 소비 방법

1. `MANIFEST.md` 먼저 읽기
2. `handoff_note.md` 를 새 feature task 개시 프롬프트로 사용
3. `request.json` 내용을 `padlet/tasks/{task_id}/phase0/request.json` 으로 복사 또는 참조
4. Aura-board feature 파이프라인(`prompts/feature/_index.md`) 진행

## 작업 완료 후

**해당 task 처리를 마쳤다면 자유롭게 해당 폴더를 삭제해도 됩니다.** 원본 산출물은 `canva project/tasks/{task_id}/` 에, 살아있는 설계는 `canva project/plans/` 에 유지됩니다.

## 관련 문서

- `CLAUDE.md` — 이 프로젝트(Aura-board) 오케스트레이션 규칙
- `prompts/feature/_index.md` — feature 파이프라인 인덱스
- `canva project/plans/seeds-index.md` — 브레인스토밍 측 시드 총 인덱스

## 새 배송 안 받고 싶다면

`canva project/destinations/_registry.md` 의 padlet 라우팅 트리거 비활성화를 요청하세요.
