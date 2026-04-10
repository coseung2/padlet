# Phase 1 — Researcher

유사 제품/선행 사례/UX 패턴을 수집해 구현 결정의 근거를 만든다.

## 입력

`phase0/request.json`

## 출력

| 파일 | 설명 |
|---|---|
| `phase1/research_pack.md` | 유사 제품 스크린샷/동작 요약 + 핵심 UX 패턴 분석 |
| `phase1/benchmark_index.json` | 참조 대상 (padlet.com, miro, figjam 등) URL/캡처 경로 |
| `phase1/ux_patterns.json` | 감지된 UX 패턴 (drag rail, magnetic guide, snap grid 등) |

## 절차

1. `request.json`의 `affected_surfaces`에 해당하는 실제 Padlet 동작 관찰 (live URL 또는 스크린샷)
2. 2~3개 벤치마크 제품에서 동일 기능 구현 비교
3. 핵심 UX 패턴을 `ux_patterns.json`에 구조화 (`pattern_id`, `description`, `source_url`)
4. 각 패턴의 **장단점**을 `research_pack.md`에 정리 (무조건 옹호 금지)
5. 스크린샷/증거는 `phase1/benchmark/` 아래에 저장

## gstack 스킬

- `/browse` — 실제 서비스 관찰 (헤디드 Chromium). 스크린샷을 `phase1/benchmark/`에 저장.

## 금지

- 벤치마크 없이 의견만 제시
- 스크린샷/증거 없는 주장
- 단일 레퍼런스 제품만 분석

## 핸드오프

3개 파일 + `benchmark/` 디렉토리를 phase2에 전달.
