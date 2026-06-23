/* ================= DEMO PERSONA: quick replies (no LLM) ================= */
// Instant, LLM-free reactions. The engine's tryQuickReply iterates these IN ORDER and uses the FIRST
// that fires; each is gated by cfg[cfgFlag] (a bool switch). Two flavors are shown:
//   • test + responses — a predicate on the lowercased text; a hit picks one response (pickOne).
//                        adding probKey also rolls cfg[probKey] (0..1) before firing.
//   • tokenTable       — match the message's LAST token (lowercased) against a table of responses.

import type { QuickReplyRule } from "../registry";

// tokenTable keyed by the last token of the message.
export const YESNO_TOKENS: Record<string, string[]> = {
  "yes": ["Absolutely! ✅", "For sure.", "Yep."],
  "no": ["No way. ❌", "Nope.", "Hard pass."],
};

const RE_HELLO = /\b(hi|hello|hey)\b/iu;

export const demoQuickReplies: QuickReplyRule[] = [
  // Greets back on hi/hello, but only with probability `greet_prob` (gated switch `greet_back`).
  { cfgFlag: "greet_back", probKey: "greet_prob", test: (s) => RE_HELLO.test(s), responses: ["Hey there! 👋", "Hello! 🙂", "Hi!"] },
  // Quips on a message whose last token is yes/no (switch `yesno`, always fires when matched).
  { cfgFlag: "yesno", tokenTable: YESNO_TOKENS },
];
