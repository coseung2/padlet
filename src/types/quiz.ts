export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizDraftQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string; // "A" | "B" | "C" | "D"
};

export type QuizDraft = {
  questions: QuizDraftQuestion[];
};

export type QuizReportPayload = {
  summary: {
    submittedCount: number;
    avgCorrectRate: number; // 0~1
    avgTimeMs: number;
  };
  questions: Array<{ id: string; order: number; question: string; answer: string }>;
  players: Array<{
    playerId: string;
    studentId: string | null;
    name: string;
    answers: Array<{
      questionId: string;
      selected: string | null;
      correct: boolean | null;
      timeMs: number | null;
    }>;
    score: number;
    totalCorrect: number;
  }>;
};

export type QuizLibraryItem = {
  id: string;
  title: string;
  createdAt: string; // ISO
  difficulty: QuizDifficulty | null;
  boardId: string;
  questionCount: number;
};
