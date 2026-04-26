"use client";

import { useEffect, useRef, useState } from "react";
import { extractCodeBlocks } from "./extract-code-blocks";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export type VibeCategory = "game" | "quiz" | "art" | "sim";

type ExtractedCode = {
  html?: string;
  css?: string;
  js?: string;
};

type Args = {
  boardId: string;
  canEdit: boolean;
  onCodeExtracted: (extracted: ExtractedCode) => void;
};

export function useVibeChat({ boardId, canEdit, onCodeExtracted }: Args) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [category, setCategory] = useState<VibeCategory | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup in-flight SSE on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function sendChat(
    inputText: string,
    overrideCategory?: VibeCategory | null
  ) {
    const trimmed = inputText.trim();
    if (!trimmed || streaming || !canEdit) return;
    // category 는 카드 클릭에서 state 업데이트와 동시에 호출되므로 state 가
    // 아직 반영 전일 수 있음. 명시적 override 우선.
    const effectiveCategory =
      overrideCategory !== undefined ? overrideCategory : category;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/vibe/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          sessionId,
          userMessage: trimmed,
          category: effectiveCategory ?? undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => `http ${res.status}`));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      let assistantText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffered += decoder.decode(value, { stream: true });
        const frames = buffered.split("\n\n");
        buffered = frames.pop() ?? "";
        for (const frame of frames) {
          if (!frame.startsWith("data:")) continue;
          const json = frame.slice(5).trim();
          if (!json) continue;
          let parsed: {
            type?: string;
            id?: string;
            text?: string;
            message?: string;
          };
          try {
            parsed = JSON.parse(json);
          } catch {
            continue;
          }
          if (parsed.type === "session" && parsed.id) setSessionId(parsed.id);
          if (parsed.type === "delta" && parsed.text) {
            assistantText += parsed.text;
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.streaming) {
                next[next.length - 1] = { ...last, content: assistantText };
              }
              return next;
            });
          }
          if (parsed.type === "error") {
            throw new Error(parsed.message ?? "stream_error");
          }
        }
      }
      // 스트림 종료 후 응답에서 코드 블록 자동 추출 → state 반영.
      // 없는 블록은 건드리지 않아 이전 값 보존.
      onCodeExtracted(extractCodeBlocks(assistantText));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠ ${(e as Error).message}` },
      ]);
    } finally {
      setStreaming(false);
      setMessages((m) =>
        m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg))
      );
    }
  }

  return {
    sessionId,
    messages,
    streaming,
    category,
    setCategory,
    sendChat,
  };
}
