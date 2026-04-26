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

### 조사 우선순위 (효율 가이드)

- **레이아웃·시각 패턴 결정**: Google Images 등 이미지 검색이 우선. `학생 포트폴리오 dashboard ui`, `classroom gallery sidebar layout` 같은 키워드로 한 번에 다양한 후보를 훑어 빠르게 결정. 헤디드 브라우저로 도큐 페이지 깊이 파는 건 효율 떨어짐.
- **가시성·권한·승인 정책**: 도큐/help center 텍스트가 더 정확. 이미지로 안 보이는 정책 비교 (peer 공개 vs 학부모 전용, 교사 승인 게이트 유무) 가 필요할 때만 깊이 읽기.
- 두 트랙은 보통 함께 가지만, 시각 결정에 가중치가 크면 이미지 검색을 먼저 1라운드 돌린 뒤 정책 비교는 보조로.

## gstack 스킬

- `/browse` — 실제 서비스 관찰 (헤디드 Chromium). 스크린샷을 `phase1/benchmark/`에 저장.

## 금지

- 벤치마크 없이 의견만 제시
- 스크린샷/증거 없는 주장
- 단일 레퍼런스 제품만 분석

## 핸드오프

3개 파일 + `benchmark/` 디렉토리를 phase2에 전달.
