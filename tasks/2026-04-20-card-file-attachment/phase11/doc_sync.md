# Doc Sync — card-file-attachment

## 1. 변경 대상 문서

- `CLAUDE.md` — 경로/환경 변경 없음 (스킵)
- `README.md` — 사용자 facing 변경 없음 (솔로 프로젝트, 내부 사용) — 스킵
- `docs/current-features.md` — 있다면 "카드 첨부" 섹션에 파일 추가. 현재 이 파일이 repo에 명시적으로 존재하지 않음 — 본 task 산출물이 바로 인덱스 역할 (`tasks/2026-04-20-card-file-attachment/`)
- `docs/architecture.md` — 데이터 모델 항목 갱신 필요

## 2. `docs/architecture.md` 변경 요지

Card 모델 필드 목록에 다음 4개 추가:

```
fileUrl        — 파일 첨부 Blob URL (null = 파일 없음)
fileName       — 사용자 노출용 원본 파일명 (최대 255자)
fileSize       — bytes, 서버 상한 50MB
fileMimeType   — 문서 화이트리스트 MIME 7종
```

직렬화 경로:
- `POST /api/upload` → `{ url, type, name, size, mimeType }` (확장)
- `POST /api/cards` / `PATCH /api/cards/:id` — 4개 fileField 수용 + 서버 측 isAllowedFileUrl/isAllowedStoredMime 검증
- `GET /api/boards/:id/stream` (SSE) — CardWire에 4개 필드 포함

## 3. Learn · Retro

### 잘한 점
- 기존 모달 UI 패턴(`modal-attach-btn` + `modal-attach-section`)을 그대로 재사용 → UX 학습 비용 0, 디자인 shotgun 단계 압축.
- 매직바이트 검증은 PDF/ZIP 계열만 엄선해 False-Positive(legit hwp/txt 거부) 방지.
- codex 리뷰 1회차 HIGH 3건은 즉각 수정 → 2회차 재검증은 artifact로 간주.

### 개선 여지
- EditCardModal에 파일 편집 UI가 없음(스코프 OUT). 사용자가 카드 생성 후 파일 교체 원할 시 후속 task 필요.
- PDF 썸네일 자동 생성(1페이지 캡처)은 보관 비용 대비 효용 제한적이라 이번 스코프 OUT. 필요 시 별도 task.
- 바이러스/멀웨어 스캔은 MVP 범위 밖. 운영 규모 확장 시 ClamAV / Cloud Armor 도입 검토.

## 4. 후속 task 후보

- `feat: card-file-edit` — EditCardModal에 파일 교체/제거 UI
- `research: pdf-thumbnail-pipeline` — PDF 1페이지 썸네일 변환 (Vercel Functions or Supabase Edge Function)
- `research: office-inline-viewer` — DOCX/XLSX/PPTX 인라인 (Office Online Viewer / 변환)

## 5. 학습 메모 (사용자 auto-memory 후보)

- Vercel Blob put()의 `contentDisposition` 옵션은 inline/attachment 분기에 필수. 기본은 inline.
- `@vercel/blob`의 public URL 하위도메인은 `*.public.blob.vercel-storage.com` 고정. URL 화이트리스트 검증 시 `endsWith(".public.blob.vercel-storage.com")` 패턴이 하위도메인 스푸핑 차단에 안전.

## 완료

`tasks/2026-04-20-card-file-attachment/` 디렉토리가 feature의 audit trail. 모든 phase 산출물 포함(phase0-3, 5, 7-11). phase4/6는 design_spec.md에 통합(shotgun 단계가 좁은 feature).
