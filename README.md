# telegram-bot-persona — a worked example persona pack

A small, neutral **example persona pack** for the
[`telegram-bot-engine`](https://github.com/st4s1k/telegram-bot-engine) — a clean, SFW reference that
exercises **every part** of the `PersonaPack` contract so you can copy from it instead of guessing.
The example persona is "Demo": a friendly, concise chat companion.

A persona pack is the engine's swappable personality. The engine ships neutral; a pack supplies the
voice, commands, quick replies, random throws, config and per-chat state. This repo is one such pack,
written to be read.

## How to use it

The pack is **not** a standalone build — its files import engine helpers by relative path and only
typecheck/run **inside the engine tree**. Develop against an engine checkout:

```bash
# 1. clone the engine next to this repo
git clone https://github.com/st4s1k/telegram-bot-engine
cd telegram-bot-engine && npm install

# 2. stage this pack and run the suite (the pretest hook copies the pack into src/persona/_pack)
cp ../telegram-bot-persona/tests/*.persona.test.mjs .claude/skills/testing-worker/
PERSONA_PACK=../telegram-bot-persona npm run check   # typecheck with the pack
PERSONA_PACK=../telegram-bot-persona npm test        # engine + demo-pack tests
```

When a test asserts the exact wording of a displayed reply, it pins `BOT_LANG=en` (the demo's base
language) so the localized string is stable — see `tests/demo.persona.test.mjs`.

To ship your own bot, fork this pack, edit the files below, and point a deployment project at it via
`PERSONA_PACK` (see the engine's README → *Deployment*).

## What each file demonstrates

| File | Contract part | Shows |
|---|---|---|
| `texts.ts` | non-localized identity + content | the wake-words array, the username-aliases map, and a pack-internal content array (`ENERGY_TEXTS`) |
| `i18n/en.json` + `i18n/ru.json` | localized strings | the `persona_*` text fields (voice, `/help`, fallbacks, `/info` title) and the `demo_*` config + command strings — what makes the pack bilingual |
| `index.ts` | `setPersona` | wiring all parts together (no `localeTexts` — localized strings live in `i18n/`) |
| `commands.ts` | `RegisteredCommand[]` | a plain command (`/dice`, `skipHistory`), a **stateful** one (`/energy`, owns a `state` slice), and an **LLM** one (`/joke`, `llm`) |
| `state.ts` | persona-state schema + hooks | a `PersonaStateField` (`int` 0–5) + `buildPromptLines`/`infoLines`/`adminFlags` |
| `prompts.ts` | command prompt builder | layering instruction lines over the engine's `assemblePrompt` |
| `quickReplies.ts` | `QuickReplyRule[]` | a `test`+`responses` rule (with `probKey`) and a `tokenTable` rule |
| `randomThrows.ts` | `RandomThrowKind[]` | a weighted LLM "throw" |
| `config.ts` | `ConfigContribution` | all four `ConfigMeta` types (bool/float/int/string), groups, presets, `defaults(env)` |
| `tests/demo.persona.test.mjs` | — | how to test a pack against the engine harness |

### The persona-state model

A command can own a slice of a generic per-chat JSON slot (`personaState`). `/energy` declares
`{ energy: { type: "int", default: 2, min: 0, max: 5 } }`; the engine merges every command's slice into
the persona-state defaults and applies them on a new chat / on `/memory forget`. The engine never reads
the keys — the meaning lives in the pack, surfaced through the `buildPromptLines`/`infoLines`/`adminFlags`
hooks. Read state with `ctx.chatData.personaState`, write it with `updatePersonaState(ctx, patch)`.

### Localization

The pack ships an **`i18n/` folder** (`en.json` + `ru.json`); every displayed string is **keyed** —
`persona_*` for the `PersonaTexts` fields (voice, language line, fallbacks, `/info` title, `/help`),
`demo_*` for the `/config` descriptions/group titles/preset descriptions and the command/status strings.
The engine **discovers** these files and merges them into its own i18n at the generate step. `/config lang ru|en`
(or `/lang`) selects the language, validated against the discovered locales — an unknown code is rejected.
A missing key falls back to English (the default). Adding a language = drop in `i18n/<code>.json`; no code change.

**Which strings go where.** The pack's **displayed** output (`/dice`, the `/energy` show/error/set replies,
the `/info` energy line) is localized via `t(ctx.cfg.lang, ...)` from `i18n/<lang>.json`. **Model-input**
strings stay inline in code (the `prompts.ts` builder, the `/joke` user message, the `MOOD:` prompt line and
the `ENERGY_TEXTS` flavor in `state.ts`) — the model is prompted in one base language, so there's nothing to
localize there.

## Demo commands

| Command | Args | Does |
|---|---|---|
| `/dice` | `[N]` or `[min max]` | rolls a die (default upper bound from the `dice_max` config key) |
| `/energy` | `<0-5>` | sets the bot's energy level (or shows it); stored in `personaState` |
| `/joke` | `[topic]` | tells a short, family-friendly joke (LLM), with a `joke_style` config key |

The engine commands (`/help`, `/info`, `/config`, `/lang`, `/model`, `/memory`, `/summary`, `/rp`,
`/stop`, `/resume`, hidden `/admin`) come from the engine itself. `/help` is **additive**: the engine
renders its base command list and appends the pack's `persona_helpText` (the "Demo commands" above).

## License / use

A teaching example — copy it, fork it, build your own persona on top of it.
