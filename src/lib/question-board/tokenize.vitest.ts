import { describe, expect, it } from "vitest";
import { frequencyCounts, tokenize } from "./tokenize";

describe("tokenize", () => {
  it("splits on whitespace and punctuation", () => {
    expect(tokenize("안녕, 반가워! 오늘도")).toEqual([
      "안녕",
      "반가워",
      "오늘",
    ]);
  });

  it("drops single-char tokens but keeps 2+ char tokens", () => {
    // 한국어 2자 단어 다수 유의미 (책·감사·문제 등) → 1자만 제외
    expect(tokenize("가 나 다 test ab")).toEqual(["test", "ab"]);
  });

  it("strips common korean single-char particles at end", () => {
    expect(tokenize("감사를 감사가 감사는 감사")).toEqual([
      "감사",
      "감사",
      "감사",
      "감사",
    ]);
  });

  it("lowercases english tokens", () => {
    expect(tokenize("Hello WORLD world")).toEqual(["hello", "world", "world"]);
  });

  it("returns empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("frequencyCounts", () => {
  it("aggregates counts across multiple texts", () => {
    const result = frequencyCounts([
      "사과 바나나 사과",
      "사과 포도",
      "바나나",
    ]);
    expect(result).toEqual([
      { word: "사과", count: 3 },
      { word: "바나나", count: 2 },
      { word: "포도", count: 1 },
    ]);
  });

  it("handles empty array", () => {
    expect(frequencyCounts([])).toEqual([]);
  });

  it("sorts by count descending", () => {
    const result = frequencyCounts(["가나 나다 다라", "나다 다라", "다라"]);
    expect(result[0].word).toBe("다라");
    expect(result[0].count).toBe(3);
    expect(result[1].word).toBe("나다");
    expect(result[2].word).toBe("가나");
  });
});
