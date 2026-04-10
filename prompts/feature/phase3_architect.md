# Phase 3 — Architect

승인된 스코프를 기술 설계로 번역. **실제 코드는 쓰지 않는다 — 의사코드/스키마만.**

## 입력

- `phase0/request.json`
- `phase2/scope_decision.md`
- 기존 코드 (read-only)
- `docs/architecture.md` (존재 시 — 첫 feature task에서는 스택 결정 포함)

## 출력

`phase3/design_doc.md`

### 필수 섹션

```markdown
# Design Doc — {slug}

## 1. 데이터 모델 변경
- 신규/수정 테이블 또는 컬렉션 스키마
- 마이그레이션 여부 + 전략

## 2. API 변경
- 신규/수정 엔드포인트 (method, path, req, res)
- 실시간 이벤트 (타입, payload, delivery 보장)

## 3. 컴포넌트 변경
- 신규/수정 컴포넌트 트리 (계층)
- 상태 위치 (client / server / realtime)

## 4. 데이터 흐름 다이어그램
client → API → DB / realtime 흐름 (텍스트 다이어그램)

## 5. 엣지케이스 (최소 5개)
- 네트워크 단절, 동시 편집 충돌, 빈 상태, 권한 부재, 대용량, 실시간 끊김 등

## 6. DX 영향
- 타입/린트/테스트 변경, 빌드/배포 영향

## 7. 롤백 계획
```

## 절차

1. 영향 받는 파일/컴포넌트 모두 식별
2. 데이터 모델 변경은 마이그레이션 전략까지 명시
3. 엣지케이스 ≥ 5개
4. 롤백 계획 필수
5. **첫 feature task**인 경우 프레임워크/실시간 엔진/스토리지 선택을 이 phase에서 내림 — 이후 task에서는 `docs/architecture.md`를 따르기만 함

## gstack 스킬

- `/plan-eng-review` — 아키텍처 락다운, data flow/failure modes/test matrix 검증
- `/plan-devex-review` — DX expansion/polish/triage 질문 통과

## 금지

- 실제 코드 작성 (phase7의 일)
- happy path만 다루고 엣지케이스 생략
- 롤백 계획 누락
- 기존 파일 수정 (read-only)

## 핸드오프

`design_doc.md`를 phase4에 전달.
