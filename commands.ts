/* ================= DEMO PERSONA: commands ================= */
// RegisteredCommand[] added on top of the engine's core commands. The engine merges them into the
// COMMANDS map, the command regexes, and the TECH/LLM sets. Each object is self-describing:
//   type        — internal key (also the COMMANDS map key)
//   defaultCmd  — the actual slash command (fixed; there is no env-based renaming)
//   handler     — async (ctx, mode) => string | null   (null/"" → stay silent)
//   llm         — true → show a "typing…" indicator; the reply IS stored in history
//   skipHistory — true → the reply is "technical" and is NOT stored in history (status/util replies)
//   state       — this command's slice of the persona-state schema (see state.ts)
//   remoteAdmin — (optional) allow it to be run against another chat via `/admin chat_cmd`
// mode.argText is the text after the command word.

import type { RegisteredCommand } from "../registry";
import { t } from "../../i18n";
import { getUserName } from "../../utils";
import { updatePersonaState } from "../../storage";
import { runLLMWithHistory } from "../../llm";
import { buildJokePrompt } from "./prompts";
import { demoStateSchema, energyLevel } from "./state";

export const demoCommands: RegisteredCommand[] = [
  // 1) A plain, non-LLM utility command. `skipHistory` keeps its reply out of history.
  {
    type: "dice", defaultCmd: "/dice", skipHistory: true,
    handler: async (ctx, mode) => {
      const nums = (mode.argText || "").split(/\s+/).map(Number).filter(Number.isFinite);
      const dflt = Number(ctx.cfg.dice_max) || 100; // an int /config key — see config.ts
      let [min, max] = [1, dflt];
      if (nums.length === 1) max = nums[0];
      else if (nums.length >= 2) [min, max] = nums;
      if (min > max) [min, max] = [max, min];
      const roll = Math.floor(Math.random() * (max - min + 1)) + min;
      return t(ctx.cfg.lang, "demo_roll", getUserName(ctx.msg), roll, min, max);
    },
  },

  // 2) A command that OWNS per-chat state. It declares a `state` slice; the engine merges it into
  //    `personaState` and applies the default. Read with energyLevel(ctx), write with updatePersonaState.
  {
    type: "energy", defaultCmd: "/energy", skipHistory: true,
    state: demoStateSchema,
    handler: async (ctx, mode) => {
      const arg = (mode.argText || "").trim();
      if (!arg) return t(ctx.cfg.lang, "demo_energy_show", energyLevel(ctx));
      const n = parseInt(arg, 10);
      if (!Number.isFinite(n) || n < 0 || n > 5) return t(ctx.cfg.lang, "demo_energy_err");
      updatePersonaState(ctx, { energy: n }); // shallow-merges into chatData.personaState, sets _dirty
      return t(ctx.cfg.lang, "demo_energy_set", n);
    },
  },

  // 3) An LLM-backed command. `llm: true` → the engine shows a "typing…" indicator and stores the reply.
  //    The handler builds a system prompt (prompts.ts) and calls runLLMWithHistory.
  {
    type: "joke", defaultCmd: "/joke", llm: true,
    handler: async (ctx, mode) => {
      const topic = (mode.argText || "").trim(); // tip: getReplySource(ctx) from ../../vision can seed from a replied-to message
      const style = String(ctx.cfg.joke_style || "classic"); // a string /config key — see config.ts
      return runLLMWithHistory(
        ctx.cfg,
        buildJokePrompt(topic, style, ctx),
        ctx.chatData.history,
        topic ? `Joke about: ${topic}` : "Tell me a joke.",
        ctx.msg,
        { forceAppendUser: true, ctx },
      );
    },
  },
];
