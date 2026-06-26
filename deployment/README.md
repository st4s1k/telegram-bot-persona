# Deployment scaffold — ship a bot in one command

A copy-paste starting point for shipping your own bot on `telegram-bot-engine`. The engine is a
**library — it does not deploy itself**; deployment lives in *your* pack repo, which pulls the engine,
injects your pack via `PERSONA_PACK`, and `wrangler deploy`s against your own Cloudflare resources.

> **"Just use it"** = a deployed bot. Telegram delivers updates to a **public HTTPS webhook**, so a bot
> can't run on `localhost` (`wrangler dev` is local-only). The local loop is the offline test suite
> (`npm test` in the engine); to *use* the bot you deploy it. `setup.mjs` makes that one command.

## Prerequisites (get these first)

- **Node 22.5+** and **git**.
- **Telegram bot token** — talk to [@BotFather](https://t.me/BotFather) → `/newbot`.
- **OpenRouter API key** — [openrouter.ai/keys](https://openrouter.ai/keys). The default model is
  `openrouter/free`, so you don't need a funded balance to get first replies.
- **Cloudflare account** — [dash.cloudflare.com](https://dash.cloudflare.com) with **Workers** + **D1** +
  **KV** (Vectorize + Workers AI only if you turn RAG on — it's off by default). Then authenticate wrangler:
  `npx wrangler login` (or export `CLOUDFLARE_API_TOKEN`).

## Quick start (the one-command path)

From **this `deployment/` folder**, inside your fork of a pack repo:

```bash
cp .dev.vars.example .dev.vars     # fill TELEGRAM_BOT_TOKEN + OPENROUTER_API_KEY — the ONLY required edit
npm run setup                      # = node setup.mjs
```

That's it — **you only edit `.dev.vars`.** `setup.mjs` fills the rest of `wrangler.jsonc` from the terminal
(no hunting for placeholders): the bot's name/username + the worker name come from **Telegram `getMe`** (your
token), `account_id` from **`wrangler whoami`**, and the D1/KV/Vectorize ids on create. It then does it all,
**idempotently** (safe to re-run): clones the engine into `./.engine` and stages your pack → creates D1 + KV
(+ Vectorize if `ENABLE_RAG`) → sets your secrets → applies D1 migrations → `wrangler deploy` → registers the
Telegram webhook. When it finishes, message your bot.

Optional tweaks (the defaults work as-is): edit `vars` in `wrangler.jsonc` for `BOT_LANG`, `BOT_TZ`,
`ADMIN_USERNAMES` (left empty — add your `@username` to use `/admin`), `ENABLE_RAG`/`ENABLE_VISION`, etc.

> It shells out to `npx wrangler`; wrangler's output format can shift between versions, so if a parse
> step fails the script prints the exact manual command to run. Re-run `npm run setup` to redeploy after
> any change.

## What's in this folder

| File | What it is |
|---|---|
| `setup.mjs` | the one-command bootstrap above (`npm run setup`) |
| `wrangler.jsonc` | Worker config: name, account, `vars`, the `KV`/`DB`/`AI`/`VECTORIZE` bindings, crons. Fill `name`+`vars`; `setup.mjs` fills the resource ids |
| `.dev.vars.example` | the Worker **secrets** (tokens) — copy to `.dev.vars` (gitignored) and fill |
| `setWebhook.mjs` | register / delete the Telegram webhook (`setup.mjs` calls it; or run standalone) |
| `deploy.yml` | optional GitHub Actions CI for ongoing deploys (see below) |

`vars` (plaintext config: model, language, admins, …) live in `wrangler.jsonc` — a deploy **replaces**
them, so list every one you rely on. **Secrets** (tokens) live in `.dev.vars` / `wrangler secret put` and
**survive** deploys. Resource ids point at **live data** — set once, never change them.

## CI for ongoing deploys (optional)

`setup.mjs` is for the first deploy + manual redeploys. To auto-deploy on every push, put `deploy.yml` at
`.github/workflows/deploy.yml` and set repo secrets:

- `CLOUDFLARE_API_TOKEN` — **Workers Scripts:Edit + D1:Edit** (+ Vectorize/Workers AI **Write** if RAG is on
  — Workers AI at Read fails the deploy because the worker binds `env.AI`).
- `ENGINE_SSH_KEY` — a read-only deploy key for the engine repo. *(If the engine repo is public, delete the
  `ssh-key:` line in `deploy.yml`.)*

> **Migrations run before deploy.** `wrangler deploy` alone does **not** apply D1 migrations, and deploying
> new code against a missing column makes the worker fail to persist chat state (silently). `setup.mjs` and
> `deploy.yml` both apply migrations first — **never run a bare `wrangler deploy`** without them.

> **Set `TELEGRAM_WEBHOOK_SECRET`** for any public deploy (`openssl rand -hex 32` → `.dev.vars`). Without it,
> anyone who learns the worker URL can forge updates and impersonate an `/admin`. `setup.mjs` wires it through.

## Minimal pack

You need a pack for `PERSONA_PACK` to point at. The smallest is an `index.ts` calling `setPersona({})` plus
an `i18n/en.json` with a `persona_defaultVoice` — see this demo pack's README → *The smallest possible pack*.
The native "/" command menu syncs itself after deploy (next daily cron) or instantly via `/admin commands`.
