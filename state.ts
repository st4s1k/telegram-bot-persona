/* ================= DEMO PERSONA: state (schema + hooks) ================= */
// How a pack owns per-chat state WITHOUT the engine knowing its meaning. A command declares a `state`
// slice (below, wired to /energy in commands.ts via RegisteredCommand.state). The engine merges the
// slices of all commands into the generic `personaState` JSON slot, applies the defaults on a new chat
// (and on /memory forget), and calls the hooks here — all blind to the semantics. "Energy" lives entirely
// in this pack.

import type { Ctx } from "../../types";
import type { PersonaStateField } from "../registry";
import { t, tList } from "../../i18n";

// The /energy command's state slice. PersonaStateField supports "int" | "float" | "bool" | "string"
// (with optional min/max for numbers). Add more fields, or more commands with their own slices, freely —
// the engine unions them all into the persona-state defaults.
export const demoStateSchema: Record<string, PersonaStateField> = {
  energy: { type: "int", default: 2, min: 0, max: 5 },
};

// Read the current level out of the generic slot (falls back to 0 if unset).
export function energyLevel(ctx: Ctx): number {
  return Number(ctx.chatData.personaState.energy) || 0;
}

// Hook: an extra line added to EVERY system prompt — flavor derived from the pack's own state. The flavor
// is the per-level entry of `demo_energy_flavor` (indexed by level → tList, since t() would join it); the
// `MOOD:` label is `demo_mood_line`. Both localized via i18n.
export function demoPromptLines(ctx: Ctx): string[] {
  const flavor = tList(ctx.cfg.lang, "demo_energy_flavor")[energyLevel(ctx)] || "";
  return flavor ? [t(ctx.cfg.lang, "demo_mood_line", flavor)] : [];
}

// Hook: an extra line for /info, shown under the title (before the role) — displayed, so it's from i18n.
export function demoInfoLines(ctx: Ctx): string[] {
  return [t(ctx.cfg.lang, "demo_info_energy", energyLevel(ctx))];
}

// Hook: a compact flag for /admin's per-chat listing (empty string → show nothing). Receives the parsed
// persona-state of the row. Here we surface only a non-default level.
export function demoAdminFlags(state: Record<string, unknown>): string {
  const e = Number(state.energy) || 0;
  return e !== 2 ? `⚡${e}` : "";
}
