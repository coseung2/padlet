# Research Pack — canva-oembed

## 1. 목표 요약

Aura-board 카드에 Canva 디자인 URL 붙이면 **라이브 iframe 임베드**로 렌더. Notion/Medium/WordPress 가 채택한 oEmbed 저마찰 모델을 Aura-board 에 이식.

## 2. Canva oEmbed 사양 (검증된 공식 동작)

### 2-1. 엔드포인트
- **현재 운영**: `https://www.canva.com/_oembed?url={encoded-design-url}`
- **차세대**: `https://api.canva.com/_spi/presentation/_oembed` (점진 전환)
- 인증 불필요 (**public design** 에 대해서만 응답)

### 2-2. iframe URL 패턴 (oEmbed 응답이 감싸는 src)
```
https://www.canva.com/design/{DESIGN_ID}/view?embed&meta
```
- `embed` — 임베드 모드 활성화
- `meta` — 작성자 / 제목 오버레이 표시

### 2-3. 레이아웃 관습
- 16:9 비율 (`padding-bottom: 56.25%`)
- 반응형 wrapper → 절대 위치 iframe

### 2-4. 디자인 URL 인식 패턴
```
https://www.canva.com/design/DAF.../view
https://www.canva.com/design/DAF.../edit        (에디터 링크 — view 로 정규화)
https://canva.com/design/DAF...                 (www 없음)
https://canva.link/ABC...                       (단축)
```

### 2-5. 보안 / CSP 요구사항
- 호스트 사이트 응답에 `Content-Security-Policy: frame-src https://www.canva.com` 필요
- iframe `sandbox` 권장: `allow-scripts allow-same-origin allow-popups`
- 비공개/교육용 Canva 의 경우 iframe 이 로그인 요구 → 폴백 UI 필요

## 3. 벤치마크 비교

### 3-1. Notion — oEmbed 통합의 모범
- 방식: URL 붙여넣기 → 자동 감지 → `/embed` 블록 자동 변환
- 지원 도메인: Canva, Figma, YouTube, Loom, CodeSandbox 등 50+
- UX 장점: **코드/설정 제로** — 사용자는 링크만 붙임
- 장점: 원본 live, 자동 갱신, 호스트 저장 불필요 → 저장 용량 0
- 단점: 원본 삭제 시 임베드 깨짐, 비공개 자원 접근 안 됨

### 3-2. Padlet (현 레퍼런스)
- 방식: OG metadata + 수동 썸네일. Canva는 일반 링크 카드로만 처리 (iframe 미지원)
- UX 단점: 클릭해야 Canva 웹사이트로 이동 → context switch
- 우리가 넘어설 수 있는 축

### 3-3. Miro / FigJam
- 방식: 앱 마켓플레이스 기반 임베드 (Canva 는 공식 앱 제공)
- UX: 전용 앱 설치 필요 (우리 접근 대비 고마찰)

### 3-4. Medium / WordPress
- 방식: oEmbed Discovery — HTML `<link rel="alternate" type="application/json+oembed">` 자동 탐지
- 적합성: 고급 구현. 우리는 Canva 한정이라 직접 엔드포인트 호출로 충분

## 4. Aura-board 현재 상태 갭 분석

### 이미 있음
- `src/lib/canva.ts` — OAuth, `resolveCanvaDesignId`, `canvaGetDesign`, Export, Folder
- `src/app/api/link-preview/route.ts` — OG 메타 기반 링크 프리뷰
- `src/components/CardAttachments.tsx` — YouTube 전용 iframe 분기 (선행 케이스)
- `/api/canva/*` — OAuth 기반 Canva 조회 경로

### 추가 필요
1. `resolveCanvaEmbedUrl(url)` — oEmbed 호출 + 파싱 (신규 lib 함수)
2. Canva URL 감지 로직 — `canva.com/design`, `canva.link` 패턴
3. `CardAttachments` 에 Canva 분기 추가 — YouTube 스타일
4. `next.config.ts` CSP 갱신 — `frame-src https://www.canva.com`
5. (선택) `Card.kind String @default("link")` — 향후 Google/Notion/Figma 등 확장 대비 (embed-research 결과와 연결)

## 5. UX 결정 포인트

| 이슈 | 옵션 | 권장 |
|---|---|---|
| iframe 비율 고정? | A) 16:9 고정, B) 카드 크기 따라 반응형 | **B** (보드 자유배치와 일관) |
| 로딩 중 상태 | A) 로딩 스피너, B) 썸네일 먼저 표시 후 iframe 스왑 | **B** (체감 속도 + YouTube 패턴 일관) |
| 비공개/차단 폴백 | A) 에러 메시지, B) 링크 프리뷰로 degrade | **B** (기존 OG 프리뷰 재활용) |
| 임베드 파라미터 | A) `embed&meta` (작성자 표시), B) `embed` only | **A** (교실 맥락 — 학생 작품 귀속 명확) |
| 편집 가능성 | A) viewer 도 iframe 보기, B) role 필터 | **A** (iframe 자체가 읽기 전용) |

## 6. 리스크 / 폴백

- **Canva 측 비공개 디자인**: iframe 이 로그인 요구 → OG 메타 프리뷰로 degrade (`linkImage`/`linkTitle` 재사용)
- **학교망 canva.com 차단**: 썸네일만 표시, 클릭 시 새 창
- **oEmbed 엔드포인트 장애**: `resolveCanvaEmbedUrl` 실패 시 기존 링크 카드 플로우로 복귀 (graceful degradation)
- **CSP 미적용**: 브라우저가 iframe 차단 → next.config 확실히 변경 + 빌드 시 검증

## 7. 장단점 요약 (의견 반영 금지 — 양면 제시)

**장점**
- 사용자 저마찰 (URL 붙여넣기만)
- 원본 live sync (별도 갱신 로직 불필요)
- 저장 공간 0 (호스트 썸네일 캐시 없음)
- 기존 link-preview 폴백 경로 재사용 가능

**단점**
- Canva 측 URL 구조 변경에 취약 (외부 의존)
- 비공개 디자인 UX 혼란 (로그인 프롬프트 안에서 벗어나기 어려움)
- CSP 변경 리스크 (다른 iframe 의도와 충돌 가능)
- oEmbed 응답 캐시 전략 필요 (과다 호출 방지)

## 8. 다음 phase 에 제공할 핵심 결정 후보

1. `Card.kind` 필드 추가 여부 (migration 동반) — Yes 권장 (미래 확장)
2. CSP 정책 — `frame-src` 화이트리스트 전략
3. oEmbed 캐시 — in-memory (dev) / unstable_cache / Vercel Runtime Cache
4. 썸네일-iframe 스왑 타이밍 — 로드 완료 이벤트 vs onLoad
