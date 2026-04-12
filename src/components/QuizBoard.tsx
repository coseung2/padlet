"use client";

import { memo, useState, useEffect, useMemo, useRef, useCallback } from "react";

export type QuizQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
};

export type QuizData = {
  id: string;
  title: string;
  roomCode: string;
  status: "waiting" | "active" | "finished";
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  players: { id: string; nickname: string; score: number }[];
};

type Props = { boardId: string; quizzes: QuizData[] };
type LLMSettings = { provider: "openai" | "anthropic"; apiKey: string };

const OPT_COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
const OPT_LABELS = ["A", "B", "C", "D"];

export function QuizBoard({ boardId, quizzes: initial }: Props) {
  const [quizzes, setQuizzes] = useState<QuizData[]>(initial);
  const [showLLM, setShowLLM] = useState(false);
  const [llm, setLlm] = useState<LLMSettings>({ provider: "openai", apiKey: "" });
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dist, setDist] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const quiz = quizzes[0] ?? null;

  useEffect(() => {
    const pm = document.cookie.match(/llm_provider=([^;]+)/);
    const km = document.cookie.match(/llm_api_key=([^;]+)/);
    if (pm || km) {
      setLlm({
        provider: (pm?.[1] as LLMSettings["provider"]) ?? "openai",
        apiKey: km ? decodeURIComponent(km[1]) : "",
      });
    }
  }, []);

  useEffect(() => {
    if (!quiz || quiz.status === "finished") return;
    const es = new EventSource(`/api/quiz/${quiz.id}/stream`);

    es.addEventListener("quiz-status", (e) => {
      try {
        const d = JSON.parse(e.data);
        setQuizzes((prev) => prev.map((q) =>
          q.id === quiz.id ? { ...q, status: d.status, currentQuestionIndex: d.currentQ ?? q.currentQuestionIndex } : q
        ));
      } catch {}
    });

    es.addEventListener("players", (e) => {
      try {
        const d = JSON.parse(e.data);
        setQuizzes((prev) => prev.map((q) =>
          q.id === quiz.id ? { ...q, players: d.players } : q
        ));
      } catch {}
    });

    es.addEventListener("answers", (e) => {
      try {
        const d = JSON.parse(e.data);
        setDist(d.distribution ?? {});
      } catch {}
    });

    es.addEventListener("finished", (e) => {
      try {
        const d = JSON.parse(e.data);
        setQuizzes((prev) => prev.map((q) =>
          q.id === quiz.id ? { ...q, status: "finished", players: d.players } : q
        ));
      } catch {}
    });

    es.onerror = () => es.close();
    return () => es.close();
  }, [quiz?.id, quiz?.status]);

  function saveLLM(s: LLMSettings) {
    setLlm(s);
    document.cookie = `llm_provider=${s.provider};path=/;max-age=31536000;SameSite=Lax`;
    document.cookie = `llm_api_key=${encodeURIComponent(s.apiKey)};path=/;max-age=31536000;SameSite=Lax`;
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("boardId", boardId);
      fd.append("text", text);
      if (file) fd.append("file", file);
      const res = await fetch("/api/quiz/create", { method: "POST", body: fd });
      if (res.ok) { const { quiz: nq } = await res.json(); setQuizzes([nq]); setText(""); setFile(null); }
      else alert(`퀴즈 생성 실패: ${await res.text()}`);
    } catch { alert("퀴즈 생성 중 오류가 발생했습니다."); }
    finally { setCreating(false); }
  }

  async function action(a: "start" | "next" | "finish") {
    if (!quiz) return;
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: a }),
      });
      if (res.ok) { const { quiz: u } = await res.json(); setQuizzes((p) => p.map((q) => (q.id === u.id ? u : q))); }
    } catch (e) { console.error(e); }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type.startsWith("text/"))) setFile(f);
  }, []);

  // ---- No quiz yet ----
  if (!quiz) {
    return (
      <div className="board-canvas-wrap"><div className="quiz-board">
        <div className={`quiz-upload ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)} onDrop={onDrop}
          onClick={() => fileRef.current?.click()}>
          <div className="quiz-upload-icon">📄</div>
          <div className="quiz-upload-title">{file ? file.name : "PDF 또는 텍스트 파일을 드래그하세요"}</div>
          <div className="quiz-upload-hint">클릭하여 파일 선택</div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="quiz-upload-or">또는 직접 입력</div>
        <textarea className="quiz-text-input" placeholder="퀴즈를 만들 내용을 입력하세요..." value={text} onChange={(e) => setText(e.target.value)} />
        <div className="quiz-actions">
          <button type="button" className="quiz-btn quiz-btn-secondary" onClick={() => setShowLLM(true)}>LLM 설정</button>
          <button type="button" className="quiz-btn quiz-btn-primary" disabled={creating || (!file && !text.trim())} onClick={handleCreate}>
            {creating ? "생성 중..." : "퀴즈 생성"}
          </button>
        </div>
        {showLLM && <LLMModal settings={llm} onSave={(s) => { saveLLM(s); setShowLLM(false); }} onClose={() => setShowLLM(false)} />}
      </div></div>
    );
  }

  // ---- Quiz exists ----
  // Memoize the sorted player list so PlayerList's referential equality check
  // actually has a stable array when only `dist` (distribution ticks) changes.
  const sorted = useMemo(
    () => [...(quiz.players ?? [])].sort((a, b) => b.score - a.score),
    [quiz.players]
  );
  const curQ = quiz.questions[quiz.currentQuestionIndex] ?? null;
  const isActive = quiz.status === "active";
  const isFinished = quiz.status === "finished";

  return (
    <div className="board-canvas-wrap"><div className="quiz-board">
      <div className="quiz-room-code">
        <span className="quiz-room-code-label">참가 코드</span>
        <span className="quiz-room-code-value" onClick={() => { navigator.clipboard.writeText(quiz.roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{quiz.roomCode}</span>
        <span className="quiz-room-code-copied">{copied ? "복사됨!" : ""}</span>
        <QuizUrl roomCode={quiz.roomCode} />
        <div className="quiz-qr-area">QR Code</div>
      </div>

      <div className="quiz-info-card">
        <div className="quiz-info-title">{quiz.title || "퀴즈"}</div>
        <div className="quiz-info-meta">
          <span>문제 {quiz.questions.length}개</span>
          <span className={`quiz-status-badge quiz-status-${quiz.status}`}>
            {isActive ? "진행 중" : isFinished ? "종료됨" : "대기 중"}
          </span>
        </div>
      </div>

      <div className="quiz-actions">
        {quiz.status === "waiting" && <button type="button" className="quiz-btn quiz-btn-success" onClick={() => action("start")}>시작</button>}
        {isActive && curQ && <>
          <button type="button" className="quiz-btn quiz-btn-primary" onClick={() => action("next")}>다음 문제</button>
          <button type="button" className="quiz-btn quiz-btn-danger" onClick={() => action("finish")}>종료</button>
        </>}
      </div>

      {isActive && curQ && (
        <div className="quiz-question">
          <div className="quiz-question-number">문제 {quiz.currentQuestionIndex + 1} / {quiz.questions.length}</div>
          <div className="quiz-question-text">{curQ.text}</div>
          <Distribution dist={dist} correctIndex={curQ.correctIndex} />
        </div>
      )}

      <PlayerList players={sorted} />

      {isFinished && <Leaderboard players={sorted} />}
    </div></div>
  );
}

// Answer-distribution bars — depends only on the four-bucket dist map and
// the current question's correctIndex, so memoize it. Player-score-only
// SSE updates no longer repaint these bars.
const Distribution = memo(function Distribution({
  dist,
  correctIndex,
}: {
  dist: Record<string, number>;
  correctIndex: number;
}) {
  const total = useMemo(
    () => Object.values(dist).reduce((s, v) => s + v, 0) || 1,
    [dist]
  );
  return (
    <div className="quiz-distribution">
      {OPT_LABELS.map((label, i) => {
        const count = dist[label] ?? 0;
        return (
          <div key={i} className="quiz-dist-row">
            <div className="quiz-dist-label" style={{ background: OPT_COLORS[i] }}>{label}</div>
            <div className="quiz-dist-bar-wrap">
              <div
                className={`quiz-dist-bar ${i === correctIndex ? "correct" : ""}`}
                style={{ width: `${(count / total) * 100}%`, background: OPT_COLORS[i] }}
              />
            </div>
            <span className="quiz-dist-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
});

// Player list re-renders only when the sorted players array reference
// changes — distribution ticks no longer touch it.
const PlayerList = memo(function PlayerList({
  players,
}: {
  players: { id: string; nickname: string; score: number }[];
}) {
  return (
    <div className="quiz-player-list">
      <div className="quiz-player-list-header">
        <span>참가자</span>
        <span className="quiz-player-count">{players.length}명</span>
      </div>
      <div className="quiz-player-grid">
        {players.map((p) => (
          <div key={p.id} className="quiz-player-chip">
            <span>{p.nickname}</span>
            <span className="quiz-player-score">{p.score}점</span>
          </div>
        ))}
        {players.length === 0 && (
          <span style={{ color: "var(--color-text-faint)", fontSize: 13 }}>
            아직 참가자가 없습니다
          </span>
        )}
      </div>
    </div>
  );
});

function Leaderboard({ players }: { players: { id: string; nickname: string; score: number }[] }) {
  const t = players.slice(0, 3);
  return (
    <div className="quiz-leaderboard">
      <div className="quiz-leaderboard-title">최종 순위</div>
      {t.length >= 2 && (
        <div className="quiz-podium">
          <div className="quiz-podium-slot"><div className="quiz-podium-name">{t[1]?.nickname}</div><div className="quiz-podium-bar quiz-podium-bar-2">2</div><div className="quiz-podium-score">{t[1]?.score}점</div></div>
          <div className="quiz-podium-slot"><div className="quiz-podium-name">{t[0]?.nickname}</div><div className="quiz-podium-bar quiz-podium-bar-1">1</div><div className="quiz-podium-score">{t[0]?.score}점</div></div>
          {t[2] && <div className="quiz-podium-slot"><div className="quiz-podium-name">{t[2].nickname}</div><div className="quiz-podium-bar quiz-podium-bar-3">3</div><div className="quiz-podium-score">{t[2].score}점</div></div>}
        </div>
      )}
      <div className="quiz-leaderboard-list">
        {players.map((p, i) => (
          <div key={p.id} className="quiz-leaderboard-row">
            <span className="quiz-leaderboard-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
            <span className="quiz-leaderboard-name">{p.nickname}</span>
            <span className="quiz-leaderboard-score">{p.score}점</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LLMModal({ settings, onSave, onClose }: { settings: LLMSettings; onSave: (s: LLMSettings) => void; onClose: () => void }) {
  const [provider, setProvider] = useState(settings.provider);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  return (<>
    <div className="modal-backdrop" onClick={onClose} />
    <div className="add-card-modal llm-settings-modal">
      <div className="modal-header"><h2 className="modal-title">LLM 설정</h2><button type="button" className="modal-close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <div className="llm-settings-field"><label className="llm-settings-label">AI 제공자</label>
          <select className="modal-select" value={provider} onChange={(e) => setProvider(e.target.value as LLMSettings["provider"])}>
            <option value="openai">OpenAI</option><option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div className="llm-settings-field"><label className="llm-settings-label">API Key</label>
          <input className="modal-input" type="password" placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn-cancel" onClick={onClose}>취소</button>
          <button type="button" className="modal-btn-submit" disabled={!apiKey.trim()} onClick={() => onSave({ provider, apiKey })}>저장</button>
        </div>
      </div>
    </div>
  </>);
}

function QuizUrl({ roomCode }: { roomCode: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/quiz/${roomCode}`);
  }, [roomCode]);
  return <span className="quiz-room-code-url">{url}</span>;
}
