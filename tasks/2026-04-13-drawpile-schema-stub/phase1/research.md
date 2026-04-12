# Phase 1 — Product/UX Research

## Drawpile 관련 — 사전 지식 정리
- Drawpile: 오픈소스 공동 그림판. GPL-3.0. 자체 서버 호스팅 가능. Web 프론트는 Qt/WASM 하이브리드.
- **COOP/COEP 요구**: SharedArrayBuffer 기반 wasm 스레드 사용 → Cross-Origin-Isolation 필수 (COOP `same-origin` + COEP `require-corp`).
- 통합 방식 후보:
  1. **iframe 임베드** — 우리가 선택. 서버 도메인은 별도 (`drawpile.aura-board.app`), origin 격리.
  2. WASM 직접 번들: GPL-3.0 전염 위험 → 제외.
- postMessage 브리지: `{type: "drawpile:save", payload: {thumbnail, fileUrl}}` 형식 제안 (roadmap 기반). 실제 구현은 fork 패치 필요.

## UX 패턴 — 레퍼런스
- **Padlet `map` / `canvas`**: 레이아웃 스위치 기반. 우리 `layout` enum 확장 패턴과 일치.
- **Figma FigJam, Whimsical**: 작업실/갤러리 분리가 아닌 단일 캔버스. 우리 교실 시나리오는 "개인 작업 + 공개 갤러리" 두 모드가 필요.
- **Eduaide Drawtime, Google Canvas (학급용)**: 학생 개인 스튜디오 + 교사 갤러리 대시보드. → 우리 패턴과 정합.

## 내부 코드 — 재사용 가능 컴포넌트/유틸
- `/api/upload` — 기존 파일 업로드 엔드포인트. StudentAsset 업로드는 별도 엔드포인트로 분리 (StudentAsset row 생성 필요).
- `src/lib/student-auth.ts` — `getCurrentStudent()` 학생 세션 조회.
- `src/lib/rbac.ts` — getBoardRole 패턴. StudentLibrary 접근 제어에 재사용.
- `src/components/CardAttachments.tsx` — 카드 첨부 UI. 라이브러리 선택으로 확장 가능.
- Layout union: `src/app/board/[id]/page.tsx` `LAYOUT_LABEL` 맵 + switch. 'drawing' 추가 위치 확정.
- zod 검증: `src/app/api/boards/route.ts` `CreateBoardSchema.layout` enum. 여기에 'drawing' 추가.

## 디자인 토큰
- 기존 `docs/design-system.md` 의 tokens 재사용 (색상, spacing, radius).
- drawing 전용 추가 토큰 없음 (iframe 은 full-bleed, sidebar 는 기존 panel pattern).

## 기술 제약 (구현 단계 고려사항)
- iframe `sandbox` 속성: `allow-scripts allow-same-origin allow-forms allow-modals` 필요.
- COOP/COEP: 설정은 next.config.ts 에 이 task 에서 **삽입하지 않는다** (Drawpile 서버 실제 주소 확보 전 다른 iframe 기능을 깨뜨릴 위험). BLOCKERS.md 에 기록.
- env var: `NEXT_PUBLIC_DRAWPILE_URL` 미설정 → 안내 카드. 설정됨 → iframe 로드.

## postMessage 이벤트 계약 (제안 — 문서화용)
```
// child → parent
{ type: "drawpile:ready", version: "1" }
{ type: "drawpile:save", payload: {
  assetId?: string,           // 기존 자산 갱신 시
  fileUrl: string,             // 외부 스토리지 URL (Drawpile 서버 생성)
  thumbnailUrl: string,
  title?: string,
  width?: number, height?: number,
  format: "png" | "ora"
}}
// parent → child
{ type: "drawpile:load", payload: { fileUrl } }
```

## 결론 (strategist 입력용)
- 통합 방식: iframe only. 서버 주소는 env.
- 스키마: StudentAsset(생성자=Student) + AssetAttachment(조인). roadmap spec 그대로.
- UI 스텁은 Drawpile 없이도 의미있게 동작해야 함 (업로드 경로로 시드).
- GPL 격리는 코드 레벨 non-issue (iframe only). 레포 분리 필요 (블로커).
