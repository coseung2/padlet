// 평어 프롬프트 빌더 — 단원·평가항목 → 생기부 톤 한국어 한 문장.
// LLM streaming infra 와 분리된 단순 텍스트 생성용.

export type FeedbackPromptInput = {
  studentName: string;
  subject: string; // v1 'art'
  /** 비어있으면 "학기 전반" 톤으로 fallback. */
  unit?: string;
  /** 비어있으면 "전반적 학습 태도" 톤으로 fallback. */
  criterion?: string;
  /** 학생 작품 이미지가 비전 입력으로 함께 들어갈 예정이면 true.
   *  프롬프트 본문에 "이미지를 관찰해 ..." 안내가 추가된다. */
  hasImage?: boolean;
};

const SUBJECT_LABEL: Record<string, string> = {
  art: "미술",
};

export function buildFeedbackPrompt(input: FeedbackPromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const subjectKo = SUBJECT_LABEL[input.subject] ?? input.subject;
  const unit = (input.unit ?? "").trim();
  const criterion = (input.criterion ?? "").trim();

  const systemPrompt = `당신은 한국 초등학교 ${subjectKo} 교사가 학교생활기록부에 적을 평어를 작성하도록 돕는 보조입니다.

규칙:
- 학생 한 명에 대한 짧은 한국어 평어 한 문장을 작성합니다.
- 분량은 60~100자 사이. 너무 길거나 짧지 않게.
- "~~함", "~~하는 모습이 보임" 처럼 학교생활기록부에 그대로 옮길 수 있는 격식체 / 종결형 사용.
- 학생 이름은 출력하지 마세요. (교사가 별도로 학생을 식별합니다)
- 칭찬/관찰 위주. 부정 표현·주관적 평가어("매우 잘함", "최고") 금지.
- 입력된 단원·평가항목 키워드를 자연스럽게 본문에 녹여내세요. 둘 다 비어있으면 ${subjectKo} 학기 전반의 학습 태도를 일반적으로 서술합니다.
- 일괄 생성 시 학생마다 비슷한 표현을 피하고 자연스러운 변주를 줍니다.${
    input.hasImage
      ? `
- 첨부된 학생 작품 이미지를 직접 관찰해 색채·구도·기법·표현 같이 눈에 띄는 시각적 특징을 평어에 녹여 학생마다 다르게 작성하세요. 이미지에 보이지 않는 내용은 추측하지 마세요.`
      : ""
  }
- 마크다운/번호/따옴표/이모지 없이 평문 한 문장만 출력.`;

  const lines: string[] = [];
  if (unit) lines.push(`단원: ${unit}`);
  if (criterion) lines.push(`평가항목: ${criterion}`);
  if (lines.length === 0) {
    lines.push(`(특정 단원/평가항목 없음 — ${subjectKo} 학기 전반에 대해 작성)`);
  }
  lines.push("");
  lines.push(
    unit || criterion
      ? "위 단원의 평가항목에 대해 학생이 보인 학습 모습을 생기부 톤으로 한 문장 작성해주세요."
      : `${subjectKo} 학기 전반의 학습 태도와 활동 모습을 생기부 톤으로 한 문장 작성해주세요.`
  );

  return { systemPrompt, userPrompt: lines.join("\n") };
}
