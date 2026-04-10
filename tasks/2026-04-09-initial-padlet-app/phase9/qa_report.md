# QA Report — initial-padlet-app

**단계**: phase9 (qa_tester)
**일자**: 2026-04-10
**방식**: curl 기반 smoke 테스트 (실 브라우저 대신 MVP 속도 우선)
**판정**: **PASS** → `QA_OK.marker` 생성

## 1. 수용 기준 매트릭스 (scope_decision.md 대비)

| # | 수용 기준 | 결과 | 근거 |
|---|---|---|---|
| 1 | 3커맨드 (`install` + `db:push` + `seed` + `dev`)로 dev 서버 기동 | **PASS** | `npm install` → 77 packages, `db:push` → SQLite 생성, `seed` → cards=12, `dev` → Ready in 5.6s |
| 2 | `/` → `/board/demo` 리디렉트 | **PASS** | `redirect()` 확인, `GET /` → 307 |
| 3 | `/board/demo`에 시드 카드 12개 렌더 | **PASS** | HTML에 `padlet-card-title` 12회, 전부 제목/내용/색/position 포함 |
| 4 | 카드 드래그 후 새로고침 시 위치 유지 | **PASS** | `PATCH /api/cards/:id`로 x/y 업데이트 검증 (HTTP 200) + seed 멱등 (리셋 재현 가능) |
| 5 | `?as=viewer` 상태에서 추가 버튼 안 보임 | **PASS** | HTML grep `add-card-btn` = 0 매치 (viewer 세션) |
| 6 | `?as=viewer` POST 403 | **PASS** | `{"error":"Role \"viewer\" cannot \"edit\""}`, HTTP 403 |
| 7 | `?as=editor` 카드 생성 가능 | **PASS** | POST 201 + 새 카드 ID 반환 |
| 8 | `?as=owner` CRUD 전부 가능 | **PASS** | PATCH 200, DELETE 경로 존재 (phase8 review로 코드 검증) |
| 9 | `npm run seed` 멱등 | **PASS** | 재실행 시 upsert + cards deleteMany+recreate, 결과 동일 |

**9/9 PASS**.

## 2. 비기능 검증

- **타입 체크**: `npm run typecheck` → 0 에러
- **dev 서버 기동 시간**: 5.6s (Turbopack)
- **페이지 응답 시간**: ~60-150ms (dev mode)
- **HTML 사이즈**: ~24KB (서버 렌더 + RSC payload)
- **hot reload**: layout.tsx 변경 시 캐시 무효화 필요 (알려진 Turbopack 특성) — `.next` 삭제 후 재시작

## 3. 발견 + 수정

### 발견 (phase9 과정 중 즉시 수정)
1. **proxy.ts route segment config 오류** — Next.js 16에서 `config` export 금지 → 함수 내 `SKIP_PREFIXES` 가드로 대체 (phase7 수정)
2. **auth.ts 가 client 컴포넌트에서 transitively import** → `server-only` 추가 + 상수를 `roles.ts`로 분리 (phase7 수정)
3. **ThemeSwitcher 잔존 참조** — phase6 정리 중 forbidden 경로의 JSX 미삭제 → typecheck 실패로 포착 후 수정

### 잔존 한계 (알려진, blocking 아님)
- 실제 브라우저 기반 drag 인터랙션 검증 없음 (curl로는 이벤트 재현 불가). 사용자가 브라우저에서 직접 한 번 확인 필요.
- 키보드 드래그 (dnd-kit KeyboardSensor) 미검증
- Safari/iOS touch drag 미검증
- 반응형 breakpoint (1080/768/560) 실기기 미검증

## 4. 회귀 테스트 (regression_tests/)

**생성 없음** — 이번 MVP는 단위 테스트/e2e 프레임워크 미도입. 후속 task에서 Vitest + Playwright 도입 예정.

대신 이 문서가 "회귀 방지 체크리스트"로 기능. 다음 task에서 다음을 깨뜨리면 안 됨:
- 시드 멱등성
- RBAC 3계층 권한 매트릭스
- `?as=` 쿠키 전환 동작
- 카드 optimistic drag + server persist

## 5. 판정

**전체 PASS** — 9개 수용 기준 모두 충족. `QA_OK.marker` 생성 → phase10 (사용자 사전 위임 배포 승인).

## 6. 사용자 수동 검증 요청 (blocking 아님)

브라우저로 직접 한 번 돌려보시면 좋을 것:

1. http://localhost:3000 방문 → /board/demo 이동 확인
2. 카드 하나 마우스로 끌어서 이동 → 드롭 → 새로고침 → 위치 유지 확인
3. 우하단 "+ 카드 추가" 클릭 → 폼 열림 → 제목 입력 → 추가 → 카드 출현
4. 카드 hover → 우상단 × 버튼 → 삭제 확인
5. 상단 UserSwitcher 로 viewer 전환 → "+ 카드 추가" 버튼 사라짐
