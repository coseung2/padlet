# Design Brief — canva-oembed

## 1. 화면/상태 목록

이 feature 는 **새 화면 생성 없음** — 기존 카드 컴포넌트 (`CardAttachments` 내부) 에 Canva 분기 렌더만 추가. 대상 상태:

| 상태 | 렌더 대상 | 보여야 할 정보/행동 |
|---|---|---|
| **loading** | 썸네일 `<img>` 가 oEmbed thumbnail_url 로 먼저 렌더, iframe 은 뒤에서 로드 중 | 썸네일 + 카드 제목/작성자 (attribution) |
| **ready** | iframe 로드 완료 → 썸네일을 iframe 으로 스왑 | Canva 디자인 라이브 iframe, 작성자 오버레이 (Canva `meta` 파라미터 자동) |
| **error / blocked** | iframe onError → 기존 `card-link-preview` (OG 메타) 로 graceful degrade | 썸네일 + 제목 + 링크 외부 아이콘 |
| **private (로그인 요구)** | iframe 내부 Canva 로그인 프롬프트 → 사용자가 감지 불가 → `onError` 경로는 안 탐 | (한계) 현재는 폴백 없이 Canva 로그인 UI 가 그대로 표시됨. 비공개 배지는 OUT 스코프. |
| **empty** | 해당 없음 — Canva URL 없으면 이 분기 자체가 미 렌더 | - |
| **success** | = ready | - |

**CardAttachments 내부의 기존 상태(imageUrl / linkUrl / videoUrl / YouTube)** 는 그대로 유지. Canva 분기는 `linkUrl` 이 Canva 패턴일 때만 활성화.

## 2. 정보 계층

카드 본문 내 정보 우선순위 (시선 위→아래):

1. **(최상) Canva 임베드** — 시각적 주의 점유 (16:9 반응형, 카드 폭 100%)
2. **카드 제목** (`.padlet-card-title`) — 기존 카드 타이틀 유지
3. **카드 본문** (`.padlet-card-content`) — 기존 설명 유지
4. (부차) iframe 내부에 Canva 가 자동 오버레이하는 작성자/제목 — `?embed&meta` 의 `meta` 파라미터에서 제공

시선 흐름: 썸네일/iframe → 제목 → 본문. 드래그 영역은 iframe 외부 여백 (iframe 내부 드래그는 Canva 인터랙션으로 소비).

## 3. 인터랙션 명세

| 행동 | 시스템 반응 |
|---|---|
| 카드 추가 모달에서 Canva URL 붙여넣기 | POST /api/cards 가 resolveCanvaEmbedUrl 호출 → linkTitle/linkImage/linkDesc 자동 채우기 → Card row 저장 |
| 카드 최초 렌더 | 썸네일 `<img>` 즉시 표시 (LCP 선점) → iframe 백그라운드 로드 → 로드 완료 시 썸네일 `opacity: 0` 전환 |
| iframe 내부 클릭 / Canva 인터랙션 | iframe 이 소비 — 보드 드래그/선택 이벤트는 전파되지 않음 (`pointer-events` 는 iframe 우선) |
| 카드 드래그 (free-form / grid) | 기존 react-draggable / DnD 로직 유지 — iframe 은 카드 안의 자식이므로 함께 이동 |
| 카드 편집 (EditCardModal) | linkUrl 이 변경되면 PATCH 가 resolveCanvaEmbedUrl 재호출 (URL-change guard) — 동일 URL 이면 skip |
| 카드 삭제 | 기존 삭제 플로우 그대로 — iframe unmount |
| Canva 원본 수정 | iframe 이 Canva 호스팅 → 사용자가 iframe 리프레시 시 최신 반영 (자동 폴링 없음, MVP 한계) |
| 네트워크 오프라인 | 썸네일 이미 DB 저장된 `linkImage` 이므로 오프라인에서도 보임 (Next.js Image 캐시). iframe 은 회색 영역. |
| 권한 없음 (viewer 에게 숨길 것 없음) | iframe 은 읽기 전용이라 viewer 도 동일하게 렌더. 카드 편집/삭제 버튼은 기존 역할 규칙대로 숨김. |

### 마이크로 인터랙션

- 썸네일 → iframe 스왑은 **opacity 150ms ease** (급 전환 방지, 기존 `.modal-attach-section` 과 일관)
- iframe 로드 실패 시 **card-link-preview** 로 교체는 **즉시 전환** (실패 명확성)

## 4. 접근성 요구

1. **키보드 focus 관리**: iframe 에 `title="{designTitle} by {authorName}"` 속성 (스크린리더 자동 읽음). iframe 자체는 `tabindex` 기본값 유지. iframe 바깥 카드 요소(편집/삭제 버튼)는 기존 포커스 순서 유지 — iframe 이 포커스 트랩을 만들지 않음.
2. **스크린리더 라벨**: 썸네일 `<img alt="{designTitle} Canva preview">`. iframe 의 `title` 속성 필수. 기존 `.card-attachments` 구조 재사용.
3. **명도 대비 / 포커스 가시성**: Canva iframe 내부는 Canva 가 책임. 카드 테두리 포커스 링(`:focus-visible`) 은 기존 `.column-card:focus-visible` 등의 토큰 유지. **신규 추가 없음**.

추가:
4. **축소 모션 선호** (`prefers-reduced-motion`): 썸네일 → iframe 전환 opacity 150ms 를 즉시 전환으로 우회.
5. **에러 상태 명시**: graceful degrade 로 전환될 때 시각적 표시 외 스크린리더가 감지할 수 있도록 기존 `.card-link-preview` 의 `aria-label` 그대로 작동.

## 5. 디자인 시스템 확장 여부

- **기존 토큰/컴포넌트로 커버 가능**:
  - `.padlet-card`, `.card-attachments`, `.card-link-preview` — 재사용
  - `--color-bg`, `--shadow-card-hover`, `--radius-card` — 그대로
  - YouTube `.card-attach-video` wrapper 패턴 — Canva 에 그대로 참조

- **신규 규칙 1개만 추가** (`src/styles/card.css` 또는 컴포넌트 인접 CSS):
  ```css
  .card-canva-embed {
    position: relative;
    width: 100%;
    padding-bottom: 56.25%; /* 16:9 */
    background: var(--color-bg);
    border-radius: var(--radius-card);
    overflow: hidden;
  }
  .card-canva-embed img,
  .card-canva-embed iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
  .card-canva-embed img {
    object-fit: cover;
    transition: opacity 150ms ease;
  }
  .card-canva-embed img[data-loaded="true"] {
    opacity: 0;
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .card-canva-embed img { transition: none; }
  }
  ```

- **디자인 시스템 문서 업데이트 (phase11)**: `docs/design-system.md` 에 `.card-canva-embed` 패턴을 "라이브 임베드 wrapper" 규격으로 등록 — 이후 Figma/Notion/GeoGebra 등 확장 시 재사용 기반이 된다.

## 6. 메타 / shotgun 지침

- **phase5 shotgun 은 2개 변형으로 최소화** (scope_decision §2 쇼트-컷 주석 참조):
  - Variant A: **썸네일 선 렌더 + iframe 페이드-인** (권장 — UX pattern 채택안)
  - Variant B: **iframe 단독 렌더 + 로딩 스피너** (비교용 — LCP 대비 체감차)
- phase6 검수에서 둘 중 하나 확정.
