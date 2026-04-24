// 평어 프롬프트 빌더 — 단원·평가항목 → 생기부 톤 한국어 한 문장.
// LLM streaming infra 와 분리된 단순 텍스트 생성용.

export type FeedbackPromptInput = {
  studentName: string;
  subject: string; // v1 'art'
  unit: string;
  criterion: string;
};

const SUBJECT_LABEL: Record<string, string> = {
  art: "미술",
};

export function buildFeedbackPrompt(input: FeedbackPromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const subjectKo = SUBJECT_LABEL[input.subject] ?? input.subject;

  const systemPrompt = `당신은 한국 초등학교 ${subjectKo} 교사가 학교생활기록부에 적을 평어를 작성하도록 돕는 보조입니다.

규칙:
- 한 학생의 한 단원·한 평가항목에 대한 짧은 한국어 평어 한 문장을 작성합니다.
- 분량은 60~100자 사이. 너무 길거나 짧지 않게.
- "~~함", "~~하는 모습이 보임" 처럼 학교생활기록부에 그대로 옮길 수 있는 격식체 / 종결형 사용.
- 학생 이름은 출력하지 마세요. (교사가 별도로 학생을 식별합니다)
- 칭찬/관찰 위주. 부정 표현·주관적 평가어("매우 잘함", "최고") 금지.
- 평가항목의 키워드를 자연스럽게 본문에 녹여내세요.
- 마크다운/번호/따옴표/이모지 없이 평문 한 문장만 출력.`;

  const userPrompt = `단원: ${input.unit}
평가항목: ${input.criterion}

위 단원의 평가항목에 대해 학생이 보인 학습 모습을 생기부 톤으로 한 문장 작성해주세요.`;

  return { systemPrompt, userPrompt };
}
