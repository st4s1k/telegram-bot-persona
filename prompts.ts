/* ================= DEMO PERSONA: command prompt builders ================= */
// Prompt builders for the pack's LLM commands/throws. They layer engine instruction lines on top of the
// engine's assemblePrompt, which appends the persona voice (or the chat's /rp role), any recalled RAG
// memories, and the demoPromptLines hook. Instruction text is localized via t() from i18n/<lang>.json.

import { assemblePrompt } from "../../prompts";
import { t } from "../../i18n";
import type { Ctx } from "../../types";

export function buildJokePrompt(topic: string, style: string, ctx: Ctx): string {
  const lang = ctx.cfg.lang;
  // The topic line is conditional (with/without a topic), so resolve it first, then fold it + the style
  // into the instruction block — demo_joke_prompt: {0} = the topic line, {1} = the style.
  const topicLine = topic ? t(lang, "demo_joke_topic", topic) : t(lang, "demo_joke_topic_any");
  return assemblePrompt([t(lang, "demo_joke_prompt", topicLine, style)], ctx);
}
