/* ================= DEMO PERSONA: texts ================= */
// PersonaTexts — the user-facing strings the engine reads from the pack. Keep copy here, not scattered
// across handlers. Only a `import type` is used, so this layer carries no runtime dependency on the engine.

import type { PersonaTexts } from "../registry";

// A pack can keep its OWN content arrays next to the contract texts. Here: flavor lines indexed by the
// "energy" level (0–5), consumed by the prompt hook in state.ts. The engine never sees this array.
export const ENERGY_TEXTS: string[] = [
  "You feel sleepy and low-key — keep it mellow.",
  "You're calm and easygoing.",
  "You're in a normal, friendly mood.",
  "You're upbeat and chatty.",
  "You're very enthusiastic — lots of energy!",
  "You're at maximum hype — be exuberant (but still kind).",
];

export const demoTexts: PersonaTexts = {
  // Voice used when the chat has no custom /rp role of its own.
  defaultVoice: "You are Demo, a friendly and concise chat companion. Be warm, helpful and a little playful, and keep replies short.",
  // Instruction line about the reply language (empty string → the engine skips it).
  languageLine: "Reply in the same language the user writes in.",
  // Shown on an LLM error/timeout and on HTTP 402; the engine keeps these out of history (isFallbackMessage).
  fallbackError: "Oops — something went wrong. Try again in a moment.",
  fallbackNoCredits: "I'm out of credits right now, sorry!",
  // Substring match, any case: these wake the bot in group chats (besides an @mention).
  wakeWords: ["demo", "demobot"],
  // username (lowercase, no @) -> preferred display name (overrides the Telegram first_name).
  usernameAliases: { "octocat": "The Octocat" },
  // Used when neither a reply nor the author yields a name.
  targetNameFallback: "friend",
  // The full /help reply — the pack curates its own command list (engine + persona).
  helpText: [
    "*Demo bot* — commands:",
    "",
    "*Engine:*",
    "/help · /info · /config · /model · /memory · /summary · /rp · /stop · /resume",
    "",
    "*Demo persona:*",
    "/dice `[N]` or `[min max]` — roll a die",
    "/energy `<0-5>` — set the bot's energy level (or show it)",
    "/joke `[topic]` — tell a short joke",
  ].join("\n"),
  // /info title (markup/emoji allowed).
  infoTitle: "ℹ️ **Demo bot status**",
};
