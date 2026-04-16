import { describe, it, expect } from "vitest";
import { gradeMcq, isCorrectMcq } from "../assessment-grading";

const q = (correct: string[], max = 1) => ({
  maxScore: max,
  payload: {
    choices: [
      { id: "A", text: "a" },
      { id: "B", text: "b" },
      { id: "C", text: "c" },
      { id: "D", text: "d" },
    ],
    correctChoiceIds: correct,
  },
});

describe("gradeMcq", () => {
  it("awards maxScore when sets match exactly (single-choice)", () => {
    expect(gradeMcq(q(["B"]), { selectedChoiceIds: ["B"] })).toBe(1);
  });

  it("awards maxScore when sets match in any order (multi-choice)", () => {
    expect(
      gradeMcq(q(["A", "C"], 2), { selectedChoiceIds: ["C", "A"] })
    ).toBe(2);
  });

  it("returns 0 when selection is a strict subset", () => {
    expect(gradeMcq(q(["A", "B"], 2), { selectedChoiceIds: ["A"] })).toBe(0);
  });

  it("returns 0 when selection has an extra choice", () => {
    expect(
      gradeMcq(q(["A"]), { selectedChoiceIds: ["A", "B"] })
    ).toBe(0);
  });

  it("returns 0 when answer is null (no submission)", () => {
    expect(gradeMcq(q(["A"]), null)).toBe(0);
  });

  it("returns 0 for completely wrong answer", () => {
    expect(gradeMcq(q(["A"]), { selectedChoiceIds: ["D"] })).toBe(0);
  });
});

describe("isCorrectMcq", () => {
  it("matches set equality", () => {
    expect(isCorrectMcq(["A", "C"], ["C", "A"])).toBe(true);
    expect(isCorrectMcq(["A"], ["B"])).toBe(false);
    expect(isCorrectMcq([], [])).toBe(true);
  });
});
