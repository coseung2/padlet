"use client";

// VibeStudio — 3탭 에디터 + 실시간 미리보기 + Claude 채팅 (2026-04-21, Phase 2).
//
// 슬롯 카드 클릭으로 열리는 모달. 학생 본인(isSelf)만 편집 가능, 친구/교사는 readonly 미리보기.
// 기존 VibeProject가 없는 슬롯은 "+ 만들기" CTA로 시작. 있으면 기존 3필드 로드.
//
// 저장 경로: POST /api/vibe/projects (3필드 + tags + session). Session은 Claude 대화 시작 시 생성.
// 프록시: /api/vibe/sessions (SSE). EventSource는 GET 전용이라 fetch + reader로 스트림 파싱.

import { useEffect, useMemo, useRef, useState } from "react";
import type { VibeSlotDTO } from "@/app/api/vibe/slots/route";
import { buildStudioSrcDoc } from "@/lib/vibe-arcade/sandbox-renderer";

type ViewerKind = "teacher" | "student" | "none";
type TabKey = "html" | "css" | "js" | "chat";

type ChatMessage = { role: "user" | "assistant"; content: string; streaming?: boolean };

// 챗 응답에서 ```html ...```, ```css ...```, ```js ...``` 블록을 찾아
// 마지막 것으로 html/css/js state 를 세팅. 학생은 탭 없이 챗만 쓰니
// 자동 반영이 필수 (수동 복붙 경로가 사라졌음).
function extractCodeBlocks(text: string): {
  html?: string;
  css?: string;
  js?: string;
} {
  const blocks: { html?: string; css?: string; js?: string } = {};
  const re = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lang = (m[1] ?? "").toLowerCase();
    const body = m[2].replace(/\n$/, "");
    if (lang.startsWith("html") || lang === "htm") blocks.html = body;
    else if (lang === "css") blocks.css = body;
    else if (
      lang === "js" ||
      lang === "javascript" ||
      lang === "mjs" ||
      lang === "jsx"
    )
      blocks.js = body;
  }
  if (!blocks.html && /<!doctype html|<html[\s>]/i.test(text)) {
    const m2 = text.match(/<!doctype html[\s\S]*?<\/html\s*>|<html[\s\S]*?<\/html\s*>/i);
    if (m2) blocks.html = m2[0];
  }
  return blocks;
}

type Props = {
  boardId: string;
  classroomId: string;
  slot: VibeSlotDTO;
  viewerKind: ViewerKind;
  selfStudentId: string | null;
  onClose: () => void;
};

const TAG_OPTIONS = ["게임", "퀴즈", "시뮬", "아트", "기타"] as const;

// 첫 진입 학생을 위한 분야 선택지. 카드 클릭 → 서버가 해당 분야 시스템
// 프롬프트로 Gemini 를 인터뷰 모드로 띄움. 학생은 AI 질문에 답하며 작품을
// 구체화한 뒤 코드 생성 → 그 이후는 자유 프롬프트로 수정 iterate.
// "직접 입력" 은 category 없이 기본 시스템 프롬프트로 바로 진입.
type VibeCategory = "game" | "quiz" | "art" | "sim";

const CATEGORY_OPTIONS: ReadonlyArray<{
  key: VibeCategory;
  emoji: string;
  label: string;
  initialMessage: string;
}> = [
  { key: "game", emoji: "🎮", label: "게임", initialMessage: "게임을 만들어 보고 싶어요." },
  { key: "quiz", emoji: "🧩", label: "퀴즈", initialMessage: "퀴즈를 만들어 보고 싶어요." },
  { key: "art", emoji: "🎨", label: "아트", initialMessage: "인터랙티브한 시각 작품을 만들고 싶어요." },
  { key: "sim", emoji: "🧪", label: "시뮬", initialMessage: "간단한 시뮬레이션을 만들고 싶어요." },
];

export function VibeStudio({
  boardId,
  slot,
  viewerKind,
  selfStudentId,
  onClose,
}: Props) {
  const isSelf = slot.studentId === selfStudentId && viewerKind === "student";
  const isTeacher = viewerKind === "teacher";
  const canEdit = isSelf;

  // 학생은 챗만. 교사/readonly 뷰어는 기존 html 탭 시작 (디버깅·리뷰용).
  const [tab, setTab] = useState<TabKey>(isSelf ? "chat" : "html");
  const [title, setTitle] = useState(slot.project?.title ?? "");
  const [htmlContent, setHtmlContent] = useState("");
  const [cssContent, setCssContent] = useState("");
  const [jsContent, setJsContent] = useState("");
  const [tag, setTag] = useState<(typeof TAG_OPTIONS)[number]>("게임");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissedStarters, setDismissedStarters] = useState(false);
  // 학생이 분야 카드에서 고른 카테고리. 서버에 매 요청마다 같이 보내서
  // Gemini 가 해당 분야 인터뷰 프롬프트로 응답하게 함.
  const [category, setCategory] = useState<VibeCategory | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // 기존 프로젝트 로드 (편집/readonly 공통).
  useEffect(() => {
    if (!slot.project) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/vibe/projects/${slot.project!.id}`);
        if (!res.ok) throw new Error(`load ${res.status}`);
        const data = (await res.json()) as {
          title: string;
          htmlContent: string;
          cssContent: string;
          jsContent: string;
          tags: string;
        };
        if (cancelled) return;
        setTitle(data.title);
        setHtmlContent(data.htmlContent);
        setCssContent(data.cssContent ?? "");
        setJsContent(data.jsContent ?? "");
        try {
          const parsed = JSON.parse(data.tags);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            if (TAG_OPTIONS.includes(first as (typeof TAG_OPTIONS)[number])) {
              setTag(first as (typeof TAG_OPTIONS)[number]);
            }
          }
        } catch {
          /* ignore malformed */
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot.project]);

  // Cleanup in-flight SSE on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const srcDoc = useMemo(
    () => buildStudioSrcDoc({ htmlContent, cssContent, jsContent }),
    [htmlContent, cssContent, jsContent],
  );

  async function sendChat(
    overrideText?: string,
    overrideCategory?: VibeCategory | null,
  ) {
    const trimmed = (overrideText ?? chatInput).trim();
    if (!trimmed || streaming || !canEdit) return;
    // category 는 카드 클릭에서 state 업데이트와 동시에 호출되므로 state 가
    // 아직 반영 전일 수 있음. 명시적 override 우선.
    const effectiveCategory =
      overrideCategory !== undefined ? overrideCategory : category;
    setChatInput("");
    setDismissedStarters(true);
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);
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
          let parsed: { type?: string; id?: string; text?: string; message?: string };
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
      const extracted = extractCodeBlocks(assistantText);
      if (extracted.html !== undefined) setHtmlContent(extracted.html);
      if (extracted.css !== undefined) setCssContent(extracted.css);
      if (extracted.js !== undefined) setJsContent(extracted.js);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMessages((m) => [...m, { role: "assistant", content: `⚠ ${(e as Error).message}` }]);
    } finally {
      setStreaming(false);
      setMessages((m) => m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg)));
    }
  }

  async function handleSave() {
    if (!canEdit || !sessionId) {
      setSaveError("먼저 Claude와 대화해서 작품을 만들어 주세요.");
      return;
    }
    if (!title.trim()) {
      setSaveError("제목을 입력해 주세요.");
      return;
    }
    if (!htmlContent.trim()) {
      setSaveError(
        isSelf
          ? "작품이 아직 없어요. Claude 에게 만들고 싶은 걸 더 구체적으로 요청해 주세요."
          : "HTML 탭에 본문이 있어야 해요.",
      );
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/vibe/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          sessionId,
          title: title.trim(),
          description: "",
          htmlContent,
          cssContent,
          jsContent,
          tags: [tag],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `save ${res.status}`);
      }
      onClose();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vs-backdrop" role="dialog" aria-modal="true" aria-label="Vibe Studio">
      <div className="vs-studio">
        <header className="vs-studio-head">
          <div className="vs-studio-head-left">
            {canEdit ? (
              <input
                type="text"
                className="vs-studio-title-input"
                placeholder="작품 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
              />
            ) : (
              <h2 className="vs-studio-title">{title || "제목 없음"}</h2>
            )}
            <span className="vs-studio-author">by {slot.studentName}</span>
          </div>
          <button
            type="button"
            className="vs-studio-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="vs-studio-body">
          <div className="vs-studio-editor">
            {/* 학생은 챗 탭만 보임 — html/css/js 는 챗 응답에서 자동 추출. */}
            {!isSelf && (
              <div className="vs-studio-tabs" role="tablist" aria-label="에디터 탭">
                {(["html", "css", "js", "chat"] as const).map((k) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={tab === k}
                    className={`vs-studio-tab${tab === k ? " is-active" : ""}`}
                    onClick={() => setTab(k)}
                  >
                    {k === "chat" ? "💬 Claude" : k.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {tab === "html" && (
              <textarea
                className="vs-studio-textarea"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                readOnly={!canEdit}
                spellCheck={false}
                placeholder="<h1>안녕!</h1>"
              />
            )}
            {tab === "css" && (
              <textarea
                className="vs-studio-textarea"
                value={cssContent}
                onChange={(e) => setCssContent(e.target.value)}
                readOnly={!canEdit}
                spellCheck={false}
                placeholder="body { font-family: system-ui; }"
              />
            )}
            {tab === "js" && (
              <textarea
                className="vs-studio-textarea"
                value={jsContent}
                onChange={(e) => setJsContent(e.target.value)}
                readOnly={!canEdit}
                spellCheck={false}
                placeholder="console.log('hi');"
              />
            )}
            {tab === "chat" && (
              <div className="vs-chat">
                <div className="vs-chat-log" aria-live="polite">
                  {messages.length === 0 &&
                    canEdit &&
                    !slot.project &&
                    !dismissedStarters && (
                      <div className="vs-starter-grid" role="group" aria-label="시작 분야 선택">
                        <p className="vs-starter-title">
                          무엇을 개발해 보시겠어요?
                        </p>
                        {CATEGORY_OPTIONS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            className="vs-starter-card"
                            disabled={streaming}
                            onClick={() => {
                              setCategory(c.key);
                              void sendChat(c.initialMessage, c.key);
                            }}
                          >
                            <span className="vs-starter-emoji" aria-hidden>
                              {c.emoji}
                            </span>
                            <span className="vs-starter-label">{c.label}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="vs-starter-card vs-starter-custom"
                          onClick={() => {
                            setDismissedStarters(true);
                            requestAnimationFrame(() => {
                              chatInputRef.current?.focus();
                            });
                          }}
                        >
                          <span className="vs-starter-emoji" aria-hidden>
                            ✏️
                          </span>
                          <span className="vs-starter-label">직접 입력하기</span>
                        </button>
                      </div>
                    )}
                  {messages.length === 0 &&
                    (dismissedStarters || !canEdit || slot.project) && (
                      <p className="vs-chat-hint">
                        {canEdit
                          ? "만들고 싶은 작품을 자유롭게 설명해 주세요."
                          : "이 작품은 다른 친구 것이라 대화를 볼 수 없어요."}
                      </p>
                    )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`vs-chat-msg vs-chat-msg-${m.role}${m.streaming ? " is-streaming" : ""}`}
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
                {canEdit && (
                  <form
                    className="vs-chat-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendChat();
                    }}
                  >
                    <textarea
                      ref={chatInputRef}
                      className="vs-chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="요청을 입력하고 Enter"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendChat();
                        }
                      }}
                      disabled={streaming}
                    />
                    <button
                      type="submit"
                      className="vs-chat-send"
                      disabled={streaming || chatInput.trim().length === 0}
                    >
                      {streaming ? "전송 중…" : "보내기"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="vs-studio-preview">
            <div className="vs-studio-preview-label">미리보기</div>
            <iframe
              title="vibe-studio-preview"
              className="vs-studio-iframe"
              srcDoc={srcDoc}
              sandbox="allow-scripts"
            />
          </div>
        </div>

        <footer className="vs-studio-foot">
          {loadError && <span className="vs-studio-err">불러오기 실패: {loadError}</span>}
          {saveError && <span className="vs-studio-err">저장 실패: {saveError}</span>}

          {canEdit && (
            <>
              <label className="vs-studio-tag">
                태그
                <select value={tag} onChange={(e) => setTag(e.target.value as typeof tag)}>
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="vs-studio-save"
                onClick={handleSave}
                disabled={saving || streaming}
              >
                {saving ? "저장 중…" : slot.project ? "다시 제출" : "제출하기"}
              </button>
            </>
          )}
          {!canEdit && isTeacher && slot.project?.moderationStatus === "pending_review" && (
            <span className="vs-studio-teacher-hint">
              검토는 모더레이션 패널(별도 창)에서 진행합니다.
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
