/* ================= DEMO PERSONA: config contribution ================= */
// The pack's contribution to /config: its own schema keys, help groups, presets, and defaults. The
// engine merges these with its own (CONFIG_SCHEMA / CONFIG_GROUPS / CONFIG_PRESETS = engine ∪ persona)
// and mixes defaults(env) into getGlobalConfig. This example shows all four ConfigMeta types AND full
// localization: descriptions / group titles / preset descriptions are LOCALE KEYS, resolved by the
// engine via t(); their translations live in the pack's i18n/<lang>.json (discovered + merged into the
// engine i18n by the generate step). (A desc may also be a literal string — t() returns an unknown key
// as-is — but keys make the /config panel localizable, which is the point of this example.)

import type { ConfigContribution } from "../registry";
import type { Env } from "../../types";

const num = (v: unknown, d: number): number => Number.isFinite(Number(v)) ? Number(v) : d;

export const demoConfig: ConfigContribution = {
  schema: {
    // bool switches
    "greet_back": { type: "bool", desc: "demo_cfg_greet_back" },
    "yesno":      { type: "bool", desc: "demo_cfg_yesno" },
    "factoid":    { type: "bool", desc: "demo_cfg_factoid" },
    // float probabilities (0..1)
    "greet_prob":   { type: "float", desc: "demo_cfg_greet_prob" },
    "factoid_prob": { type: "float", desc: "demo_cfg_factoid_prob" },
    // a bounded integer
    "dice_max":     { type: "int", desc: "demo_cfg_dice_max", min: 2, max: 1000000 },
    // a free string (defaults at read-time in the handler — see note on `defaults` below)
    "joke_style":   { type: "string", desc: "demo_cfg_joke_style", max: 30 },
  },
  // /config help groups, appended after the engine's. Titles are locale keys.
  groups: {
    "demo_grp_reactions": ["greet_back", "yesno", "factoid"],
    "demo_grp_limits": ["greet_prob", "factoid_prob", "dice_max"],
    "demo_grp_jokes": ["joke_style"],
  },
  // One-step bundles applied via `/config preset <name>`. Descriptions are locale keys.
  presets: {
    "quiet": {
      desc: "demo_preset_quiet",
      config: { random: false, answer_prob: 0, greet_back: false, yesno: false, factoid: false, rag: true },
    },
    "lively": {
      desc: "demo_preset_lively",
      config: { random: true, answer_prob: 0.1, greet_back: true, yesno: true, factoid: true },
    },
  },
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

// The config strings (descriptions, group titles, preset descriptions) live in i18n/<lang>.json under
// their keys (discovered + merged into the engine i18n). Try `/config lang ru` to see the panel localized.
