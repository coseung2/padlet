# Phase 1 — Researcher

질문에 대한 문헌/벤치마크/사례 조사.

## 입력

`phase0/question.json`

## 출력

| 파일 | 설명 |
|---|---|
| `phase1/research_pack.md` | 문헌/사례 요약 |
| `phase1/candidates.json` | 비교 후보들의 메타정보 |
| `phase1/source_index.json` | 참조 URL/날짜/저자 |

### candidates.json 구조

```json
[
  {
    "name": "Liveblocks",
    "version": "2.x",
    "license": "commercial",
    "pricing_model": "MAU 기반",
    "docs_url": "…",
    "bundle_size_kb": 0,
    "maintenance_signal": "…"
  }
]
```

## 절차

1. 공식 문서 + 실제 사용 후기 (3개 이상) 수집
2. 각 후보의 **장/단/제약**을 factual로 기록 (옹호 금지)
3. 최신성 확인 — 2년 이상 된 정보는 경고 플래그
4. 비용/라이선스 명시 확인
5. 출처를 `source_index.json`에 URL/날짜/저자로 구조화

## gstack 스킬

없음 (Claude 본체 + WebSearch/WebFetch).

## 금지

- 단일 후보만 조사
- 공식 문서 없이 블로그/트윗만 의존
- 옹호/단정 표현 ("당연히 X가 낫다")

## 핸드오프

3개 파일을 phase2에 전달.
