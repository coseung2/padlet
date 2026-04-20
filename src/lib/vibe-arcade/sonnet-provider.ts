// Vibe-arcade Anthropic Sonnet provider (Seed 12·13, AC-F8 / AC-G4).
// 서버 프록시 전용. 교사 계정 API Key는 DB 암호화(CanvaConnectAccount 스타일) 가정.
// 본 phase에서는 provider 인터페이스 + 스트리밍 루프만 구현 — 암호화 저장소는 후속 작업.
//
// 환경 변수:
//   SONNET_API_KEY_ENC_KEY    — 교사 API Key 복호화 마스터 키(향후)
//   SONNET_MODEL_ID           — 기본 "claude-sonnet-4-6" (Haiku 다운그레이드 금지)
//
// Anthropic SDK v6+ (@anthropic-ai/sdk) 가정. 실제 의존성 추가는 phase10 deployer.

import { incrementLedger } from "./quota-ledger";
import type { VibeTag } from "./types";

export type SonnetStreamArgs = {
  apiKey: string;
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  studentId: string;
  classroomId: string;
  perStudentDailyTokenCap: number | null;
  classroomDailyTokenPool: number;
  onDelta: (delta: string) => void;
  onTokensUpdate: (tokensIn: number, tokensOut: number) => void;
  onRefusal: () => void;
};

export type SonnetStreamResult = {
  stopReason: "end_turn" | "max_tokens" | "refusal" | "quota_exhausted" | "error";
  finalContent: string;
  tokensIn: number;
  tokensOut: number;
};

export const DEFAULT_SONNET_MODEL =
  process.env.SONNET_MODEL_ID ?? "claude-sonnet-4-6";

export const DEFAULT_SYSTEM_PROMPT = `당신은 한국 초중등 학생의 바이브 코딩 보조교사입니다.
학생의 요청을 브라우저에서 즉시 실행 가능한 단일 HTML 문서(외부 CDN은 jsdelivr/cdnjs/unpkg만 허용)로 작성해 주세요.
반드시 최종 결과물은 \`\`\`html 블록으로 감싸 출력합니다.
부적절한 주제(폭력·성인·개인정보·상용 게임 복제 등)는 정중히 거절합니다.`;

/**
 * Runs a streaming completion against Anthropic's messages API.
 *
 * Minimal implementation — defers final Anthropic SDK wiring to phase7 follow-up.
 * This function is the single integration point the route handler calls.
 *
 * Consumers MUST:
 *  - Call `checkQuotaOrReject` BEFORE invoking this function.
 *  - Persist `messages` + `VibeSession.tokensIn/Out` on each `onTokensUpdate`.
 *  - Treat `stopReason === "refusal"` as increment-only (do NOT save artifact).
 */
export async function streamSonnet(args: SonnetStreamArgs): Promise<SonnetStreamResult> {
  // Dynamic import so the SDK is opt-in (tests stub the import).
  const { default: Anthropic } = await import("@anthropic-ai/sdk").catch(() => ({
    default: null as unknown as new (opts: { apiKey: string }) => unknown,
  }));

  if (!Anthropic) {
    throw new Error(
      "@anthropic-ai/sdk is not installed. Run `npm install @anthropic-ai/sdk@^0.30.0` before using vibe-arcade.",
    );
  }

  const client = new (Anthropic as unknown as new (opts: { apiKey: string }) => {
    messages: {
      stream: (opts: unknown) => AsyncIterable<unknown> & {
        finalMessage: () => Promise<{
          content: Array<{ type: string; text?: string }>;
          stop_reason: string;
          usage?: { input_tokens?: number; output_tokens?: number };
        }>;
      };
    };
  })({ apiKey: args.apiKey });

  let tokensIn = 0;
  let tokensOut = 0;
  let finalContent = "";

  try {
    const stream = client.messages.stream({
      model: DEFAULT_SONNET_MODEL,
      max_tokens: 4096,
      system: args.systemPrompt,
      messages: args.messages,
    });

    for await (const event of stream) {
      const ev = event as { type?: string; delta?: { text?: string }; usage?: { input_tokens?: number; output_tokens?: number } };
      if (ev.type === "content_block_delta" && ev.delta?.text) {
        args.onDelta(ev.delta.text);
        finalContent += ev.delta.text;
      } else if (ev.type === "message_delta" && ev.usage) {
        tokensIn = ev.usage.input_tokens ?? tokensIn;
        tokensOut = ev.usage.output_tokens ?? tokensOut;
        args.onTokensUpdate(tokensIn, tokensOut);
      }
    }

    const final = await stream.finalMessage();
    tokensIn = final.usage?.input_tokens ?? tokensIn;
    tokensOut = final.usage?.output_tokens ?? tokensOut;

    if (final.stop_reason === "refusal") {
      args.onRefusal();
      return { stopReason: "refusal", finalContent, tokensIn, tokensOut };
    }

    // Persist quota increment after each successful call.
    await incrementLedger({
      classroomId: args.classroomId,
      studentId: args.studentId,
      tokensIn,
      tokensOut,
      newSession: true,
    });

    return {
      stopReason: final.stop_reason === "max_tokens" ? "max_tokens" : "end_turn",
      finalContent,
      tokensIn,
      tokensOut,
    };
  } catch (err) {
    return {
      stopReason: "error",
      finalContent,
      tokensIn,
      tokensOut,
    };
  }
}

/**
 * Extract the first ```html fenced block from the assistant content.
 * Returns null if no block is found.
 */
export function extractHtmlBlock(content: string): string | null {
  const m = content.match(/```html\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

/** Suggested starter prompts (shown in Studio S3 initial state). */
export const STARTER_PROMPTS: Record<VibeTag, string[]> = {
  게임: ["틱택토 게임 만들어줘", "2048 게임 만들어줘", "스네이크 게임 만들어줘"],
  퀴즈: ["나라 이름 맞추기 퀴즈 만들어줘", "오지선다 수학 퀴즈 만들어줘"],
  시뮬: ["랜덤 별자리 보여주는 페이지 만들어줘"],
  아트: ["컬러 팔레트로 그림판 만들어줘"],
  기타: ["타이머 만들어줘"],
};
