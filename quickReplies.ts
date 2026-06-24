/* ================= DEMO PERSONA: quick replies (no LLM) ================= */
// Instant, LLM-free reactions. The engine's tryQuickReply iterates these IN ORDER and uses the FIRST that
// fires; each is gated by cfg[cfgFlag] (a bool switch). The displayed RESPONSES are i18n KEYS (their value
// is the candidate array; the engine resolves them per cfg.lang via tList → pickOne). Two flavors:
//   • test + responses — a predicate on the lowercased text (a hit picks one response; probKey also rolls cfg[probKey]).
//   • tokenTable       — match the message's LAST token against a table of {token → i18n key}.
// The triggers (RE_HELLO, the 'yes'/'no' token keys) match INPUT and stay inline.

import type { QuickReplyRule } from "../registry";

// Last token of the message → i18n key with the candidate responses.
export const YESNO_TOKENS: Record<string, string> = { "yes": "demo_yesno_yes", "no": "demo_yesno_no" };

const RE_HELLO = /\b(hi|hello|hey)\b/iu;

export const demoQuickReplies: QuickReplyRule[] = [
  // Greets back on hi/hello, but only with probability `greet_prob` (gated switch `greet_back`).
  { cfgFlag: "greet_back", probKey: "greet_prob", test: (s) => RE_HELLO.test(s), responses: "demo_greet_responses" },
  // Quips on a message whose last token is yes/no (switch `yesno`, always fires when matched).
  { cfgFlag: "yesno", tokenTable: YESNO_TOKENS },
];
