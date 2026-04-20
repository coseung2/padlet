# Evidence 3 — Vercel 플랫폼 요청 본문 한도

## 출처

Vercel Functions 요청·응답 한도 공식 문서 (https://vercel.com/docs/functions/limitations).

## 요점

- Vercel Functions(Fluid Compute 포함)의 **요청 본문 최대 크기**는 기본 **4.5MB**.
- 이 한도는 플랜(Hobby/Pro/Enterprise) 무관하게 고정이며, 라우트 코드가 실행되기 전에 에지 레이어에서 리젝트된다.
- 413 응답은 플랫폼 HTML 페이지이며 `x-vercel-error: FUNCTION_PAYLOAD_TOO_LARGE` 헤더와 본문 내 `FUNCTION_PAYLOAD_TOO_LARGE` 문자열을 포함.
- 한도를 넘겨야 하는 업로드 시나리오에 대해 Vercel 공식 권장 패턴은 **클라이언트 직접 업로드(Vercel Blob client direct upload)** — `@vercel/blob/client`의 `upload()` + 서버의 `handleUpload()` 조합으로 브라우저가 Blob 스토리지에 직접 PUT.

## 프로젝트 상태

- `@vercel/blob ^2.3.3` 이미 설치 (`package.json:dependencies`).
- 현재 서버 경로는 `put(pathname, buffer, { multipart: true })`를 이용해 **서버→Blob** 업로드를 수행(멀티파트는 Blob 내부 청크 업로드일 뿐, 함수 수신 한도와는 무관).
- 즉, 4.5MB 한도를 우회하려면 **클라이언트→Blob 직접 업로드**로 바꿔야 함.
