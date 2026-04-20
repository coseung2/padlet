# Phase 0 — Triage: upload-payload-too-large

## 증상 (관찰된 행동만)

- 사용자 보고: PDF 업로드 시도 → 브라우저에서 `FUNCTION_PAYLOAD_TOO_LARGE` 오류 반환.
- 직전 작업 컨텍스트: `ad1ccc3 fix(card-file-attachment): OneDrive PDF 업로드 실패` 이후에도 일부 파일에서 업로드 실패가 재발.
- 증상은 특정 파일이 아니라 특정 크기 이상에서 재현되는 것으로 추정(관찰 확인은 phase1).

## severity 분류

**high**

근거:
- 파일 첨부는 카드/과제 제출 핵심 경로. 실패 시 사용자가 첨부 자체를 못 함.
- 우회 수단 없음 — 파일 쪼개기·압축은 비합리적 UX.
- 데이터 손실·보안 사고는 아님 → `critical` 미해당.

## 긴급 단축 여부

적용 안 함 (`critical` 아님). 정규 incident 파이프라인 따름.

## 영향 표면

- 업로드 엔드포인트: `src/app/api/upload/route.ts`
- 호출부 (4곳): `AddCardModal`, `EditCardModal`, `SubmissionModals`, `plant/ObservationEditor`
- 간접 영향: 카드 첨부, 과제 제출, 식물 관찰 일지 등 파일 업로드 UI 전반

## 초기 관찰·증거

1. 사용자 보고 메시지 (2026-04-20):
   > "에러는 펑션페이로드 투 라지였어"

2. 코드 상태:
   - `src/app/api/upload/route.ts:11` — `const MAX_SIZE = 50 * 1024 * 1024; // 50MB`
   - 현재 설계: `formData.get("file")`로 함수 본문 전체를 받은 뒤 `buffer = Buffer.from(await file.arrayBuffer())`로 메모리 로드.
   - 즉 라우트가 문서상 50MB까지 허용하지만, Vercel 플랫폼이 함수 실행 전에 요청 본문을 잘라냄.

3. Vercel 플랫폼 제약 (knowledge-update 문서):
   - Fluid Compute 포함 모든 함수 요청 본문 제한은 기본 4.5MB.
   - 플랫폼 리젝트이기 때문에 라우트 내부 로그(`console.error("[upload reject] ...")`)는 찍히지 않음. 별도 진단 필요.

## phase1에 전달

- 재현 조건 확정 필요: 실패 시작 크기(~4.5MB), 브라우저/OS 차이, OneDrive·로컬 파일 차이.
- 근본 원인 가설 1순위: Vercel 서버리스 함수 요청 본문 한도(≈4.5MB) 초과.
- 2순위(확인만): multipart 파싱 단계에서 Next.js/Node 18+ Web Streams 관련 예외 재발. (가능성 낮음, ad1ccc3에서 MIME 경로 손댐.)
- 권고안 미리보기 금지 — phase1 진단 결과에 따라 결정.
