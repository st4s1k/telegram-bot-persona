/* ================= DEMO PERSONA: config contribution ================= */
// The pack's contribution to /config: its own schema keys, help groups, presets, and defaults. The
// engine merges these with its own (CONFIG_SCHEMA / CONFIG_GROUPS / CONFIG_PRESETS = engine ∪ persona)
// and mixes defaults(env) into getGlobalConfig. This example shows all four ConfigMeta types AND full
// localization: descriptions / group titles / preset descriptions are LOCALE KEYS, resolved by the
// engine via t(); the translations live in demoConfigLocales and are merged into the engine i18n by
// index.ts (PersonaPack.locales). (A desc may also be a literal string — t() returns an unknown key
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

// Translations for the config keys above — merged into the engine i18n by index.ts (PersonaPack.locales).
// English is the base/fallback; `ru` shows the same panel localized (try `/config lang ru`).
export const demoConfigLocales: Record<string, Record<string, string>> = {
  en: {
    demo_cfg_greet_back: "Greet back on hi/hello",
    demo_cfg_yesno: "Quip on a yes/no message",
    demo_cfg_factoid: "Occasionally drop a fun fact",
    demo_cfg_greet_prob: "Chance to greet back",
    demo_cfg_factoid_prob: "Chance to drop a fun fact",
    demo_cfg_dice_max: "Default upper bound for /dice",
    demo_cfg_joke_style: "Style passed to /joke (e.g. classic, pun, dad)",
    demo_grp_reactions: "⚡ Reactions",
    demo_grp_limits: "🎲 Chances & limits",
    demo_grp_jokes: "😄 Jokes",
    demo_preset_quiet: "calm assistant: no unprompted chatter, long-term memory on",
    demo_preset_lively: "playful: greets, quips and fun facts on",
  },
  ru: {
    demo_cfg_greet_back: "Здороваться в ответ на hi/hello",
    demo_cfg_yesno: "Подкалывать на сообщение yes/no",
    demo_cfg_factoid: "Иногда вбрасывать интересный факт",
    demo_cfg_greet_prob: "Шанс поздороваться в ответ",
    demo_cfg_factoid_prob: "Шанс вбросить факт",
    demo_cfg_dice_max: "Верхняя граница по умолчанию для /dice",
    demo_cfg_joke_style: "Стиль для /joke (напр. classic, pun, dad)",
    demo_grp_reactions: "⚡ Реакции",
    demo_grp_limits: "🎲 Шансы и лимиты",
    demo_grp_jokes: "😄 Шутки",
    demo_preset_quiet: "спокойный ассистент: без болтовни, долгая память включена",
    demo_preset_lively: "игривый: здоровается, подкалывает и вбрасывает факты",
  },
};
