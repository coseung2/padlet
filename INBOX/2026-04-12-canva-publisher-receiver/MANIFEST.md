# Manifest — 2026-04-12-canva-publisher-receiver

- **Topic**: Aura-board 서버에 Canva Content Publisher 수신용 `/api/external/cards` 엔드포인트와 교사 PAT(Personal Access Token) 발급·관리 시스템 구축
- **Motivation**: Canva Content Publisher 앱(App ID AAHAAMW43f4)은 이미 `POST https://aura-board-app.vercel.app/api/external/cards`를 호출하지만 수신측 Aura-board 서버에 엔드포인트·PAT 발급 UI가 부재해 실제 발행이 실패. Seed 5에서 결정된 '교사 주체 프라이빗 앱' 모델을 서버측에서 구현해야 Canva→Aura-board 플로우가 end-to-end로 닫힘.
- **Scope**: full_exploration
- **Destination**: padlet INBOX
- **Routing reason**: scope=full_exploration + topic에 "Aura-board 서버 수신 엔드포인트 + PAT" 포함 → registry 매칭(`Aura-board`, `Canva 통합`) → padlet (Aura-board 교실 학습 플랫폼)
- **Seed ID**: seed_26af361e92b7 (ambiguity 0.121)
- **Interview ID**: interview_20260412_124111
- **Delivered at**: 2026-04-12T22:00:00+09:00
- **Supersedes**: —
- **Related canva project docs**:
  - `plans/canva-publisher-receiver-roadmap.md` (본 작업 SSOT)
  - `plans/implementation-roadmap.md` (P0-② Content Publisher 수신 엔드포인트 항목)
  - `plans/seeds-index.md` (Seed 8 본 시드 + Seed 2 Tier / Seed 5 Canva 통합 승계)
  - `plans/tablet-performance-roadmap.md` §2 (교사 UI 터치 타겟·TTI·p95 기준)
  - `plans/phase0-requests.md` (CR-1~CR-10 작업 카드)

## 동봉 파일
- `request.json` — padlet feature 파이프라인 phase0 입력
- `handoff_note.md` — 에이전트 세션 프롬프트
- `seed.yaml` — Seed 전문 (goal·constraints·acceptance_criteria 15건·ontology·evaluation·exit)
- `decisions.md` — Phase 3 결정 (D1~D16) 원본
- `context_links.md` — canva project 참조 문서 경로 + 외부 호출자 스펙 경로
