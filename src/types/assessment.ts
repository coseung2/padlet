// Client/server shared DTOs for the performance-assessment-autograde
// MVP-0 slice. Prisma rows are translated through these types so the
// correct-answer payload never leaks to a student viewer.

export type AssessmentChoice = { id: string; text: string };

export type McqQuestionPayload = {
  choices: AssessmentChoice[];
  correctChoiceIds: string[];
};

export type McqAnswerPayload = {
  selectedChoiceIds: string[];
};

export type AssessmentQuestionCreate = {
  prompt: string;
  choices: AssessmentChoice[];
  correctChoiceIds: string[];
  maxScore?: number;
};

export type AssessmentTemplateCreate = {
  classroomId: string;
  title: string;
  durationMin: number;
  boardId?: string | null;
  questions: AssessmentQuestionCreate[];
};

export type TeacherQuestionDTO = {
  id: string;
  order: number;
  kind: "MCQ";
  prompt: string;
  maxScore: number;
  choices: AssessmentChoice[];
  correctChoiceIds: string[];
};

export type StudentQuestionDTO = {
  id: string;
  order: number;
  kind: "MCQ";
  prompt: string;
  maxScore: number;
  choices: AssessmentChoice[];
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
    selectedChoiceIds: string[];
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

export type AssessmentResultPayload =
  | { released: false }
  | {
      released: true;
      finalScore: number;
      maxScoreTotal: number;
      questions: Array<{
        id: string;
        prompt: string;
        choices: AssessmentChoice[];
        correctChoiceIds: string[];
        selectedChoiceIds: string[];
        correct: boolean;
      }>;
    };
