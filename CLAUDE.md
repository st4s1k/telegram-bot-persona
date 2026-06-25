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
  (username→display-name map). Nothing else: the level-indexed energy flavor now lives in i18n under
  `demo_energy_flavor`, read by `state.ts` via `tList(lang, "demo_energy_flavor")[level]`. `DEMO_ALIASES` is
  the **pack-static** default; the engine's `/alias` command sets **per-chat** overrides (stored in the
  reserved `chats.config.aliases` key) that the name resolvers merge **over** it — so `/dice`'s name
  resolution passes `chatAliases(ctx)` (see below), and no pack code is needed for runtime aliases.
- **localized strings** (`i18n/en.json` + `i18n/ru.json`) — the former `PersonaTexts` fields under
  `persona_*` keys (`persona_defaultVoice`, `persona_languageLine`, `persona_fallbackError`,
  `persona_fallbackNoCredits`, `persona_targetNameFallback`, `persona_infoTitle`, `persona_helpText`)
  plus **every** `demo_*` string the pack produces: the config strings (`demo_cfg_*` descriptions,
  `demo_grp_*` group titles, `demo_preset_*` preset descriptions), the displayed command/status strings
  (`demo_roll`, `demo_energy_show`/`_err`/`_set`, `demo_info_energy`), the quick-reply responses
  (`demo_greet_responses`, `demo_yesno_yes`/`_no`), and the prompt instructions/seeds (`demo_joke_prompt`,
  `demo_joke_topic`/`_topic_any`, `demo_joke_user_msg`/`_msg_any`, `demo_mood_line`, the level-indexed
  `demo_energy_flavor` array, `demo_factoid_prompt`). The engine **discovers + merges** these into its i18n
  at the generate step; `getPersonaTexts(lang)` reads the `persona_*` keys and `t()`/`tList()` resolve the
  `demo_*` keys. A missing key falls back to English (the default).
- **`commands`** (`commands.ts`, `RegisteredCommand[]`) — `/dice` (plain, `skipHistory`), `/energy`
  (owns a `state` slice), `/joke` (`llm`). Fields: `type`, `defaultCmd`, `handler`, `llm`,
  `skipHistory`, `state`, optional `remoteAdmin`. `/dice` resolves the roller's name via
  `getUserName(ctx.msg, ctx.cfg.lang, chatAliases(ctx))` — passing `chatAliases(ctx)` (from `../../utils`)
  so a per-chat `/alias` override is honored on top of `DEMO_ALIASES`.
- **persona-state** (`state.ts`) — `demoStateSchema` (a `PersonaStateField`) + the
  `buildPromptLines`/`infoLines`/`adminFlags` hooks. The engine merges the `state` slices of all
  commands into the `personaState` defaults and calls the hooks blind to their meaning.
- **`quickReplies`** (`quickReplies.ts`) — a `test`+`responses` rule (with `probKey`) and a `tokenTable`.
  `responses` and the `tokenTable` values are **i18n keys** (the engine's `tryQuickReply` resolves them per
  `cfg.lang` via `tList` → `pickOne`); the `RE_HELLO` regex and the `yes`/`no` token *keys* stay inline
  (input matching).
- **`randomThrows`** (`randomThrows.ts`) — a weighted LLM throw.
- **`config`** (`config.ts`, `ConfigContribution`) — schema (all four types), groups, presets (English
  keys `quiet`/`lively`, no aliases), `defaults(env)`.
- **`prompts.ts`** — a command prompt builder layered over the engine's `assemblePrompt`.

## Conventions & gotchas

- **Comment generously.** This pack teaches; every non-obvious line should say why.
- **`defaults(env)` returns `boolean | number` only.** A string config key (e.g. `joke_style`) cannot be
  defaulted there — default it at read-time in the handler (`ctx.cfg.joke_style || "classic"`).
- **Order matters** for `commands`/`quickReplies`/`randomThrows` (regex/quick-reply priority, weighted
  picks) and for any level-indexed content array (the `demo_energy_flavor` i18n array, index = energy level).
- **Env via cast.** Read pack env vars with `const e = env as unknown as Record<string, string | undefined>`.
  Command names are fixed (no env-based renaming).
- **Everything localized is in i18n.** Every string the pack produces — displayed output (`/dice`,
  `/energy` show/error/set, the `/info` energy line), the prompt instructions/seeds (the `prompts.ts`
  builder, the `/joke` synthetic user-turn, the `MOOD:` line + the energy flavor, the factoid prompt) and
  the quick-reply responses — is resolved via `t()`/`tList()` from `i18n/<lang>.json`. The only inline
  strings are the non-localized identity (`DEMO_WAKE_WORDS`/`DEMO_ALIASES`) and the **input-matching
  triggers** (the `RE_HELLO` regex, the `yes`/`no` `tokenTable` keys) — those match incoming messages, not
  output.
- **Fallback strings** live in `i18n/<lang>.json` under `persona_fallbackError`/`persona_fallbackNoCredits`,
  so the engine's `isFallbackMessage` keeps them out of history in any discovered language.

## Working on the pack

Develop inside an engine checkout: point `PERSONA_PACK` here and run `npm run check` + `npm test`. The
generate step (`select-persona.mjs`, via the pretest/precheck hook) copies the `.ts` files into
`src/persona/_pack/`, discovers/merges this pack's `i18n/*.json` into the engine i18n, **and auto-stages
`tests/*.persona.test.mjs`** into the engine's test folder (clearing any previously-staged pack tests
first) — no manual copy. See the README for commands. When a test asserts exact displayed wording it pins
`BOT_LANG=en`.
