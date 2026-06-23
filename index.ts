/* ================= DEMO PERSONA: registration ================= */
// The single entry point: assemble the PersonaPack and register it via setPersona. The engine imports
// this as a side-effect (src/persona/active.ts → import "./_pack") during isolate init, before the first
// request — so the COMMANDS / CONFIG_SCHEMA / quick-reply / throw maps already see the pack.

import { setPersona } from "../registry";
import { demoTexts } from "./texts";
import { demoCommands } from "./commands";
import { demoQuickReplies } from "./quickReplies";
import { demoThrows } from "./randomThrows";
import { demoConfig } from "./config";
import { demoPromptLines, demoInfoLines, demoAdminFlags } from "./state";

setPersona({
  texts: demoTexts,
  // Optional per-locale overrides (key = lang). `/config lang ru` selects this; any missing field falls
  // back to `texts`. This lets one pack speak several languages independently of the engine UI language.
  localeTexts: {
    ru: {
      defaultVoice: "Ты Demo — дружелюбный и краткий собеседник. Будь тёплым, полезным и немного игривым, отвечай коротко.",
      languageLine: "Отвечай на языке собеседника.",
      fallbackError: "Упс — что-то пошло не так. Попробуй ещё раз чуть позже.",
      fallbackNoCredits: "У меня закончились кредиты, извини!",
      infoTitle: "ℹ️ **Статус Demo-бота**",
    },
  },
  commands: demoCommands,
  quickReplies: demoQuickReplies,
  randomThrows: demoThrows,
  config: demoConfig,
  // Hooks — extra lines the engine injects, derived from the pack's own persona-state (see state.ts):
  buildPromptLines: demoPromptLines, // into every system prompt
  infoLines: demoInfoLines,          // into /info
  adminFlags: demoAdminFlags,        // into the /admin per-chat listing
});
