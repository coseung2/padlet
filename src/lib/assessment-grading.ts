import type {
  McqAnswerPayload,
  McqQuestionPayload,
} from "@/types/assessment";

/**
 * Deterministic MCQ grading — no LLM call. Returns the question's
 * maxScore when the student's selected set is exactly equal to the
 * teacher's correct set, otherwise 0. Order-insensitive.
 */
export function gradeMcq(
  question: { payload: McqQuestionPayload; maxScore: number },
  answer: McqAnswerPayload | null
): number {
  if (!answer) return 0;
  const correct = new Set(question.payload.correctChoiceIds);
  const selected = new Set(answer.selectedChoiceIds);
  if (correct.size !== selected.size) return 0;
  for (const id of correct) if (!selected.has(id)) return 0;
  return question.maxScore;
}

/** True when selected matches correct exactly. Cheap boolean helper
 *  for UI cell color decisions. */
export function isCorrectMcq(
  correctChoiceIds: string[],
  selectedChoiceIds: string[]
): boolean {
  if (correctChoiceIds.length !== selectedChoiceIds.length) return false;
  const correct = new Set(correctChoiceIds);
  for (const id of selectedChoiceIds) if (!correct.has(id)) return false;
  return true;
}
