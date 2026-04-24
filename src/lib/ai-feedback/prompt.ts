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

[이미지 관찰 — 매우 중요]
첨부된 한 장은 학생의 ${subjectKo} 작품을 촬영한 사진입니다. 사진에 신문지·책상·바닥·다리 같은 배경이 함께 찍혀 있어도 무시하고, **종이/도화지 영역 안의 작품만** 관찰하세요.

작품에서 관찰해야 할 것 (이걸 평어 본문에 녹입니다):
1) 사용된 색의 종류와 명도·채도 변화 (예: 진한 코발트 블루 + 자홍색 대비, 옅은 하늘색의 그라데이션)
2) 화면 구성·구도 (예: 화면을 가득 채운 클로즈업 구성, 위·아래로 분할된 구성, 비대칭 배치)
3) ${subjectKo === "미술" ? "오일파스텔/색연필/물감 등 재료의 질감과 칠하는 방식 (문지름, 겹쳐 칠하기, 짧은 선의 반복, 강한 필압 등)" : "표현 기법"}
4) 학생만의 표현 시도·노력의 흔적 (대담한 색 선택, 세부 묘사, 면 구성의 과감함 등)

엄격 금지:
- 그림 속 형태가 무엇인지(해파리·꽃·산·자동차 등) **추측·명명 금지**. 학생이 "무엇을 그렸는지" 단정해서 쓰지 마세요. 추상적이거나 모호하면 그냥 "유기적인 형상", "큰 면", "주된 모티프" 같이 형식적으로만 지칭합니다.
- 이미지에 보이지 않는 내용 추정 금지.
- 사진 배경(신문지·바닥·물체) 언급 금지.`
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
