# Evidence 2 — 클라이언트 에러 표시 경로

`src/components/AddCardModal.tsx:155-172`

```tsx
res = await fetch("/api/upload", { method: "POST", body: form });
...
if (!res.ok) {
  let reason = `HTTP ${res.status}`;
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j.error) reason = j.error;
  } catch {
    if (text) reason = text;   // ← HTML 본문이 그대로 reason 으로
  }
  ...
}
```

## 핵심 지점

Vercel 플랫폼 413은 HTML 페이지 응답이며 본문에 `FUNCTION_PAYLOAD_TOO_LARGE` 문자열이 포함된다. 이 코드가 JSON 파싱에 실패하면 HTML 텍스트를 그대로 `reason`으로 저장한다. 사용자는 "FUNCTION_PAYLOAD_TOO_LARGE"라는 원시 문자열을 목격하게 된다 — 사용자 보고와 정확히 일치.

같은 패턴이 다음 호출부에서도 공유됨:
- `src/components/EditCardModal.tsx:38`
- `src/components/SubmissionModals.tsx:42`
- `src/components/plant/ObservationEditor.tsx:65`
