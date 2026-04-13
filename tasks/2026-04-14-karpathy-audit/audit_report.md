# Karpathy 4 원칙 — 전체 코드베이스 감사 보고서

실행: 2026-04-14, 4 슬랩 병렬 감사 (3 sub-agent + 1 인라인).

원칙 (`docs/coding-principles-karpathy.md` 참조):
1. Think Before Coding — 가정 명시
2. Simplicity First — 요청 범위만
3. Surgical Changes — 모든 변경 줄이 요청으로 추적
4. Goal-Driven Execution — 검증 가능한 성공 기준

심각도: HIGH(즉시 수정) · MED(다음 iteration) · LOW(폴리시)

---

## 슬랩 A — Drawing Studio (sub-agent #1)

판정: **MINOR revision needed**

### Principle 1
- `DrawingStudio.tsx:199-210` MED — `e.tiltX ?? 0` 폴백이 비펜 입력에서 의미 없음. 주석 누락.
- `DrawingStudio.tsx:103-112` LOW — localStorage JSON parse 실패 silent ignore, 의도 미문서화.

### Principle 2
- `HSVWheel.tsx:175-180` LOW — `useCallback(paint) + useEffect([paint])` 이중 indirection. 단일 `useEffect([hsv])` 로 충분.
- `BrushPresets.ts:52-57` MED — `pressureFactor` 의 0.1 floor 매직 넘버, 근거 미문서화.
- `FloodFill.ts:7` MED — `TOLERANCE = 32` 매직, 경험적 선택 미문서화.

### Principle 3
- `RightRail.tsx:90-91` MED — `orient="vertical"` 비표준 attr + CSS 같이 — **dead weight**, 제거 가능.
- `BrushPresets.ts:291` MED — `eraserProfile.id = "pencil"` placeholder 잔재. StrokeEngine은 `tool === "eraser"`로 분기.
- `DrawingStudio.tsx:265-267` LOW — `releasePointerCapture` try-catch 가 일어나지 않을 케이스 방어.

### Principle 4
- `DrawingStudio.tsx:341-343` HIGH — `flatten(layers)` 가 invisible "배경" 레이어 시 투명 PNG 출력. 가드/경고 없음.
- `DrawingStudio.tsx:375` MED — `onSaved?.()` 후 silent. 사용자에게 저장 성공 피드백 부재(다이얼로그 닫힘만).
- `useViewportGestures.ts:93-97` MED — tap 임계값 `<10px`, `<250ms` 매직. 근거 미문서화.

---

## 슬랩 B — Canva + OAuth + External API (sub-agent #2)

판정: **MINOR revision needed**

### Principle 1
- `external-auth.ts:48-54` MED — error union 에 `token_revoked` (PAT 전용) + `revoked`/`expired` (OAuth 전용) 혼재. discriminate 없음.
- `external-auth.ts:57-69` LOW — fast-path prefix 검사 + path handler 재검증 이중 가드. 최적화 의도 미문서화.
- `oauth-server.ts:193,309` vs `external-pat.ts:288` MED — 만료 비교 `<` vs `<=` 불일치 (off-by-one).

### Principle 2
- `external-auth.ts:48-54` LOW — error union 과·세분. 경로별 분리 권장.
- `external-pat.ts:164,188` (scopeBoardIds) MED — 의미 미문서화. OAuth 항상 `[]` 인 이유 부재.
- `api/external/cards/route.ts:239` LOW — `void tokenPrefix; // silence` — 사용 또는 제거.

### Principle 3
- `external-auth.ts` MED — PAT→OAuth 병합 흔적. error code 통일 또는 분리 필요.
- `lib/canva.ts:24-26` MED — `getRedirectUri()` 기본값 `/api/auth/canva/callback` — 라우트 미존재. 잔재.

### Principle 4
- `oauth-server.ts:108-111` & `external-pat.ts:280-281` MED — timing-safe 주장 일관성 부족 (`canvaGetDesign` 등 비-auth 경로엔 적용 X). 테스트 부재.
- `lib/canva.ts:35-40` LOW — Canva PKCE generator 가 우리 OAuth provider PKCE와 다른 컨텍스트. 주석으로 구분 필요.
- `api/external/cards/route.ts:85-90` MED — 3-axis OR 동작이 응답 헤더에만 surfacing, 본문엔 설명 없음.
- 통합 테스트 부재 — PAT/OAuth 양 경로 error union, PKCE replay, student attribution fallback.

---

## 슬랩 C — Auth + QR + 학생/로그인 (sub-agent #3)

판정: **MINOR revision needed (1 HIGH)**

### Principle 1
- `lib/auth.ts:32-43` **HIGH** — Mock auth 가 production 환경에서도 `as` 쿠키 없으면 default `owner` 폴백. NODE_ENV 가드 부재 → 비인증 방문자가 mock owner 로 인식되는 보안 약점 (이전 세션에서도 메모리 증발 진단 시 관찰).
- `lib/student-auth.ts:40-46` MED — `createStudentSession` 이 `classroom` 존재 검증 없이 sessionVersion 만 사용. classroomId 가 dangling 이면 후속 가드 비효율.

### Principle 2
- 쿠키 reader 3종(teacher mock-as, student HMAC, parent SHA256) DRY 위반 MED — `lib/cookie-session.ts` 추출 가능.
- `lib/auth.ts:49-52` MED — `isAuthenticated()` export 됐으나 어디서도 호출 X. dead.

### Principle 3
- `app/qr/[token]/route.ts` ✅ CLEAN — page→route 전환이 surgical.
- `app/login/page.tsx` ✅ CLEAN — 3-way hub 정돈.

### Principle 4
- `app/api/student/auth/route.ts` ✅ CLEAN
- `lib/parent-scope.ts:48-65` ✅ CLEAN — 계층 가드 401 vs 403 명시
- `app/student/page.tsx:6-11` ✅ CLEAN

---

## 슬랩 D — Board features + event-signup + breakout (인라인, 빠른 감사)

판정: **MINOR (장기 리팩토링 후보)**

### Principle 1
- `app/board/[id]/page.tsx:162-177` MED — 학생 viewer 폴백이 항상 `effectiveRole = "viewer"`. accessMode = `public-link` 이거나 invitation 케이스에 대한 가정 미문서화.

### Principle 2
- `app/board/[id]/page.tsx` MED — 625 줄 단일 파일에 10 layout 디스패치. `renderBoard()` switch 가 길어 가독성 ↓. 향후 layout 별 hook 분리 검토.
- `BreakoutBoard.tsx` 575 줄 — 단일 컴포넌트로 무거움. (관찰만 — 분할은 별도 task)

### Principle 3
- `app/board/[id]/page.tsx:497-509` ✅ — drawing 분기에 viewerKind 매핑 명시, surgical
- `app/board/[id]/page.tsx:510-524` ✅ — event-signup 분기 정리됨

### Principle 4
- `app/b/[slug]/page.tsx` (event-signup public) ✅ CLEAN — token timing-safe 검증, 닫힌 윈도우 분기 명시
- `app/b/[slug]/select/page.tsx` (breakout self-select) ✅ CLEAN — classroom 검증, 자동 join 분기

---

## 종합 통계

| 슬랩 | HIGH | MED | LOW | 판정 |
|---|---|---|---|---|
| A 드로잉 | 1 | 5 | 3 | MINOR |
| B Canva/OAuth/External | 0 | 7 | 4 | MINOR |
| C Auth/QR/Login | 1 | 3 | 0 | MINOR |
| D Board/Event/Breakout | 0 | 3 | 0 | MINOR |
| **합계** | **2** | **18** | **7** | **MINOR (전반)** |

## HIGH 즉시 처리 권장 (2건)

1. **`lib/auth.ts:32-43`** — Mock auth 의 production 무가드 fallback. 비인증 방문자가 `u_owner` 로 자동 매핑되는 구조. 가드 추가 필요.
2. **`DrawingStudio.tsx:341-343`** — 배경 레이어 비가시 시 투명 PNG 저장 silently. 가드 또는 경고 추가.

## MED 모음 (다음 iteration)

- 매직 넘버 문서화 (TOLERANCE=32, pressureFactor 0.1, tap thresholds)
- error code union 정리 (PAT vs OAuth)
- dead code 제거 (orient attr, eraser id, isAuthenticated, void tokenPrefix, getRedirectUri 미존재 라우트)
- Canva flatten 가드, 저장 성공 토스트
- 쿠키 reader 3종 DRY 추출 (선택)
- timing-safe 일관성 + 테스트 추가 (선택)

## LOW 폴리시 (여유 시)

- 주석 누락 (e.tiltX 폴백, localStorage parse, 이중 PKCE 컨텍스트 등)
- HSVWheel useCallback 단순화

## 종합 verdict

**전체 MINOR**. 코드베이스가 iterative solo 개발 + 다수 hot fix 환경 치고는 견고. HIGH 2건은 즉시 처리 가치 있고, MED 18건은 다음 maintenance window 에 일괄 polish.

**중요한 발견 1건 — auth.ts 의 production mock fallback**: 사용자가 이전 세션에서 "로그인 정보 사라짐" 이슈로 보고했던 정확한 그 동작. 이전 세션에선 "세션 만료 → mock fallback" 으로 진단했지만, **production 에서 mock fallback 자체가 의도된 동작인지 미문서화 + 가드 부재**가 근본 문제. Karpathy §1(Think Before Coding) + §2(Simplicity — production 에 dev 폴백 노출) 이중 위반.
