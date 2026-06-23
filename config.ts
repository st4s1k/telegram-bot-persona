/* ================= DEMO PERSONA: config contribution ================= */
// The pack's contribution to /config: its own schema keys, help groups, presets, and defaults. The
// engine merges these with its own (CONFIG_SCHEMA / CONFIG_GROUPS / CONFIG_PRESETS = engine ∪ persona)
// and mixes defaults(env) into getGlobalConfig. This example shows all four ConfigMeta types.

import type { ConfigContribution } from "../registry";
import type { Env } from "../../types";

const num = (v: unknown, d: number): number => Number.isFinite(Number(v)) ? Number(v) : d;

export const demoConfig: ConfigContribution = {
  schema: {
    // bool switches
    "greet_back": { type: "bool", desc: "Greet back on hi/hello" },
    "yesno":      { type: "bool", desc: "Quip on a yes/no message" },
    "factoid":    { type: "bool", desc: "Occasionally drop a fun fact" },
    // float probabilities (0..1)
    "greet_prob":   { type: "float", desc: "Chance to greet back" },
    "factoid_prob": { type: "float", desc: "Chance to drop a fun fact" },
    // a bounded integer
    "dice_max":     { type: "int", desc: "Default upper bound for /dice", min: 2, max: 1000000 },
    // a free string (defaults at read-time in the handler — see note on `defaults` below)
    "joke_style":   { type: "string", desc: "Style passed to /joke (e.g. classic, pun, dad)", max: 30 },
  },
  // /config help groups, appended after the engine's. The label may be a locale key (resolved via t())
  // or, as here, a literal string (t() returns an unknown key unchanged).
  groups: {
    "⚡ Reactions": ["greet_back", "yesno", "factoid"],
    "🎲 Chances & limits": ["greet_prob", "factoid_prob", "dice_max"],
    "😄 Jokes": ["joke_style"],
  },
  // One-step bundles applied via `/config preset <name>`.
  presets: {
    "quiet": {
      desc: "calm assistant: no unprompted chatter, long-term memory on",
      config: { random: false, answer_prob: 0, greet_back: false, yesno: false, factoid: false, rag: true },
    },
    "lively": {
      desc: "playful: greets, quips and fun facts on",
      config: { random: true, answer_prob: 0.1, greet_back: true, yesno: true, factoid: true },
    },
  },
  presetAliases: { "calm": "quiet", "serious": "quiet", "fun": "lively", "default": "lively" },
  // Defaults for the keys above. NOTE: this returns boolean | number only — so a STRING key like
  // `joke_style` is not defaulted here; its handler falls back at read-time (`ctx.cfg.joke_style || "classic"`).
  // Persona env is read via a cast — the engine's Env type does not name these variables (forkability).
  defaults: (env: Env) => {
    const e = env as unknown as Record<string, string | undefined>;
    return {
      greet_back: true, yesno: true, factoid: true,
      greet_prob: num(e.DEMO_GREET_PROB, 0.5),
      factoid_prob: num(e.DEMO_FACTOID_PROB, 0.1),
      dice_max: num(e.DEMO_DICE_MAX, 100),
    };
  },
};
