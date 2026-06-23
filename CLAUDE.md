# CLAUDE.md

Guidance for Claude Code working in **this repo** — a **worked example persona pack** for the
[`telegram-bot-engine`](https://github.com/st4s1k/telegram-bot-engine). It exists to demonstrate the
`PersonaPack` contract end-to-end; keep it clean, neutral, SFW and heavily commented (it is read by
people learning the contract).

## What this is

The example persona "Demo". The `.ts` files at the repo root are the contents of an engine
`src/persona/<pack>/` directory; `tests/` holds the persona-specific Vitest files
(`*.persona.test.mjs`). It is **not** a standalone build: the files import engine helpers by relative
path (`../registry`, `../../types`, `../../prompts`, `../../utils`, `../../storage`, `../../llm`), so
they only typecheck/run **inside the engine tree**. Engine architecture (lifecycle, D1, config layering,
RAG, vision, routing, i18n, timezone) is documented in the **engine repo's `CLAUDE.md`**; this file
covers only the pack.

## The `PersonaPack` contract (defined in the engine's `src/persona/registry.ts`)

`index.ts` assembles a `PersonaPack` and registers it via `setPersona(...)`. The parts (one file each):

- **`texts`** (`texts.ts`, `PersonaTexts`) — voice, language line, fallbacks, wake-words, username
  aliases, `/help`, `/info` title. Also holds `ENERGY_TEXTS` (a pack-internal flavor array).
- **`localeTexts`** (`index.ts`) — per-language overrides of `texts` (here `ru`); `/config lang` selects.
- **`commands`** (`commands.ts`, `RegisteredCommand[]`) — `/dice` (plain, `skipHistory`), `/energy`
  (owns a `state` slice), `/joke` (`llm`). Fields: `type`, `defaultCmd`, `handler`, `llm`,
  `skipHistory`, `state`, optional `remoteAdmin`.
- **persona-state** (`state.ts`) — `demoStateSchema` (a `PersonaStateField`) + the
  `buildPromptLines`/`infoLines`/`adminFlags` hooks. The engine merges the `state` slices of all
  commands into the `personaState` defaults and calls the hooks blind to their meaning.
- **`quickReplies`** (`quickReplies.ts`) — a `test`+`responses` rule (with `probKey`) and a `tokenTable`.
- **`randomThrows`** (`randomThrows.ts`) — a weighted LLM throw.
- **`config`** (`config.ts`, `ConfigContribution`) — schema (all four types), groups, presets,
  presetAliases, `defaults(env)`.
- **`prompts.ts`** — a command prompt builder layered over the engine's `assemblePrompt`.

## Conventions & gotchas

- **Comment generously.** This pack teaches; every non-obvious line should say why.
- **`defaults(env)` returns `boolean | number` only.** A string config key (e.g. `joke_style`) cannot be
  defaulted there — default it at read-time in the handler (`ctx.cfg.joke_style || "classic"`).
- **Order matters** for `commands`/`quickReplies`/`randomThrows` (regex/quick-reply priority, weighted
  picks) and for any level-indexed content array (`ENERGY_TEXTS`).
- **Env via cast.** Read pack env vars with `const e = env as unknown as Record<string, string | undefined>`.
  Command names are fixed (no env-based renaming).
- **Fallback strings** live in `texts.ts` (and `localeTexts`) so the engine's `isFallbackMessage` keeps
  them out of history in any language.

## Working on the pack

Develop inside an engine checkout: copy the `.ts` files into `src/persona/<pack>/` and the
`tests/*.persona.test.mjs` next to the engine tests, then `npm run check` + `npm test` with
`PERSONA_PACK` pointing here. See the README for commands.
