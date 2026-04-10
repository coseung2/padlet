type QuizQuestionData = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string; // "A" | "B" | "C" | "D"
};

export async function generateQuizFromText(
  text: string,
  apiKey: string,
  numQuestions: number = 5,
  provider: "openai" | "anthropic" = "openai"
): Promise<QuizQuestionData[]> {
  const systemPrompt = `주어진 텍스트를 바탕으로 ${numQuestions}개의 4지선다 퀴즈 문제를 만들어주세요.
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요:
[{"question":"문제","optionA":"보기A","optionB":"보기B","optionC":"보기C","optionD":"보기D","answer":"A"}]
answer는 반드시 A, B, C, D 중 하나여야 합니다.
문제는 한국어로 작성하세요.`;

  const userMessage = `다음 텍스트를 바탕으로 퀴즈를 생성하세요:\n\n${text.slice(0, 8000)}`;

  let responseText: string;

  if (provider === "anthropic") {
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

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON array");
  }

  const questions: QuizQuestionData[] = JSON.parse(jsonMatch[0]);

  // Validate
  for (const q of questions) {
    if (!q.question || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
      throw new Error("Invalid question format from LLM");
    }
    if (!["A", "B", "C", "D"].includes(q.answer)) {
      q.answer = "A"; // fallback
    }
  }

  return questions;
}
