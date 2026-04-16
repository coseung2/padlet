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

export type ManualAnswerPayload = {
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
    }
  | {
      kind: "MANUAL";
      prompt: string;
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
    }
  | {
      id: string;
      order: number;
      kind: "MANUAL";
      prompt: string;
      maxScore: number;
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
    }
  | {
      id: string;
      order: number;
      kind: "MANUAL";
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
    kind: "MCQ" | "SHORT" | "MANUAL";
    selectedChoiceIds: string[]; // MCQ only
    textAnswer: string | null; // SHORT or MANUAL
    correct: boolean | null; // null for MANUAL pending, bool for scored
    autoScore: number | null;
    manualScore: number | null;
    needsManual: boolean; // true when kind=MANUAL and manualScore is null
  }>;
  pendingManualCount: number;
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

export type ResultQuestionManual = {
  id: string;
  kind: "MANUAL";
  prompt: string;
  textAnswer: string;
  manualScore: number; // 0 or maxScore, teacher-assigned
  maxScore: number;
  correct: boolean; // manualScore === maxScore
};

export type AssessmentResultPayload =
  | { released: false }
  | {
      released: true;
      finalScore: number;
      maxScoreTotal: number;
      questions: Array<
        ResultQuestionMcq | ResultQuestionShort | ResultQuestionManual
      >;
    };

// Manual grading queue — /templates/[id]/manual-queue response
export type ManualQueueItem = {
  questionId: string;
  questionOrder: number;
  questionMaxScore: number;
  entries: Array<{
    submissionId: string;
    studentId: string;
    studentNumber: number | null;
    studentName: string;
    textAnswer: string;
    manualScore: number | null; // null = pending
  }>;
};

export type ManualQueuePayload = {
  items: ManualQueueItem[];
};
