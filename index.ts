/* ================= DEMO PERSONA: registration ================= */
// The single entry point: assemble the PersonaPack and register it. The engine imports this as a
// side-effect (src/persona/active.ts → import "./_pack") during isolate init. The pack's LOCALIZED
// strings (voice, /help, fallbacks, /info title + /config descriptions/groups/presets) live in
// i18n/<lang>.json — discovered + merged into the engine i18n by the generate step. Here we wire the
// NON-localized identity (wake words, username aliases) + the behavior parts.

import { setPersona } from "../registry";
import { DEMO_WAKE_WORDS, DEMO_ALIASES } from "./texts";
import { demoCommands } from "./commands";
import { demoQuickReplies } from "./quickReplies";
import { demoThrows } from "./randomThrows";
import { demoConfig } from "./config";
import { demoPromptLines, demoInfoLines, demoAdminFlags } from "./state";

setPersona({
  wakeWords: DEMO_WAKE_WORDS,
  usernameAliases: DEMO_ALIASES,
  commands: demoCommands,
  quickReplies: demoQuickReplies,
  randomThrows: demoThrows,
  config: demoConfig,
  // Hooks — extra lines the engine injects, derived from the pack's own persona-state (see state.ts):
  buildPromptLines: demoPromptLines, // into every system prompt
  infoLines: demoInfoLines,          // into /info
  adminFlags: demoAdminFlags,        // into the /admin per-chat listing
});
