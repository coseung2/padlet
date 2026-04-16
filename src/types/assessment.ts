// Client/server shared DTOs for the performance-assessment-autograde
// MVP-0 slice. Prisma rows are translated through these types so the
// correct-answer payload never leaks to a student viewer.

export type AssessmentChoice = { id: string; text: string };

export type McqQuestionPayload = {
  choices: AssessmentChoice[];
  correctChoiceIds: string[];
};

export type ShortQuestionPayload = {
  correctAnswers: string[]; // 공백 제거 + 소문자 정규화 후 비교 (복수 정답 허용)
};

export type McqAnswerPayload = {
  selectedChoiceIds: string[];
};

export type ShortAnswerPayload = {
  textAnswer: string;
};

export type AssessmentQuestionCreate =
  | {
      kind: "MCQ";
      prompt: string;
      choices: AssessmentChoice[];
      correctChoiceIds: string[];
      maxScore?: number;
    }
  | {
      kind: "SHORT";
      prompt: string;
      correctAnswers: string[];
      maxScore?: number;
    };

export type AssessmentTemplateCreate = {
  classroomId: string;
  title: string;
  durationMin: number;
  boardId?: string | null;
  questions: AssessmentQuestionCreate[];
};

export type TeacherQuestionDTO =
  | {
      id: string;
      order: number;
      kind: "MCQ";
      prompt: string;
      maxScore: number;
      choices: AssessmentChoice[];
      correctChoiceIds: string[];
    }
  | {
      id: string;
      order: number;
      kind: "SHORT";
      prompt: string;
      maxScore: number;
      correctAnswers: string[];
    };

export type StudentQuestionDTO =
  | {
      id: string;
      order: number;
      kind: "MCQ";
      prompt: string;
      maxScore: number;
      choices: AssessmentChoice[];
    }
  | {
      id: string;
      order: number;
      kind: "SHORT";
      prompt: string;
      maxScore: number;
    };

export type AssessmentTemplateTeacherDTO = {
  id: string;
  classroomId: string;
  boardId: string | null;
  title: string;
  durationMin: number;
  createdById: string;
  createdAt: string;
  questions: TeacherQuestionDTO[];
};

export type AssessmentTemplateStudentDTO = {
  id: string;
  classroomId: string;
  boardId: string | null;
  title: string;
  durationMin: number;
  questions: StudentQuestionDTO[];
};

export type AssessmentSubmissionDTO = {
  id: string;
  templateId: string;
  studentId: string;
  status: "in_progress" | "submitted";
  startedAt: string;
  endAt: string;
  submittedAt: string | null;
  answers: Array<{
    questionId: string;
    selectedChoiceIds: string[];
    autoScore: number | null;
  }>;
};

export type GradebookRow = {
  student: { id: string; name: string; number: number | null };
  submission: {
    id: string;
    status: "in_progress" | "submitted";
    startedAt: string;
    submittedAt: string | null;
  } | null;
  answers: Array<{
    questionId: string;
    selectedChoiceIds: string[]; // MCQ only — empty for SHORT
    textAnswer: string | null; // SHORT only
    correct: boolean | null;
    autoScore: number | null;
  }>;
  entry: {
    id: string;
    finalScore: number;
    releasedAt: string | null;
  } | null;
  totalAutoScore: number;
};

export type AssessmentGradebookPayload = {
  template: AssessmentTemplateTeacherDTO;
  rows: GradebookRow[];
  maxScoreTotal: number;
};

export type ResultQuestionMcq = {
  id: string;
  kind: "MCQ";
  prompt: string;
  choices: AssessmentChoice[];
  correctChoiceIds: string[];
  selectedChoiceIds: string[];
  correct: boolean;
};

export type ResultQuestionShort = {
  id: string;
  kind: "SHORT";
  prompt: string;
  correctAnswers: string[];
  textAnswer: string;
  correct: boolean;
};

export type AssessmentResultPayload =
  | { released: false }
  | {
      released: true;
      finalScore: number;
      maxScoreTotal: number;
      questions: Array<ResultQuestionMcq | ResultQuestionShort>;
    };
