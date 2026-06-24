/* ================= DEMO PERSONA: random throws ================= */
// Occasionally, instead of a normal reply, the bot volunteers some content. The engine weights every
// throw by cfg[cfgFlag] × cfg[probKey] (pickRandomRandomKind) and calls the chosen handler. Order in the
// array is the bucket order for the weighted pick. The instruction text is localized via t().

import type { RandomThrowKind } from "../registry";
import { assemblePrompt } from "../../prompts";
import { t } from "../../i18n";
import { runLLMWithHistory } from "../../llm";

export const demoThrows: RandomThrowKind[] = [
  {
    name: "factoid", cfgFlag: "factoid", probKey: "factoid_prob",
    handler: (ctx) => runLLMWithHistory(
      ctx.cfg,
      assemblePrompt([t(ctx.cfg.lang, "demo_factoid_prompt")], ctx),
      ctx.chatData.history, ctx.textRaw, ctx.msg, { ctx },
    ),
  },
];
