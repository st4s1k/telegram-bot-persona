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

To ship your own bot, fork this pack, edit the files below, and point a deployment project at it via
`PERSONA_PACK` (see the engine's README → *Deployment*).

## What each file demonstrates

| File | Contract part | Shows |
|---|---|---|
| `texts.ts` | `PersonaTexts` | every text field; a pack-internal content array (`ENERGY_TEXTS`) |
| `index.ts` | `setPersona` + `localeTexts` | wiring all parts; a `ru` locale override (multilingual) |
| `commands.ts` | `RegisteredCommand[]` | a plain command (`/dice`, `skipHistory`), a **stateful** one (`/energy`, owns a `state` slice), and an **LLM** one (`/joke`, `llm`) |
| `state.ts` | persona-state schema + hooks | a `PersonaStateField` (`int` 0–5) + `buildPromptLines`/`infoLines`/`adminFlags` |
| `prompts.ts` | command prompt builder | layering instruction lines over the engine's `assemblePrompt` |
| `quickReplies.ts` | `QuickReplyRule[]` | a `test`+`responses` rule (with `probKey`) and a `tokenTable` rule |
| `randomThrows.ts` | `RandomThrowKind[]` | a weighted LLM "throw" |
| `config.ts` | `ConfigContribution` | all four `ConfigMeta` types (bool/float/int/string), groups, presets, aliases, `defaults(env)` |
| `tests/demo.persona.test.mjs` | — | how to test a pack against the engine harness |

### The persona-state model

A command can own a slice of a generic per-chat JSON slot (`personaState`). `/energy` declares
`{ energy: { type: "int", default: 2, min: 0, max: 5 } }`; the engine merges every command's slice into
the persona-state defaults and applies them on a new chat / on `/memory forget`. The engine never reads
the keys — the meaning lives in the pack, surfaced through the `buildPromptLines`/`infoLines`/`adminFlags`
hooks. Read state with `ctx.chatData.personaState`, write it with `updatePersonaState(ctx, patch)`.

### Localization

`texts` is the base; `localeTexts` overrides fields per language (here `ru`). `/config lang ru|en`
selects the locale; missing fields fall back to `texts`. A pack can be multilingual independently of the
engine UI language.

## Demo commands

| Command | Args | Does |
|---|---|---|
| `/dice` | `[N]` or `[min max]` | rolls a die (default upper bound from the `dice_max` config key) |
| `/energy` | `<0-5>` | sets the bot's energy level (or shows it); stored in `personaState` |
| `/joke` | `[topic]` | tells a short, family-friendly joke (LLM), with a `joke_style` config key |

The engine commands (`/help`, `/info`, `/config`, `/model`, `/memory`, `/summary`, `/rp`, `/stop`,
`/resume`, hidden `/admin`) come from the engine itself.

## License / use

A teaching example — copy it, fork it, build your own persona on top of it.
