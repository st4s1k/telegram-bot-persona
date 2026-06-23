/* ================= DEMO PERSONA: command prompt builders ================= */
// Prompt builders for the pack's LLM commands/throws. They layer engine instruction lines on top of the
// engine's assemblePrompt, which appends the persona voice (or the chat's /rp role), any recalled RAG
// memories, and the demoPromptLines hook. The engine imports these one-directionally (never the reverse).

import { assemblePrompt } from "../../prompts";
import type { Ctx } from "../../types";

export function buildJokePrompt(topic: string, style: string, ctx: Ctx): string {
  const lines = [
    "Tell ONE short, original, family-friendly joke.",
    topic ? `The joke should be about: "${topic}".` : "Pick any wholesome everyday topic.",
    `Style: ${style}.`,
    "Reply with just the joke — no preamble, no explanation.",
  ];
  return assemblePrompt(lines, ctx);
}
