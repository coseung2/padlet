# Evidence 1 — 업로드 엔드포인트 구조

`src/app/api/upload/route.ts` (2026-04-20 HEAD=b8ef068)

## 관련 발췌

- `line 11` — `const MAX_SIZE = 50 * 1024 * 1024; // 50MB`
- `line 49-65` — `POST(req)` 진입. `formData = await req.formData()` 로 **요청 본문 전체**를 파싱한 뒤 `file.size > MAX_SIZE`를 비교.
- `line 103` — `const buffer = Buffer.from(await file.arrayBuffer())` — 전체 파일을 서버 메모리에 로드.
- `line 142-149` — 버퍼를 `put(pathname, buffer, { multipart: true, ... })` 로 Blob에 업로드.

## 핵심 지점

요청 본문이 함수에 **전달**되기 전에 Vercel 플랫폼이 4.5MB 초과 페이로드를 리젝트하므로, 위 `MAX_SIZE = 50MB` 검사 지점에 도달하지 못한다. 결과적으로 `console.error("[upload reject] oversize ...")`도 찍히지 않고, 플랫폼이 HTML 413 (`FUNCTION_PAYLOAD_TOO_LARGE`)을 반환한다.
