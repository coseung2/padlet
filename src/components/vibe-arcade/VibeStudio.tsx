"use client";

// VibeStudio — 3탭 에디터 + 실시간 미리보기 + Claude 채팅 (2026-04-21, Phase 2).
//
// 슬롯 카드 클릭으로 열리는 모달. 학생 본인(isSelf)만 편집 가능, 친구/교사는 readonly 미리보기.
// 기존 VibeProject가 없는 슬롯은 "+ 만들기" CTA로 시작. 있으면 기존 3필드 로드.
//
// 저장 경로: POST /api/vibe/projects (3필드 + tags + session). Session은 Claude 대화 시작 시 생성.
// 프록시: /api/vibe/sessions (SSE). EventSource는 GET 전용이라 fetch + reader로 스트림 파싱.

import { useEffect, useMemo, useState } from "react";
import type { VibeSlotDTO } from "@/app/api/vibe/slots/route";
import { buildStudioSrcDoc } from "@/lib/vibe-arcade/sandbox-renderer";
import { VibeChatPanel } from "./VibeChatPanel";
import { useVibeChat, type VibeCategory } from "./useVibeChat";

type ViewerKind = "teacher" | "student" | "none";
type TabKey = "html" | "css" | "js" | "chat";

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
  const [chatInput, setChatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dismissedStarters, setDismissedStarters] = useState(false);

  const {
    sessionId,
    messages,
    streaming,
    setCategory,
    sendChat,
  } = useVibeChat({
    boardId,
    canEdit,
    onCodeExtracted: (extracted) => {
      if (extracted.html !== undefined) setHtmlContent(extracted.html);
      if (extracted.css !== undefined) setCssContent(extracted.css);
      if (extracted.js !== undefined) setJsContent(extracted.js);
    },
  });

  function submitChat() {
    if (!chatInput.trim() || streaming) return;
    setDismissedStarters(true);
    const text = chatInput;
    setChatInput("");
    void sendChat(text);
  }

  function pickCategory(key: VibeCategory, initialMessage: string) {
    setCategory(key);
    setDismissedStarters(true);
    void sendChat(initialMessage, key);
  }

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

  const srcDoc = useMemo(
    () => buildStudioSrcDoc({ htmlContent, cssContent, jsContent }),
    [htmlContent, cssContent, jsContent]
  );

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
          : "HTML 탭에 본문이 있어야 해요."
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
    <div
      className="vs-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Vibe Studio"
    >
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
              <div
                className="vs-studio-tabs"
                role="tablist"
                aria-label="에디터 탭"
              >
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
              <VibeChatPanel
                canEdit={canEdit}
                hasProject={!!slot.project}
                messages={messages}
                streaming={streaming}
                chatInput={chatInput}
                dismissedStarters={dismissedStarters}
                onChatInputChange={setChatInput}
                onDismissStarters={() => setDismissedStarters(true)}
                onPickCategory={pickCategory}
                onSubmit={submitChat}
              />
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
          {loadError && (
            <span className="vs-studio-err">불러오기 실패: {loadError}</span>
          )}
          {saveError && (
            <span className="vs-studio-err">저장 실패: {saveError}</span>
          )}

          {canEdit && (
            <>
              <label className="vs-studio-tag">
                태그
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value as typeof tag)}
                >
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="vs-studio-save"
                onClick={handleSave}
                disabled={saving || streaming}
              >
                {saving
                  ? "저장 중…"
                  : slot.project
                    ? "다시 제출"
                    : "제출하기"}
              </button>
            </>
          )}
          {!canEdit &&
            isTeacher &&
            slot.project?.moderationStatus === "pending_review" && (
              <span className="vs-studio-teacher-hint">
                검토는 모더레이션 패널(별도 창)에서 진행합니다.
              </span>
            )}
        </footer>
      </div>
    </div>
  );
}
