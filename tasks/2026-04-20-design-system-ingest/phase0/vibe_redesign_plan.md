# T8 — Vibe + Gallery 재설계 계획 (follow-up task로 이관)

이번 design-system-ingest 세션에서 **코드 변경 없이 설계만** 확정. 실제 구현은 별도 feature task로 분리 (추정 9~12시간, schema migration + 신규 board layout + Studio 재작성 + Gallery 신규 보드 수반).

---

## 사용자 컨펌 사항 (plan 하단 ✅)

- **T8-1**: Vibe 스키마 **B안(3필드 분리)** — `htmlContent`를 body 전용으로 축소 + `cssContent`/`jsContent` 컬럼 추가. migration 필요.
- **T8-2**: status 매핑 — handoff 4단계(empty/in-progress/needs-review/submitted)를 기존 `moderationStatus`(6단계)에 매핑. 상세 매핑은 구현 시점 결정.
- **T8-3**: Gallery 보드 — **별도 `Board.layout="vibe-gallery"`** 신규 규약 추가.
- **T8-4**: Claude API 서버 프록시 유지 (현 `/api/vibe/sessions` SSE). `window.claude.complete` 직접 호출은 API Key 노출로 불가.

## 스키마 변경 (Prisma migration)

```prisma
model VibeProject {
  // 기존 필드 유지
  htmlContent   String  // 의미 축소: <body> 본문만
  cssContent    String  @default("")  // 신규: <style> 블록
  jsContent     String  @default("")  // 신규: <script> 블록
  // ...
}
```

**Migration 이름 제안**: `20260422_vibe_project_split_html_css_js`

서버 렌더러(`src/lib/vibe-arcade/sandbox-renderer.ts`)에서 `buildSrcDoc`으로 세 필드 합쳐 iframe srcdoc 생성.

## status 매핑 제안

| handoff slot status | 기존 `moderationStatus` |
|---|---|
| `empty` (슬롯 비어있음) | 프로젝트 없음 (레코드 미생성) |
| `in-progress` | `draft` |
| `needs-review` | `pending_review` |
| `submitted` | `approved` |
| (추가) `rejected` | `rejected` |
| (추가) `flagged`/`hidden` | `flagged`/`hidden` |

**UI 표시 전략**: 슬롯 카드에선 4단계로 단순화(empty/진행중/검토대기/제출됨), 교사 모더레이션 패널에서만 6단계 전체 노출.

## 신규 Board.layout = "vibe-gallery"

`src/components/CreateBoardModal.tsx` LAYOUTS 배열에 추가:
```ts
{ id: "vibe-gallery", emoji: "🖼️", label: "바이브 갤러리", desc: "승인된 vibe 프로젝트를 전시·큐레이션" }
```

`prisma/schema.prisma` Board.layout 주석 업데이트.

## 컴포넌트 재설계

1. `VibeArcadeBoard.tsx` — 슬롯 그리드 (학생 × 1 = 프로젝트 1개/학생). status별 카드 variant.
2. `VibeStudio.tsx` **신규** — HTML/CSS/JS 3탭 에디터 + 실시간 미리보기 iframe.
3. `VibeGalleryBoard.tsx` **신규** — layout="vibe-gallery" 전용. 승인된 프로젝트 큐레이션 카드.
4. `VibePlayModal.tsx` — iframe sandbox 플레이 (기존 iframe-lru 재활용).

## Claude 연동 (유지)

- 서버 프록시: `POST /api/vibe/sessions` (이미 존재) → SSE stream of Claude responses.
- 클라이언트는 fetch + EventSource로 토큰 스트림 수신.
- API Key는 서버 환경변수(`ANTHROPIC_API_KEY`)에서만 접근. 빌링 옵션 A (사용자 별도 결제) 유지.

## 단계 분할 (별도 task)

| Phase | 내용 | 추정 |
|---|---|---|
| 0 | migration + schema 수정 + 롤백 전략 | 1h |
| 1 | VibeArcadeBoard 슬롯 그리드 + status 매핑 | 2h |
| 2 | VibeStudio 3탭 에디터 + srcDoc 프리뷰 | 3h |
| 3 | Claude 대화 UI + SSE 스트림 수신 | 2h |
| 4 | VibeGalleryBoard (신규 layout) + 큐레이션 | 2h |
| 5 | 기존 catalog 뼈대 → 재설계된 컴포넌트로 전환 (성능·regression 검증) | 2h |
| **합** | | **12h** |

## 이번 세션 T8 진행 상태

- **코드 변경**: 없음 (의도적)
- **산출물**: 이 설계 문서 1건.
- **plan 체크박스**: T8-1~T8-4 모두 `[~]` (deferred) 로 유지. 실제 ✅ 처리는 후속 task 완료 후.
