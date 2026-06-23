# CLAUDE.md

Guidance for Claude Code working in **this repo** — a **worked example persona pack** for the
[`telegram-bot-engine`](https://github.com/st4s1k/telegram-bot-engine). It exists to demonstrate the
`PersonaPack` contract end-to-end; keep it clean, neutral, SFW and heavily commented (it is read by
people learning the contract).

## What this is

The example persona "Demo". The `.ts` files at the repo root are the contents of an engine
`src/persona/<pack>/` directory, and `i18n/` (`en.json` + `ru.json`) holds the pack's localized strings
(discovered + merged into the engine i18n at the generate step); `tests/` holds the persona-specific
Vitest files (`*.persona.test.mjs`). It is **not** a standalone build: the files import engine helpers by
relative path (`../registry`, `../../types`, `../../prompts`, `../../utils`, `../../storage`, `../../llm`,
`../../i18n`), so they only typecheck/run **inside the engine tree**. Engine architecture (lifecycle, D1, config layering,
RAG, vision, routing, i18n, timezone) is documented in the **engine repo's `CLAUDE.md`**; this file
covers only the pack.

## The `PersonaPack` contract (defined in the engine's `src/persona/registry.ts`)

`index.ts` assembles a `PersonaPack` and registers it via `setPersona({ wakeWords, usernameAliases,
commands, quickReplies, randomThrows, config, buildPromptLines, infoLines, adminFlags })`. There is no
`texts`/`localeTexts` — the localized strings live in the pack's own `i18n/` folder. The parts:

- **non-localized identity** (`texts.ts`) — `DEMO_WAKE_WORDS` (wake-words array) + `DEMO_ALIASES`
  (username→display-name map). Also holds `ENERGY_TEXTS` (a pack-internal, level-indexed flavor array
  consumed by `state.ts`).
- **localized strings** (`i18n/en.json` + `i18n/ru.json`) — the former `PersonaTexts` fields under
  `persona_*` keys (`persona_defaultVoice`, `persona_languageLine`, `persona_fallbackError`,
  `persona_fallbackNoCredits`, `persona_targetNameFallback`, `persona_infoTitle`, `persona_helpText`)
  plus the `demo_*` config strings (`demo_cfg_*` descriptions, `demo_grp_*` group titles, `demo_preset_*`
  preset descriptions) and the displayed command/status strings (`demo_roll`, `demo_energy_show`/`_err`/
  `_set`, `demo_info_energy`). The engine **discovers + merges** these into its i18n at the generate step;
  `getPersonaTexts(lang)` reads the `persona_*` keys and `t()` resolves the `demo_*` keys. A missing key
  falls back to English (the default).
- **`commands`** (`commands.ts`, `RegisteredCommand[]`) — `/dice` (plain, `skipHistory`), `/energy`
  (owns a `state` slice), `/joke` (`llm`). Fields: `type`, `defaultCmd`, `handler`, `llm`,
  `skipHistory`, `state`, optional `remoteAdmin`.
- **persona-state** (`state.ts`) — `demoStateSchema` (a `PersonaStateField`) + the
  `buildPromptLines`/`infoLines`/`adminFlags` hooks. The engine merges the `state` slices of all
  commands into the `personaState` defaults and calls the hooks blind to their meaning.
- **`quickReplies`** (`quickReplies.ts`) — a `test`+`responses` rule (with `probKey`) and a `tokenTable`.
- **`randomThrows`** (`randomThrows.ts`) — a weighted LLM throw.
- **`config`** (`config.ts`, `ConfigContribution`) — schema (all four types), groups, presets (English
  keys `quiet`/`lively`, no aliases), `defaults(env)`.
- **`prompts.ts`** — a command prompt builder layered over the engine's `assemblePrompt`.

## Conventions & gotchas

- **Comment generously.** This pack teaches; every non-obvious line should say why.
- **`defaults(env)` returns `boolean | number` only.** A string config key (e.g. `joke_style`) cannot be
  defaulted there — default it at read-time in the handler (`ctx.cfg.joke_style || "classic"`).
- **Order matters** for `commands`/`quickReplies`/`randomThrows` (regex/quick-reply priority, weighted
  picks) and for any level-indexed content array (`ENERGY_TEXTS`).
- **Env via cast.** Read pack env vars with `const e = env as unknown as Record<string, string | undefined>`.
  Command names are fixed (no env-based renaming).
- **Displayed vs. model-input strings.** Anything **shown to the user** (the `/dice`, `/energy`
  show/error/set replies, the `/info` energy line) is localized via `t(ctx.cfg.lang, ...)` from
  `i18n/<lang>.json`. **Model-input** strings stay inline in code (the `prompts.ts` builder, the `/joke`
  user message, the `MOOD:` prompt line + the `ENERGY_TEXTS` flavor) — the model is prompted in one base
  language, nothing to localize.
- **Fallback strings** live in `i18n/<lang>.json` under `persona_fallbackError`/`persona_fallbackNoCredits`,
  so the engine's `isFallbackMessage` keeps them out of history in any discovered language.

## Working on the pack

Develop inside an engine checkout: point `PERSONA_PACK` here and run `npm run check` + `npm test`. The
generate step copies the `.ts` files into `src/persona/_pack/` and discovers/merges this pack's
`i18n/*.json` into the engine i18n; copy `tests/*.persona.test.mjs` next to the engine tests to run them.
See the README for commands. When a test asserts exact displayed wording it pins `BOT_LANG=en`.
