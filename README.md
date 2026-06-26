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

# 2. run the suite against this pack — the pretest/precheck hook (select-persona.mjs) stages the pack's
#    .ts + i18n/ AND its tests/*.persona.test.mjs automatically; just point PERSONA_PACK at this folder.
PERSONA_PACK=../telegram-bot-persona npm run check   # typecheck with the pack
PERSONA_PACK=../telegram-bot-persona npm test        # engine + demo-pack tests
```

When a test asserts the exact wording of a displayed reply, it pins `BOT_LANG=en` (the demo's base
language) so the localized string is stable — see `tests/demo.persona.test.mjs`.

To ship your own bot, fork this pack, edit the files below, and point a deployment project at it via
`PERSONA_PACK`. A **ready-to-copy deploy scaffold** lives in [`deployment/`](deployment/) — a
`wrangler.jsonc`, a GitHub Actions `deploy.yml` (clone engine → stage pack → gate → migrate → deploy), a
`.dev.vars.example`, and a `setWebhook.mjs` helper, with a step-by-step README.

## The smallest possible pack

This demo exercises **every** contract part, but they are all optional (`setPersona({})` is the neutral
engine). The practical floor is **two files** — an `index.ts` that registers an empty pack and an
`i18n/en.json` that overrides just the system-prompt voice:

`index.ts`
```ts
import { setPersona } from "../registry";
setPersona({}); // no commands / quick-replies / throws / config / state — just a voice
```

`i18n/en.json`
```json
{ "persona_defaultVoice": "You are a friendly assistant. Keep replies short and warm." }
```

Point `PERSONA_PACK` at that folder and the engine runs with your voice plus all its built-in commands
(`/help`, `/config`, `/model`, `/memory`, `/summary`, `/alias`, …). Every other `persona_*` key you omit
falls back to the engine's neutral localized default (`getPersonaTexts` → `NEUTRAL_KEYS`), so a missing
`persona_fallbackError`/`persona_infoTitle`/`persona_helpText` is fine. Add a `commands`/`quickReplies`/
`config`/state slice (and its `demo_*`-style i18n keys) only when you actually need one — copy the
matching file from this demo as a template.

## What each file demonstrates

| File | Contract part | Shows |
|---|---|---|
| `texts.ts` | non-localized identity | the wake-words array (`DEMO_WAKE_WORDS`) and the pack-static username-aliases map (`DEMO_ALIASES`) — nothing else (the engine's `/alias` layers per-chat overrides on top at runtime) |
| `i18n/en.json` + `i18n/ru.json` | localized strings | the `persona_*` text fields (voice, `/help`, fallbacks, `/info` title) and the `demo_*` strings — config, command/status output, quick-reply responses, prompt instructions, the energy flavor — i.e. **everything** the pack produces as text |
| `index.ts` | `setPersona` | wiring all parts together (no `localeTexts` — localized strings live in `i18n/`) |
| `commands.ts` | `RegisteredCommand[]` | a plain command (`/dice`, `skipHistory`), a **stateful** one (`/energy`, owns a `state` slice), and an **LLM** one (`/joke`, `llm`); each sets `menuDesc` (an i18n key) so it appears in Telegram's native "/" command menu |
| `state.ts` | persona-state schema + hooks | a `PersonaStateField` (`int` 0–5) + `buildPromptLines`/`infoLines`/`adminFlags`; the level-indexed flavor is `tList(lang, "demo_energy_flavor")[level]` |
| `prompts.ts` | command prompt builder | layering instruction lines over the engine's `assemblePrompt` (instruction text from i18n via `t()`) |
| `quickReplies.ts` | `QuickReplyRule[]` | a `test`+`responses` rule (with `probKey`) and a `tokenTable` rule — `responses` and the `tokenTable` values are **i18n keys** |
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

The pack ships an **`i18n/` folder** (`en.json` + `ru.json`); every string the pack produces is **keyed** —
`persona_*` for the `PersonaTexts` fields (voice, language line, fallbacks, `/info` title, `/help`),
`demo_*` for the `/config` descriptions/group titles/preset descriptions, the command/status strings, the
quick-reply responses, the prompt instruction lines/seeds and the energy flavor.
The engine **discovers** these files and merges them into its own i18n at the generate step. `/config lang ru|en`
(or `/lang`) selects the language, validated against the discovered locales — an unknown code is rejected.
A missing key falls back to English (the default). Adding a language = drop in `i18n/<code>.json`; no code change.

**Which strings go where.** Everything localized lives in `i18n/<lang>.json` and resolves via `t()`/`tList()`:
the displayed output (`/dice`, the `/energy` show/error/set replies, the `/info` energy line), the prompt
instruction lines and seeds (the `/joke` prompt + synthetic user-turn, the `MOOD:` line, the energy flavor
in `state.ts`, the factoid prompt), **and** the quick-reply responses (`demo_greet_responses`,
`demo_yesno_yes`/`demo_yesno_no`). The only things that stay **inline** in code are the non-localized
identity (`DEMO_WAKE_WORDS`/`DEMO_ALIASES`) and the **input-matching triggers** — the `hi|hello|hey` regex
and the `yes`/`no` token *keys* of the `tokenTable` — because those match incoming messages, they are not
output.

> `DEMO_ALIASES` is the **pack-static** default (`octocat` → "The Octocat"). The engine's `/alias` command
> lets a user set per-chat display-name aliases at runtime (`/alias @user Name`; bare `/alias` lists them;
> `/alias del @user` removes one); the name resolvers merge those **over** `DEMO_ALIASES`, so a runtime
> alias also fixes the `[from:Name]` history tag the model sees. They live in `chats.config.aliases` (a
> reserved per-chat config key, not a `/config` scalar) — no pack code needed.

## Demo commands

| Command | Args | Does |
|---|---|---|
| `/dice` | `[N]` or `[min max]` | rolls a die (default upper bound from the `dice_max` config key) |
| `/energy` | `<0-5>` | sets the bot's energy level (or shows it); stored in `personaState` |
| `/joke` | `[topic]` | tells a short, family-friendly joke (LLM), with a `joke_style` config key |

The engine commands (`/start`, `/help`, `/info`, `/config`, `/lang`, `/model`, `/memory`, `/summary`,
`/retry`, `/rp`, `/stop`, `/resume`, `/alias`, hidden `/admin`) come from the engine itself — including `/alias`, which sets
per-chat display-name aliases layered over this pack's `DEMO_ALIASES`. `/help` is **additive**: the engine
renders its base command list and appends the pack's `persona_helpText` (the "Demo commands" above).

## License / use

A teaching example — copy it, fork it, build your own persona on top of it.
