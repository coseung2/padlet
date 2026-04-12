# Research Pack — breakout-section-isolation

로컬 캡처는 이번 task 컨텍스트에서 실행할 수 없기에 (WSL2 환경, headless Chromium 없음) 공개 문서/UX 가이드/현재 코드의 동작을 증거로 사용한다. 실제 브라우저 확인은 phase9 QA에서 dev 서버로 대체.

## 벤치마크 개요

| 제품 | 섹션 격리 패턴 | 공유 방식 | 링크 | 관찰 |
|---|---|---|---|---|
| Padlet (upstream) | "Section view" 탭 + 개별 URL 없음 | 보드 단위 공유만 가능 | https://help.padlet.com/hc/en-us/articles/5067625005335-Sections | 섹션만 공유하는 URL 부재 ⇒ 교실에서 모둠 격리가 불가. 우리 제품의 차별 포인트. |
| Miro | "Frame" 단위 share link | `board?moveToWidget=<frameId>` (zoom-only) | https://help.miro.com/hc/en-us/articles/360017572334 | 링크로 포커스는 되지만 payload는 보드 전체 — 태블릿 성능 문제 동일. |
| FigJam | Section/Container 공유 없음 | 보드 전체 링크만 | https://help.figma.com/hc/en-us/articles/1500006471901 | 뷰어 권한 단위만 제공. |
| Google Jamboard (EOL) | Frame URL `#frame=N` | payload는 전체 프레임 번들 | 참고용 | 프레임 번호 해시만으로 격리되지 않음. |
| Zoom Breakout (메타포) | 브레이크아웃 룸 = 격리된 세션 | 방마다 고유 조인 링크 | https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0063867 | 본 기능의 메타포 — "토큰 기반 방 단위 격리" 채택. |

## 핵심 UX 원칙 추출

1. **명시적 공유 링크**: 섹션별 URL이 달라야 교사가 학생에게 전달 가능. Miro처럼 쿼리스트링 만으로는 격리 불충분.
2. **토큰 회전 가능**: 수업 단위로 링크 수명 제한. 교사가 재생성 시 이전 링크 무효화.
3. **서버 사이드 격리**: zoom 식 "룸" 비유를 코드로 옮기면 → 서버가 섹션별로만 쿼리/스트리밍해야 함. 클라이언트 필터 금지(정보 유출).
4. **교사 통합 뷰 회귀 금지**: 기존 `/board/[id]` 플로우는 그대로 — Breakout 뷰는 덧붙이기.

## 장단점 분석

### A. Signed URL + DB-stored accessToken (채택 후보)
- 장점: 구현 단순, 서버에서 즉시 검증, 회전 가능, DB 단일 소스.
- 단점: 토큰을 알면 비회원도 열람. 학생 인증과 조합해야 교실 누출 방지.

### B. JWT short-lived 토큰 (대안)
- 장점: 토큰 만료/서명 자동. DB 컬럼 불필요.
- 단점: 회전 = 서명키 교체 → 폭발 반경 넓음. 솔로 MVP엔 과설계.

### C. NextAuth 세션만 + 섹션 멤버십 테이블 (대안)
- 장점: 토큰 없이도 정상 동작. 공유 링크 유출 리스크 제거.
- 단점: 학생(Student 모델)은 NextAuth 세션이 아닌 student_session 쿠키. 추가 멤버십 테이블 필요 → 범위 초과.

**결정**: A안 채택. `Section.accessToken` 옵셔널 컬럼 + rbac 헬퍼로 "토큰 일치 OR 보드 멤버" 검증. MVP 범위 최소화.

## 증거

- 현재 `/board/[id]` 페이지는 `db.card.findMany({ where: { boardId } })`로 **보드 전체 카드**를 내려받음 (`src/app/board/[id]/page.tsx` L57-61). 이번 task 전/후 payload 비교로 격리 효과 QA 가능.
- `BoardMember`는 owner/editor/viewer 3단 롤 보유. "회전/공유" 액션은 owner만 허용하는 것이 다른 write API (`PATCH /api/sections/:id`가 `edit` 권한 요구)와 일관되지만, 토큰 회전은 더 민감하므로 **owner 전용**으로 상향.
- `Student` 세션은 `classroomId` 기반. 섹션 토큰 플로우에 학생이 들어올 때 `Student.classroomId == board.classroomId` 체크로 교실 누출을 최소한 차단 가능.
