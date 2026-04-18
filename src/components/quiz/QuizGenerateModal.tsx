"use client";

// Modal that combines B2 (option input), B3 (draft editor), and B4
// (past-quiz reuse) into a single two-step flow.
//
// step = "options" → teacher picks difficulty + count (or the library tab);
//                    hitting "생성" (new) calls /api/quiz/draft which returns
//                    questions without persisting. Hitting "이 퀴즈 재사용"
//                    (library) calls /api/quiz/:id/clone and closes.
// step = "draft"   → editing the draft returned from the LLM; "저장" posts
//                    to /api/quiz/create with draftQuestions.

import { useEffect, useRef, useState } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { QuizDraftEditor } from "./QuizDraftEditor";
import { QuizLibraryList } from "./QuizLibraryList";
import type {
  QuizDifficulty,
  QuizDraftQuestion,
  QuizLibraryItem,
} from "@/types/quiz";

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: QuizDifficulty;
  label: string;
}> = [
  { value: "easy", label: "쉬움" },
  { value: "medium", label: "중간" },
  { value: "hard", label: "어려움" },
];

type Tab = "new" | "library";
type Step = "options" | "draft";

export interface QuizGenerateModalProps {
  boardId: string;
  onClose: () => void;
  onCreated: (quiz: { id: string } & Record<string, unknown>) => void;
}

export function QuizGenerateModal({
  boardId,
  onClose,
  onCreated,
}: QuizGenerateModalProps) {
  const [tab, setTab] = useState<Tab>("new");
  const [step, setStep] = useState<Step>("options");

  // step1 form state
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [countMode, setCountMode] = useState<"auto" | "fixed">("auto");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [libraryPick, setLibraryPick] = useState<string | null>(null);

  // async state
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // step2 draft
  const [draft, setDraft] = useState<QuizDraftQuestion[] | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // When a draft is pending, Esc and backdrop close both route through
  // a confirm so the teacher doesn't lose edits by reflex (design_doc §5.11).
  const draftPending = !!draft;
  const requestClose = () => {
    if (draftPending && !confirm("저장하지 않은 변경이 있습니다. 닫으시겠습니까?")) {
      return;
    }
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPending]);

  // Warn teacher about unsaved draft on page unload.
  useEffect(() => {
    if (!draft) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draft]);

  async function handleGenerate() {
    setErrorMsg(null);
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("boardId", boardId);
      fd.append("text", text);
      if (file) fd.append("file", file);
      fd.append("difficulty", difficulty);
      fd.append("countMode", countMode);
      if (countMode === "fixed") fd.append("questionCount", String(questionCount));

      const res = await fetch("/api/quiz/draft", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { questions: QuizDraftQuestion[] };
      setDraft(data.questions);
      setStep("draft");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReuse() {
    if (!libraryPick) return;
    setErrorMsg(null);
    setCloning(true);
    try {
      const res = await fetch(`/api/quiz/${libraryPick}/clone`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { quiz: { id: string } };
      onCreated(data.quiz);
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "재사용 실패");
    } finally {
      setCloning(false);
    }
  }

  async function handleSave(edited: QuizDraftQuestion[]) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("boardId", boardId);
      fd.append("difficulty", difficulty);
      fd.append("countMode", countMode);
      fd.append("questionCount", String(edited.length));
      fd.append("draftQuestions", JSON.stringify(edited));
      if (file?.name) fd.append("title", file.name);
      const res = await fetch("/api/quiz/create", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { quiz: { id: string } };
      onCreated(data.quiz);
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const canGenerate = !!(text.trim() || file);

  return (
    <>
      <div className="modal-backdrop" onClick={requestClose} />
      <div
        className="quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-label={step === "draft" ? "퀴즈 편집" : "퀴즈 만들기"}
      >
        <div className="quiz-modal-header">
          <h2 className="quiz-modal-title">
            {step === "draft" ? "퀴즈 편집" : "퀴즈 만들기"}
          </h2>
          <button
            type="button"
            className="quiz-modal-close"
            onClick={requestClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {step === "options" && (
          <div className="quiz-modal-body">
            <div className="quiz-modal-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "new"}
                className={`quiz-modal-tab${tab === "new" ? " is-active" : ""}`}
                onClick={() => setTab("new")}
              >
                새로 만들기
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "library"}
                className={`quiz-modal-tab${tab === "library" ? " is-active" : ""}`}
                onClick={() => setTab("library")}
              >
                과거 퀴즈
              </button>
            </div>

            {tab === "new" && (
              <div className="quiz-modal-new">
                <label className="quiz-modal-label">주제 또는 내용</label>
                <textarea
                  className="quiz-text-input"
                  placeholder="퀴즈를 만들 내용을 입력하세요"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={generating}
                />
                <div className="quiz-modal-file-row">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    className="quiz-btn quiz-btn-secondary"
                    onClick={() => fileRef.current?.click()}
                    disabled={generating}
                  >
                    📎 {file ? file.name : "파일 첨부"}
                  </button>
                  {file && (
                    <button
                      type="button"
                      className="quiz-modal-file-clear"
                      onClick={() => setFile(null)}
                      disabled={generating}
                    >
                      제거
                    </button>
                  )}
                </div>

                <label className="quiz-modal-label">난이도</label>
                <SegmentedControl<QuizDifficulty>
                  value={difficulty}
                  onChange={setDifficulty}
                  options={DIFFICULTY_OPTIONS}
                  ariaLabel="난이도 선택"
                />

                <label className="quiz-modal-label">문항 수</label>
                <div
                  role="radiogroup"
                  aria-label="문항 수 선택"
                  className="quiz-modal-count"
                >
                  <label className="quiz-modal-count-row">
                    <input
                      type="radio"
                      name="count-mode"
                      checked={countMode === "auto"}
                      onChange={() => setCountMode("auto")}
                      disabled={generating}
                    />
                    <span>AI가 정함</span>
                  </label>
                  <label className="quiz-modal-count-row">
                    <input
                      type="radio"
                      name="count-mode"
                      checked={countMode === "fixed"}
                      onChange={() => setCountMode("fixed")}
                      disabled={generating}
                    />
                    <span>직접 지정</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      className="quiz-modal-count-input"
                      value={questionCount}
                      onChange={(e) =>
                        setQuestionCount(
                          Math.min(20, Math.max(1, parseInt(e.target.value || "1", 10)))
                        )
                      }
                      disabled={countMode !== "fixed" || generating}
                    />
                    <span className="quiz-modal-count-hint">(1~20)</span>
                  </label>
                </div>

                {errorMsg && (
                  <div className="quiz-modal-error" role="alert">
                    ⚠ {errorMsg}
                  </div>
                )}

                <div className="quiz-modal-actions">
                  <button
                    type="button"
                    className="quiz-btn quiz-btn-primary"
                    disabled={!canGenerate || generating}
                    onClick={handleGenerate}
                  >
                    {generating ? "⟳ 생성 중..." : "퀴즈 생성 →"}
                  </button>
                </div>
              </div>
            )}

            {tab === "library" && (
              <div className="quiz-modal-library">
                <QuizLibraryList
                  selectedId={libraryPick}
                  onSelect={setLibraryPick}
                />
                {errorMsg && (
                  <div className="quiz-modal-error" role="alert">
                    ⚠ {errorMsg}
                  </div>
                )}
                <div className="quiz-modal-actions">
                  <button
                    type="button"
                    className="quiz-btn quiz-btn-primary"
                    disabled={!libraryPick || cloning}
                    onClick={handleReuse}
                  >
                    {cloning ? "⟳ 복사 중..." : "이 퀴즈 재사용 →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "draft" && draft && (
          <div className="quiz-modal-body">
            <QuizDraftEditor
              questions={draft}
              onChange={setDraft}
              onBack={() => {
                setDraft(null);
                setStep("options");
              }}
              onSave={handleSave}
              saving={saving}
            />
            {errorMsg && (
              <div className="quiz-modal-error" role="alert">
                ⚠ {errorMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export type { QuizLibraryItem };
