# Design Brief — breakout-section-isolation

## 1. 화면/상태 목록

### A. Breakout View `/board/:id/s/:sectionId?token=…` (학생/교사 공용)
| 상태 | 내용 |
|---|---|
| empty | 섹션에 카드 없음 → "이 섹션에는 아직 카드가 없어요" 안내 + 교사 모드일 때만 카드 추가 힌트. |
| loading | SSR이므로 별도 skeleton 없음. 페이지 진입 즉시 카드 렌더. |
| ready | 섹션 제목(board title › section title) + 카드 리스트(column-card 스타일 재사용). |
| forbidden | 토큰/권한 실패 시 `.forbidden-card` 패턴 — 헤더 + 설명 + 보드 목록으로 이동 링크. |
| not_found | `notFound()` — Next 기본 404. |

### B. Share Page `/board/:id/s/:sectionId/share` (owner 전용)
| 상태 | 내용 |
|---|---|
| ready | 현재 토큰(없으면 "미생성") + 공유 URL + [링크 복사] 버튼 + [새로 생성] 버튼 + 안내 문구. |
| no_token | accessToken === null → "아직 공유 링크가 없습니다. [생성]" 버튼만 표시. |
| generating | 버튼 disabled + spinner 텍스트 "생성 중…". |
| copied | 복사 성공 시 1.5s간 "복사됨 ✓" 토스트. |
| forbidden | owner 아니면 `.forbidden-card`. |

## 2. 정보 계층

Breakout 뷰:
1. 섹션 제목(크게) + 보드 제목(작게, breadcrumb).
2. 카드 그리드/컬럼. 카드 제목 → 본문 → 첨부.
3. (교사 뷰 진입) 상단 우측 "공유 관리" 링크(owner만).

Share 페이지:
1. 섹션 이름.
2. 공유 URL(선택 가능한 input).
3. [복사] / [새로 생성] CTA. 기본 CTA = 복사. 재생성은 secondary — 위험 액션 문구 포함.

시선 흐름: 제목 → URL → CTA → 안내. F 패턴 기반.

## 3. 인터랙션 명세

| 행동 | 시스템 반응 |
|---|---|
| 공유 페이지에서 [새로 생성] 클릭 | confirm() 수락 시 POST /api/sections/:id/share → 페이지 리로드(토큰 표시 갱신). |
| [복사] 클릭 | navigator.clipboard.writeText(shareUrl) → "복사됨" 마이크로 토스트(1.5s). |
| Breakout 진입(권한 미통과) | 서버에서 403 가드 → `.forbidden-card` 렌더. |
| Breakout URL 토큰 변조 | 서버 403. 클라이언트 재시도 버튼 없음(공유자에게 재문의 안내). |

마이크로 인터랙션:
- 복사 버튼: hover 시 accent 톤, pressed 0.96 scale.
- 재생성 버튼: destructive(border만, bg 투명) → 실수 방지.

## 4. 접근성 요구

1. **키보드 only**: [복사], [새로 생성] 버튼 Tab으로 포커스 이동, Enter/Space로 실행. URL input은 `readonly` + `onFocus select()`.
2. **스크린리더 라벨**: `aria-label="공유 링크 복사"`, `aria-live="polite"`로 "복사됨" 피드백.
3. **포커스 가시성**: 디자인 시스템 `--color-accent-tinted-text` outline 준수. 하드코딩 금지.
4. **명도 대비**: forbidden-card 경고 텍스트는 시맨틱 `#c62828`(기존 Returned 토큰) 사용.

## 5. 디자인 시스템 확장 여부

- 기존 토큰/패턴으로 충분:
  - `.forbidden-card` 기존 사용처(`/board/[id]/page.tsx`).
  - `.column-card`, `.column-title` 기존 컬럼 레이아웃 클래스 재사용.
  - 버튼은 기존 `.column-add-btn` / `.board-back-link` 스타일 재사용 불가하면 새 클래스 2~3개 추가.
- **신규 토큰**: 없음. 순수 기존 토큰으로 구성.
- **신규 컴포넌트**: `SectionBreakoutView`(server), `SectionShareClient`(client) — 둘 다 기존 카드 마크업/CSS 클래스를 재사용.
- **신규 CSS 클래스(최소)**:
  - `.breakout-header` — 섹션 제목 + breadcrumb
  - `.breakout-grid` — 카드 리스트 컨테이너(모바일 1열 / 태블릿 2열 / 데스크톱 3열)
  - `.share-panel`, `.share-url-input`, `.share-actions`, `.share-status` — share 페이지 UI

shotgun 4~6 variant 생성은 정당화되지 않는다(단순 링크 복사 UI). **SKIP_phase5_shotgun.md에 사유 기록**하고, single spec으로 진행한다.
