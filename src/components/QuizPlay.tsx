"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Question = { id: string; text: string; options: string[]; timeLimit: number };
type QResult = { correct: boolean; correctIndex: number; points: number; rank: number; totalPlayers: number };
type Player = { id: string; nickname: string; score: number };
type GameState =
  | { phase: "join" }
  | { phase: "waiting"; playerCount: number }
  | { phase: "question"; question: Question; questionIndex: number; totalQuestions: number }
  | { phase: "answered" }
  | { phase: "result"; result: QResult }
  | { phase: "leaderboard"; players: Player[]; myScore: number; myRank: number };

const COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
const SHAPES = ["\u25B2", "\u25C6", "\u25CF", "\u25A0"];
const LABELS = ["A", "B", "C", "D"];

export function QuizPlay({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [nickname, setNickname] = useState("");
  const [playerId, setPid] = useState<string | null>(null);
  const [quizId, setQid] = useState<string | null>(null);
  const [state, setState] = useState<GameState>({ phase: "join" });
  const [myScore, setMyScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleEvent = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case "player_joined":
        setState((s) => s.phase === "waiting" || s.phase === "join" ? { phase: "waiting", playerCount: data.playerCount as number } : s);
        break;
      case "question_start":
        setSelected(null);
        setState({ phase: "question", question: data.question as Question, questionIndex: data.questionIndex as number, totalQuestions: data.totalQuestions as number });
        startTimer((data.question as Question).timeLimit);
        break;
      case "question_result":
        if (timerRef.current) clearInterval(timerRef.current);
        { const r = data as unknown as QResult & { type: string }; setMyScore((p) => p + (r.points ?? 0)); setState({ phase: "result", result: r }); }
        break;
      case "quiz_finished":
        if (timerRef.current) clearInterval(timerRef.current);
        { const ps = (data.players as Player[]) ?? []; const ri = ps.findIndex((p) => p.id === playerId) + 1;
          setState({ phase: "leaderboard", players: ps, myScore: ps.find((p) => p.id === playerId)?.score ?? myScore, myRank: ri || ps.length }); }
        break;
    }
  }, [playerId, myScore]);

  useEffect(() => {
    if (!quizId || !playerId) return;
    const es = new EventSource(`/api/quiz/${quizId}/stream?playerId=${playerId}`);
    es.onmessage = (e) => { try { handleEvent(JSON.parse(e.data)); } catch {} };
    es.onerror = () => es.close();
    return () => es.close();
  }, [quizId, playerId, handleEvent]);

  function startTimer(sec: number) {
    setTimeLeft(sec);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimeLeft((p) => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; }), 1000);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !nickname.trim()) return;
    setJoining(true); setError("");
    try {
      const res = await fetch("/api/quiz/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roomCode: code.trim().toUpperCase(), nickname: nickname.trim() }) });
      if (res.ok) { const d = await res.json(); setPid(d.playerId); setQid(d.quizId); setState({ phase: "waiting", playerCount: d.playerCount ?? 0 }); }
      else setError((await res.text()) || "입장에 실패했습니다.");
    } catch { setError("서버에 연결할 수 없습니다."); }
    finally { setJoining(false); }
  }

  async function handleAnswer(idx: number) {
    if (selected !== null || !quizId || !playerId) return;
    setSelected(idx); setState({ phase: "answered" });
    try { await fetch(`/api/quiz/${quizId}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ playerId, optionIndex: idx, timeLeft }) }); } catch {}
  }

  // ---- JOIN ----
  if (state.phase === "join") return (
    <div className="quiz-join">
      <h1 className="quiz-join-title">퀴즈 참가</h1>
      <form className="quiz-join-form" onSubmit={handleJoin}>
        <input className="quiz-join-input code-input" placeholder="참가 코드" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoFocus />
        <input className="quiz-join-input" placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
        {error && <div style={{ color: "#e21b3c", fontSize: 13, textAlign: "center" }}>{error}</div>}
        <button type="submit" className="quiz-join-btn" disabled={joining || !code.trim() || !nickname.trim()}>{joining ? "입장 중..." : "입장"}</button>
      </form>
    </div>
  );

  // ---- WAITING ----
  if (state.phase === "waiting") return (
    <div className="quiz-play"><div className="quiz-waiting">
      <div className="quiz-waiting-icon">⏳</div>
      <div className="quiz-waiting-text">선생님이 시작할 때까지 기다려주세요</div>
      <div className="quiz-waiting-sub">현재 {state.playerCount}명 참가 중</div>
    </div></div>
  );

  // ---- QUESTION ----
  if (state.phase === "question") {
    const { question: q, questionIndex: qi, totalQuestions: tq } = state;
    return (
      <div className="quiz-play">
        <div className="quiz-play-header"><span className="quiz-play-nickname">{nickname}</span><span className="quiz-play-score">{myScore}점</span></div>
        <div className="quiz-timer-bar"><div className={`quiz-timer-fill ${timeLeft <= 5 ? "danger" : timeLeft <= 10 ? "warning" : ""}`} style={{ "--timer-duration": `${q.timeLimit}s` } as React.CSSProperties} /></div>
        <div className="quiz-timer-text">{timeLeft}초</div>
        <div className="quiz-question">
          <div className="quiz-question-number">문제 {qi + 1} / {tq}</div>
          <div className="quiz-question-text">{q.text}</div>
        </div>
        <div className="quiz-options">
          {q.options.map((opt, i) => (
            <button key={i} type="button" className={`quiz-option-btn quiz-option-${["a","b","c","d"][i]}`} onClick={() => handleAnswer(i)} disabled={timeLeft === 0}>
              <span className="quiz-option-shape">{SHAPES[i]}</span>{opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- ANSWERED ----
  if (state.phase === "answered") return (
    <div className="quiz-play"><div className="quiz-waiting">
      <div className="quiz-waiting-icon">🤔</div>
      <div className="quiz-waiting-text">정답 기다리는 중...</div>
      {selected !== null && <div className="quiz-waiting-sub">선택: {SHAPES[selected]} {LABELS[selected]}</div>}
    </div></div>
  );

  // ---- RESULT ----
  if (state.phase === "result") {
    const { result: r } = state;
    return (
      <div className="quiz-play"><div className="quiz-result">
        <div className="quiz-result-icon">{r.correct ? "🎉" : "😢"}</div>
        <div className={`quiz-result-text ${r.correct ? "quiz-result-correct" : "quiz-result-wrong"}`}>{r.correct ? "정답!" : "오답"}</div>
        <div className="quiz-result-points">+{r.points}점</div>
        <div className="quiz-result-rank">현재 {r.rank}위 / {r.totalPlayers}명</div>
      </div></div>
    );
  }

  // ---- LEADERBOARD ----
  if (state.phase === "leaderboard") {
    const { players: ps, myRank } = state;
    const t3 = ps.slice(0, 3);
    return (
      <div className="quiz-play"><div className="quiz-leaderboard">
        <div className="quiz-leaderboard-title">최종 순위</div>
        {t3.length >= 2 && (
          <div className="quiz-podium">
            <div className="quiz-podium-slot"><div className="quiz-podium-name">{t3[1]?.nickname}</div><div className="quiz-podium-bar quiz-podium-bar-2">2</div><div className="quiz-podium-score">{t3[1]?.score}점</div></div>
            <div className="quiz-podium-slot"><div className="quiz-podium-name">{t3[0]?.nickname}</div><div className="quiz-podium-bar quiz-podium-bar-1">1</div><div className="quiz-podium-score">{t3[0]?.score}점</div></div>
            {t3[2] && <div className="quiz-podium-slot"><div className="quiz-podium-name">{t3[2].nickname}</div><div className="quiz-podium-bar quiz-podium-bar-3">3</div><div className="quiz-podium-score">{t3[2].score}점</div></div>}
          </div>
        )}
        <div className="quiz-leaderboard-list">
          {ps.map((p, i) => (
            <div key={p.id} className="quiz-leaderboard-row" style={p.id === playerId ? { outline: "2px solid var(--color-accent)" } : undefined}>
              <span className="quiz-leaderboard-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
              <span className="quiz-leaderboard-name">{p.nickname}</span>
              <span className="quiz-leaderboard-score">{p.score}점</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, color: "var(--color-text-muted)", fontSize: 14 }}>당신의 순위: {myRank}위</div>
      </div></div>
    );
  }

  return null;
}
