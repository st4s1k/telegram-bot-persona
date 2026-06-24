/* ================= DEMO PERSONA: non-localized identity ================= */
// The pack's LOCALIZED strings — voice, language line, /help, fallbacks, /info title, the /config
// descriptions/group titles/preset descriptions, the command/status text, the prompt instructions and
// the energy flavor — ALL live in i18n/<lang>.json, discovered and merged into the engine i18n by the
// generate step. This file holds ONLY the non-localized identity: wake words + username aliases.

// Wake words (substring, any case): wake the bot in group chats (besides an @mention). Not localized.
export const DEMO_WAKE_WORDS: string[] = ["demo", "demobot"];

// username (lowercase, no @) → preferred display name (overrides the Telegram first_name). Not localized.
export const DEMO_ALIASES: Record<string, string> = { "octocat": "The Octocat" };
