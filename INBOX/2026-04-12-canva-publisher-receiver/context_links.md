# Context Links — Canva Publisher Receiver

> padlet feature 파이프라인 phase0 analyst 가 본 작업 범위·크로스 참조·외부 호출자 스펙을 확인하기 위한 경로 묶음.
> 경로는 모두 **canva project 루트 기준 상대 경로** (padlet 리포에서는 읽기 전용으로 참조).

## 1. 본 작업 SSOT (핵심 독해 순서)

1. `../canva project/plans/canva-publisher-receiver-roadmap.md` — 본 Seed 8의 단일 진실. §1 설계 전제(D1~D16) / §2 파일 맵 / §4 CR-1~CR-10 작업 카드 / §5 수용기준 15건 / §7 리스크 / §9 파킹
2. `../canva project/tasks/2026-04-12-canva-publisher-receiver/phase3/decisions.md` — D1~D16 결정 근거 원본 (본 INBOX 내 `decisions.md` 복사본과 동일)
3. `../canva project/tasks/2026-04-12-canva-publisher-receiver/phase4/seed.yaml` — acceptance_criteria 15건·ontology·evaluation_principles·exit_conditions

## 2. 크로스 참조 (본 작업 경계 파악)

- `../canva project/plans/implementation-roadmap.md` — **P0-② Content Publisher Intent 수신 엔드포인트** 항목. Canva 앱(`content-publisher-app/`) 측 SSOT(송신) vs 본 Seed 8(수신, padlet) 측 SSOT 범위 분할 확인.
- `../canva project/plans/seeds-index.md` — 전체 시드 맵. **Seed 2 Tier 정책**(`cards:write` Pro 게이팅 승계) / **Seed 5 Canva 통합**(교사 주체 프라이빗 앱 모델 P0-② 연계) / 본 **Seed 8** 위치 확인.
- `../canva project/plans/tablet-performance-roadmap.md` §2 — 갤럭시 탭 S6 Lite 교사 UI 성능 예산 (터치 타겟 ≥ 44px / TTI / p95 < 2000ms 업로드). `/(teacher)/settings/external-tokens` UI 구현 시 준수.
- `../canva project/plans/phase0-requests.md` "Canva Publisher 수신" 섹션 — **CR-1~CR-10** 작업 카드 블록. 병렬/직렬 분배 시 의존 그래프 참조(CR-1 → CR-2 → CR-3 → CR-4/CR-5 → CR-6 → CR-7 → CR-8 → CR-9 → CR-10).

## 3. 실제 호출자 스펙 (요청·응답 계약 원본 — 읽기 전용 고정)

- `~/aura-canva-app/src/intents/content_publisher/index.tsx`
  - Canva Content Publisher intent 클라이언트 구현. 요청 `{ boardId, title, imageDataUrl, sectionId? }` 와 응답 `{ id, url }` 계약의 **유일한 원본**.
  - 본 수신측 Zod strict 스키마(D15) / 200 OK 응답 스키마(D16) / Toast·externalUrl UX(§2-A 6–7단계)가 이 파일의 계약을 반드시 수용.
  - padlet 리포에서는 **읽기 전용**으로만 참조 — 양방향 변경 금지. 변경이 필요하면 aura-canva-app 리포 별도 task.

## 4. 기타 참조 (보조)

- `../canva project/tasks/2026-04-12-canva-publisher-receiver/phase2/sketch.md` — 초기 sketch(§1 계약 / §2 스키마 / §5 성능 / §7 리스크).
- `../canva project/tasks/2026-04-12-canva-publisher-receiver/phase5/updated_docs.md`·`new_docs.md` — 본 task가 canva project 플랜 문서에 남긴 업데이트·신규 문서 목록 (감사용).
- `../canva project/research/canva-developer-aura-research.md` — Canva Connect / Apps SDK 배경 리서치 (P0-② 설계 근거).

## 5. 파킹 (v2+ 이관 — 본 task 범위 외)

roadmap §9 참조. CRC32 checksum (`aurapatc_`), sectionId UI 드롭다운, aura-canva-app 프리-리사이즈, Canva Apps deeplink 스펙 조사, Blob 정리 Cron, Webhook `scopes: webhooks:receive` 확장, `metadata JSON` 일반화, S3 Enterprise 마이그, 학교 일괄결제, 토큰 회전 알림(90일 만료 7일 전). 본 INBOX에서는 **수용하지 말 것**.
