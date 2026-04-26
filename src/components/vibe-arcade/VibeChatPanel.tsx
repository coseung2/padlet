"use client";

import { useRef } from "react";
import type { ChatMessage, VibeCategory } from "./useVibeChat";

const CATEGORY_OPTIONS: ReadonlyArray<{
  key: VibeCategory;
  emoji: string;
  label: string;
  initialMessage: string;
}> = [
  {
    key: "game",
    emoji: "🎮",
    label: "게임",
    initialMessage: "게임을 만들어 보고 싶어요.",
  },
  {
    key: "quiz",
    emoji: "🧩",
    label: "퀴즈",
    initialMessage: "퀴즈를 만들어 보고 싶어요.",
  },
  {
    key: "art",
    emoji: "🎨",
    label: "아트",
    initialMessage: "인터랙티브한 시각 작품을 만들고 싶어요.",
  },
  {
    key: "sim",
    emoji: "🧪",
    label: "시뮬",
    initialMessage: "간단한 시뮬레이션을 만들고 싶어요.",
  },
];

type Props = {
  canEdit: boolean;
  hasProject: boolean;
  messages: ChatMessage[];
  streaming: boolean;
  chatInput: string;
  dismissedStarters: boolean;
  onChatInputChange: (text: string) => void;
  onDismissStarters: () => void;
  onPickCategory: (key: VibeCategory, initialMessage: string) => void;
  onSubmit: () => void;
};

export function VibeChatPanel({
  canEdit,
  hasProject,
  messages,
  streaming,
  chatInput,
  dismissedStarters,
  onChatInputChange,
  onDismissStarters,
  onPickCategory,
  onSubmit,
}: Props) {
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const showStarters =
    messages.length === 0 && canEdit && !hasProject && !dismissedStarters;
  const showHint =
    messages.length === 0 && (dismissedStarters || !canEdit || hasProject);

  return (
    <div className="vs-chat">
      <div className="vs-chat-log" aria-live="polite">
        {showStarters && (
          <div
            className="vs-starter-grid"
            role="group"
            aria-label="시작 분야 선택"
          >
            <p className="vs-starter-title">무엇을 개발해 보시겠어요?</p>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                className="vs-starter-card"
                disabled={streaming}
                onClick={() => onPickCategory(c.key, c.initialMessage)}
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
                onDismissStarters();
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
        {showHint && (
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
            onSubmit();
          }}
        >
          <textarea
            ref={chatInputRef}
            className="vs-chat-input"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="요청을 입력하고 Enter"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
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
  );
}
