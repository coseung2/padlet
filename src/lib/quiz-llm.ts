import type { QuizDifficulty, QuizDraftQuestion } from "@/types/quiz";

export type QuizCountSpec = { mode: "auto" } | { mode: "fixed"; n: number };

const DIFFICULTY_LABEL: Record<QuizDifficulty, string> = {
  easy: "쉬움 (초등 저학년 수준의 기본 사실 확인)",
  medium: "중간 (개념 이해와 간단한 추론)",
  hard: "어려움 (응용·종합 판단)",
};

export async function generateQuizFromText(
  text: string,
  apiKey: string,
  countSpec: QuizCountSpec,
  provider: "openai" | "anthropic" | "gemini" = "openai",
  difficulty: QuizDifficulty = "medium"
): Promise<QuizDraftQuestion[]> {
  const countInstruction =
    countSpec.mode === "fixed"
      ? `정확히 ${countSpec.n}개의 4지선다 문항을 만들어주세요.`
      : `본문 길이와 내용에 맞는 적절한 수의 4지선다 문항을 만들어주세요. 최대 20개를 넘지 않도록 하고, 본문이 매우 짧으면 3~5개도 허용합니다.`;

  const systemPrompt = `난이도: ${DIFFICULTY_LABEL[difficulty]}
${countInstruction}
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
[{"question":"문제","optionA":"보기A","optionB":"보기B","optionC":"보기C","optionD":"보기D","answer":"A"}]
answer는 반드시 A, B, C, D 중 하나여야 합니다.
문제는 한국어로 작성하세요.`;

  const userMessage = `다음 텍스트를 바탕으로 퀴즈를 생성하세요:\n\n${text.slice(0, 8000)}`;

  let responseText: string;

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userMessage }] }],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${err}`);
    }
    const data = await res.json();
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await res.json();
    responseText = data.content?.[0]?.text ?? "";
  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const data = await res.json();
    responseText = data.choices?.[0]?.message?.content ?? "";
  }

  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON array");
  }

  const questions: QuizDraftQuestion[] = JSON.parse(jsonMatch[0]);

  for (const q of questions) {
    if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      throw new Error("Invalid question format from LLM");
    }
    if (!["A", "B", "C", "D"].includes(q.answer)) {
      q.answer = "A"; // fallback
    }
  }

  // 20 cap applied for both modes.
  const capped = questions.slice(0, 20);
  if (countSpec.mode === "fixed") {
    return capped.slice(0, countSpec.n);
  }
  return capped;
}
