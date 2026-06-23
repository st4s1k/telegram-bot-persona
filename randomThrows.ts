/* ================= DEMO PERSONA: random throws ================= */
// Occasionally, instead of a normal reply, the bot volunteers some content. The engine weights every
// throw by cfg[cfgFlag] × cfg[probKey] (pickRandomRandomKind) and calls the chosen handler. Order in the
// array is the bucket order for the weighted pick.

import type { RandomThrowKind } from "../registry";
import { assemblePrompt } from "../../prompts";
import { runLLMWithHistory } from "../../llm";

export const demoThrows: RandomThrowKind[] = [
  {
    name: "factoid", cfgFlag: "factoid", probKey: "factoid_prob",
    handler: (ctx) => runLLMWithHistory(
      ctx.cfg,
      assemblePrompt(["Share ONE short, surprising, true fun fact — just the fact, one sentence."], ctx),
      ctx.chatData.history, ctx.textRaw, ctx.msg, { ctx },
    ),
  },
];
