/* ================= DEMO PERSONA: non-localized data + content arrays ================= */
// The pack's LOCALIZED strings (voice, language line, /help, fallbacks, /info title + the /config
// descriptions/group titles/preset descriptions) live in i18n/<lang>.json — discovered and merged into
// the engine i18n by the generate step (scripts/select-persona.mjs). This file holds only the
// NON-localized identity (wake words, username aliases) + the energy flavor array (read by state.ts).

// Wake words (substring, any case): wake the bot in group chats (besides an @mention). Not localized.
export const DEMO_WAKE_WORDS: string[] = ["demo", "demobot"];

// username (lowercase, no @) → preferred display name (overrides the Telegram first_name). Not localized.
export const DEMO_ALIASES: Record<string, string> = { "octocat": "The Octocat" };

// Energy flavor by level (0–5) — a pack-internal array consumed by the state hook (state.ts). Kept in
// English here to stay simple; a fuller example would split it per language (see «Фасол»'s AROUSAL_TEXTS).
export const ENERGY_TEXTS: string[] = [
  "You feel sleepy and low-key — keep it mellow.",
  "You're calm and easygoing.",
  "You're in a normal, friendly mood.",
  "You're upbeat and chatty.",
  "You're very enthusiastic — lots of energy!",
  "You're at maximum hype — be exuberant (but still kind).",
];
