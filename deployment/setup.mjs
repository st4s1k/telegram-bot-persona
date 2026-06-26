#!/usr/bin/env node
/*
 * ONE-COMMAND BOOTSTRAP for a bot built on telegram-bot-engine.
 *
 * From this folder, after (1) filling `.dev.vars` (copy from .dev.vars.example) and (2) setting at least
 * `name` + `account_id` + the `vars` in wrangler.jsonc:
 *
 *     node setup.mjs        # or:  npm run setup
 *
 * It does, IDEMPOTENTLY (re-running is safe — it skips anything already provisioned):
 *   1. checks Node + wrangler auth + required keys
 *   2. clones/updates the engine into ./.engine and installs it, staging THIS pack via PERSONA_PACK
 *   3. provisions Cloudflare D1 + KV (+ Vectorize if ENABLE_RAG) and writes their ids into wrangler.jsonc
 *   4. sets the worker secrets from .dev.vars
 *   5. applies D1 migrations, then `wrangler deploy`s
 *   6. registers the Telegram webhook to the deployed URL (with your secret if set)
 *
 * REQUIRES: Node 22.5+, git, and wrangler auth — run `npx wrangler login` OR `export CLOUDFLARE_API_TOKEN=…`.
 * This is a TEMPLATE that shells out to `npx wrangler`; wrangler's output format can change between
 * versions, so if a parse step fails the script prints the manual command to run instead. Verify on your
 * own Cloudflare account.
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = join(HERE, "..");                 // the pack repo root — deployment/ lives inside it
const ENGINE_DIR = join(HERE, ".engine");          // engine checkout (gitignored)
const ENGINE_REPO = process.env.ENGINE_REPO || "https://github.com/st4s1k/telegram-bot-engine.git";
const WRANGLER = join(HERE, "wrangler.jsonc");

const log = (m) => console.log(`\n▶ ${m}`);
const die = (m) => { console.error(`\n✖ ${m}`); process.exit(1); };
const firstMatch = (s, re) => { const m = String(s).match(re); return m ? m[1] : null; };

// Streamed command (output to the terminal). Throws on non-zero exit.
function sh(cmd, opts = {}) { execSync(cmd, { stdio: "inherit", cwd: HERE, ...opts }); }
// Captured command (returns stdout; stderr still streams). Throws on non-zero exit.
function cap(cmd, opts = {}) { return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"], cwd: HERE, ...opts }); }
// Captured command that never throws — returns stdout + error text. For probing / parsing wrangler output.
function safe(cmd) { try { return cap(cmd); } catch (e) { return String(e.stdout || "") + String(e.stderr || "") + String(e.message || ""); } }
// Cloudflare returns this when the auth token lacks a product scope (e.g. an OAuth `wrangler login` has no D1).
const AUTH_ERR = /code:\s*10000|Authentication error|workers\.api\.error\.unauthorized/i;
// Prompt for a value the terminal can't auto-resolve; non-interactive (CI / no TTY) → the default. Enter → default.
async function ask(question, def = "") {
  if (!process.stdin.isTTY) return def;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(`  ${question}${def ? ` [${def}]` : ""}: `)).trim() || def; }
  finally { rl.close(); }
}

// 1) Node + keys --------------------------------------------------------------
const [maj, min] = process.versions.node.split(".").map(Number);
if (maj < 22 || (maj === 22 && min < 5)) die(`Node 22.5+ required (you have ${process.versions.node}) — the engine + its setup use node:sqlite/recent APIs.`);

if (!existsSync(join(HERE, ".dev.vars"))) die("No .dev.vars — copy .dev.vars.example to .dev.vars and fill your keys, then re-run.");
const env = Object.fromEntries(
  readFileSync(join(HERE, ".dev.vars"), "utf8").split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
for (const k of ["TELEGRAM_BOT_TOKEN", "OPENROUTER_API_KEY"]) {
  if (!env[k] || env[k].includes("your-")) die(`.dev.vars: ${k} is required (get TELEGRAM_BOT_TOKEN from @BotFather, OPENROUTER_API_KEY from openrouter.ai).`);
}

// Ensure a modern LOCAL wrangler — otherwise `npx wrangler` from this folder picks up a stale GLOBAL
// wrangler (1.x has no `d1`/`kv namespace` subcommands), and every step fails. devDependency in package.json.
if (!existsSync(join(HERE, "node_modules", "wrangler"))) { log("Installing local wrangler"); sh("npm install"); }

// 2) Auto-fill wrangler.jsonc from the terminal — you only edit .dev.vars ------
// Everything that can be resolved without you (bot name/username, worker name, account id, resource ids)
// is filled here / on create; the only thing you must edit is .dev.vars (the two keys).
let wj = readFileSync(WRANGLER, "utf8");
const jsonStr = (v) => String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); // safe inside a JSON string

// Bot identity from Telegram getMe → BOT_NAME / BOT_USERNAME / OPENROUTER_TITLE + the derived worker name.
let bot;
try {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
  const d = await r.json();
  if (!d?.ok) die(`Telegram rejected the bot token (getMe): ${d?.description || "invalid"}. Fix TELEGRAM_BOT_TOKEN in .dev.vars.`);
  bot = d.result;
} catch (e) { die(`Couldn't reach Telegram getMe (${e.message}). Check your network and TELEGRAM_BOT_TOKEN.`); }
const derivedName = bot.username.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "my-bot";

// Resolve the remaining vars from the terminal: timezone auto from the system; @username (admins) + UI
// language asked (Enter = default; non-interactive/CI → default). Everything else uses the template defaults.
const sysTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
const adminUser = (await ask("Your Telegram @username for /admin (blank = none)", "")).replace(/^@+/, "");
const botLang = await ask("Bot UI language code (en, ru, …)", "en");
const botTz = await ask("Timezone (IANA, e.g. Europe/Berlin)", sysTz);

// Fill identity + vars BEFORE any wrangler command — wrangler rejects the placeholder "name" on config load
// (whoami/create/deploy all read wrangler.jsonc). account_id follows whoami.
const idFills = {
  "<your-bot-name>": derivedName,
  "<Your Bot>": bot.first_name,   // BOT_NAME + OPENROUTER_TITLE (both occurrences)
  "<your_bot>": bot.username,     // BOT_USERNAME
  "<your_username>": adminUser,   // ADMIN_USERNAMES
};
for (const [ph, val] of Object.entries(idFills)) wj = wj.split(ph).join(jsonStr(val));
wj = wj.replace('"BOT_LANG": "en"', `"BOT_LANG": "${jsonStr(botLang)}"`).replace('"BOT_TZ": "UTC"', `"BOT_TZ": "${jsonStr(botTz)}"`);
writeFileSync(WRANGLER, wj);

// Auth: `wrangler login` (OAuth — a one-click browser "Authorize"; NO hand-made API token needed). If not
// logged in and a terminal is available, we run login automatically; in CI / non-interactive, use a token
// (set CLOUDFLARE_API_TOKEN). account_id is then read from whoami.
let who;
try { who = cap("npx wrangler whoami"); }
catch {
  if (!process.stdin.isTTY) die("Not authenticated. Run `npx wrangler login` once locally, or set CLOUDFLARE_API_TOKEN (e.g. in CI).");
  log("Not logged in to Cloudflare — running `wrangler login` (a browser tab opens; click Authorize)…");
  sh("npx wrangler login");
  who = cap("npx wrangler whoami");
}
const acct = firstMatch(who, /([0-9a-f]{32})/i);
if (!acct) die("Couldn't read your account id from `wrangler whoami`. Set account_id in wrangler.jsonc and re-run.");
wj = wj.split("<your-cloudflare-account-id>").join(acct);
writeFileSync(WRANGLER, wj);
const workerName = derivedName;
log(`Bot @${bot.username} ("${bot.first_name}") → worker "${workerName}", account ${acct}, lang ${botLang}, tz ${botTz}`);
if (!adminUser) console.log("  (no admin set — add ADMIN_USERNAMES to wrangler.jsonc `vars` later for /admin.)");
if (botTz !== "UTC") console.log(`  (BOT_TZ=${botTz}; the daily-summary cron stays "0 8 * * *" UTC — adjust crons in wrangler.jsonc if you enable daily_summary.)`);

// 3) engine checkout + install (stages THIS pack via PERSONA_PACK) ------------
if (!existsSync(ENGINE_DIR)) { log("Cloning the engine into ./.engine"); sh(`git clone --depth 1 ${ENGINE_REPO} "${ENGINE_DIR}"`); }
else { log("Updating ./.engine"); try { sh(`git -C "${ENGINE_DIR}" pull --ff-only`); } catch { /* detached/dirty — fine */ } }
log("Installing engine deps + staging this pack (PERSONA_PACK)");
sh("npm ci", { cwd: ENGINE_DIR, env: { ...process.env, PERSONA_PACK: PACK_DIR } });

// 4) provision resources, write ids into wrangler.jsonc (idempotent via placeholders) -----------------
const ragOn = /"ENABLE_RAG":\s*"(?:true|1|yes|on)"/i.test(wj);
const dbName = (firstMatch(wj, /"database_name":\s*"([^"]+)"/) || "").replace(/^<.*>$/, "") || `${workerName}-db`;
const vecName = (firstMatch(wj, /"index_name":\s*"([^"]+)"/) || "").replace(/^<.*>$/, "") || `${workerName}-memory`;

if (wj.includes("<your-d1-database-id>")) {
  log(`Creating D1 database "${dbName}"`);
  let out = safe(`npx wrangler d1 create ${dbName}`);
  let id = firstMatch(out, /["']?database_id["']?\s*[:=]\s*["']?([0-9a-fA-F-]{36})/);
  if (!id) { id = firstMatch(safe(`npx wrangler d1 info ${dbName}`), /([0-9a-fA-F-]{36})/); } // already exists → look it up
  if (!id) die(`Couldn't get the D1 id. Run \`npx wrangler d1 create ${dbName}\` yourself and paste database_id into wrangler.jsonc.`);
  wj = wj.replace("<your-db-name>", dbName).replace("<your-d1-database-id>", id);
  writeFileSync(WRANGLER, wj);
}
if (wj.includes("<your-kv-namespace-id>")) {
  log("Creating KV namespace (binding KV)");
  const out = safe(`npx wrangler kv namespace create KV`);
  const id = firstMatch(out, /["']?\bid["']?\s*[:=]\s*["']?([0-9a-fA-F]{32})/);
  if (!id) die("Couldn't get the KV id. Run `npx wrangler kv namespace create KV` yourself and paste id into wrangler.jsonc.");
  wj = wj.replace("<your-kv-namespace-id>", id);
  writeFileSync(WRANGLER, wj);
}
if (wj.includes("<your-vectorize-index>")) {
  // The template always has a VECTORIZE binding, so the index MUST exist or `wrangler deploy` rejects it —
  // create it even when RAG is off (it just stays empty until you enable RAG). `ragOn` only gates recall.
  log(`Creating Vectorize index "${vecName}"`);
  const vout = safe(`npx wrangler vectorize create ${vecName} --dimensions=1024 --metric=cosine`);
  if (AUTH_ERR.test(vout) && !/already exists/i.test(vout)) {
    die(`Vectorize create failed (auth/scope) — your token needs Vectorize:Edit. Last output:\n${vout.slice(-400)}`);
  }
  wj = wj.replace("<your-vectorize-index>", vecName);
  writeFileSync(WRANGLER, wj);
}

// 5) push config into the engine + set secrets --------------------------------
copyFileSync(WRANGLER, join(ENGINE_DIR, "wrangler.jsonc"));
log("Setting worker secrets from .dev.vars");
for (const k of ["TELEGRAM_BOT_TOKEN", "OPENROUTER_API_KEY", "OPENROUTER_PROVISIONING_KEY", "TELEGRAM_WEBHOOK_SECRET"]) {
  if (!env[k]) continue;
  const r = spawnSync("npx", ["wrangler", "secret", "put", k], { cwd: ENGINE_DIR, input: env[k] + "\n", stdio: ["pipe", "inherit", "inherit"], shell: true });
  if (r.status !== 0) die(`Failed to set secret ${k}.`);
}

// 6) migrations → deploy → webhook -------------------------------------------
log(`Applying D1 migrations to "${dbName}"`);
sh(`npx wrangler d1 migrations apply ${dbName} --remote`, { cwd: ENGINE_DIR });

log("Deploying the worker");
let dep;
try { dep = cap("npx wrangler deploy", { cwd: ENGINE_DIR }); }
catch (e) { die(`Deploy failed:\n${(String(e.stdout || "") + String(e.stderr || "")).slice(-900)}\nFix the issue above and re-run \`npm run setup\`.`); }
process.stdout.write(dep);
const url = firstMatch(dep, /(https:\/\/[^\s]+\.workers\.dev)/);
if (!url) die("Deployed, but couldn't read the worker URL. Run `node setWebhook.mjs https://<your-worker-url>` manually.");

log(`Registering the Telegram webhook → ${url}`);
sh(`node "${join(HERE, "setWebhook.mjs")}" ${url}`, {
  env: { ...process.env, TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, ...(env.TELEGRAM_WEBHOOK_SECRET ? { TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET } : {}) },
});

console.log("\n✅ Done. Open Telegram and message your bot. Re-run `npm run setup` any time to redeploy.");
