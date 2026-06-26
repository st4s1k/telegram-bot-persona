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

// 2) wrangler.jsonc sanity + auth ---------------------------------------------
let wj = readFileSync(WRANGLER, "utf8");
const workerName = firstMatch(wj, /"name":\s*"([^"]+)"/);
if (!workerName || workerName.startsWith("<")) die('Set "name" in wrangler.jsonc to your Worker name (lowercase, e.g. "my-bot").');

if (wj.includes("<your-cloudflare-account-id>")) {
  // Try to fill account_id from `wrangler whoami`; if ambiguous, ask the user to paste it.
  let who = ""; try { who = cap("npx wrangler whoami"); } catch { die("Not authenticated. Run `npx wrangler login` (or export CLOUDFLARE_API_TOKEN) and re-run."); }
  const acct = firstMatch(who, /([0-9a-f]{32})/i);
  if (!acct) die("Couldn't read your account id from `wrangler whoami`. Put it into wrangler.jsonc (account_id) and re-run.");
  wj = wj.replace("<your-cloudflare-account-id>", acct);
  writeFileSync(WRANGLER, wj);
  log(`account_id set to ${acct}`);
} else {
  try { cap("npx wrangler whoami"); } catch { die("Not authenticated. Run `npx wrangler login` (or export CLOUDFLARE_API_TOKEN) and re-run."); }
}

// 3) engine checkout + install (stages THIS pack via PERSONA_PACK) ------------
if (!existsSync(ENGINE_DIR)) { log("Cloning the engine into ./.engine"); sh(`git clone --depth 1 ${ENGINE_REPO} "${ENGINE_DIR}"`); }
else { log("Updating ./.engine"); try { sh(`git -C "${ENGINE_DIR}" pull --ff-only`); } catch { /* detached/dirty — fine */ } }
log("Installing engine deps + staging this pack (PERSONA_PACK)");
sh("npm ci", { cwd: ENGINE_DIR, env: { ...process.env, PERSONA_PACK: PACK_DIR } });

// 4) provision resources, write ids into wrangler.jsonc (idempotent via placeholders) -----------------
const ragOn = /"ENABLE_RAG":\s*"(?:true|1|yes|on)"/i.test(wj);
const dbName = (firstMatch(wj, /"database_name":\s*"([^"]+)"/) || "").replace(/^<.*>$/, "") || `${workerName}-db`;
const vecName = (firstMatch(wj, /"index_name":\s*"([^"]+)"/) || "").replace(/^<.*>$/, "") || `${workerName}-memory`;

function safe(cmd) { try { return cap(cmd); } catch (e) { return String(e.stdout || "") + String(e.message || ""); } }

if (wj.includes("<your-d1-database-id>")) {
  log(`Creating D1 database "${dbName}"`);
  let out = safe(`npx wrangler d1 create ${dbName}`);
  let id = firstMatch(out, /database_id\s*[=:]\s*"?([0-9a-fA-F-]{36})/);
  if (!id) { id = firstMatch(safe(`npx wrangler d1 info ${dbName}`), /([0-9a-fA-F-]{36})/); } // already exists → look it up
  if (!id) die(`Couldn't get the D1 id. Run \`npx wrangler d1 create ${dbName}\` yourself and paste database_id into wrangler.jsonc.`);
  wj = wj.replace("<your-db-name>", dbName).replace("<your-d1-database-id>", id);
  writeFileSync(WRANGLER, wj);
}
if (wj.includes("<your-kv-namespace-id>")) {
  log("Creating KV namespace (binding KV)");
  const out = safe(`npx wrangler kv namespace create KV`);
  const id = firstMatch(out, /id\s*[=:]\s*"?([0-9a-fA-F]{32})/);
  if (!id) die("Couldn't get the KV id. Run `npx wrangler kv namespace create KV` yourself and paste id into wrangler.jsonc.");
  wj = wj.replace("<your-kv-namespace-id>", id);
  writeFileSync(WRANGLER, wj);
}
if (wj.includes("<your-vectorize-index>")) {
  if (ragOn) { log(`Creating Vectorize index "${vecName}" (RAG is on)`); safe(`npx wrangler vectorize create ${vecName} --dimensions=1024 --metric=cosine`); }
  wj = wj.replace("<your-vectorize-index>", vecName); // keep the binding valid even with RAG off (create later when you enable it)
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
const dep = cap("npx wrangler deploy", { cwd: ENGINE_DIR });
process.stdout.write(dep);
const url = firstMatch(dep, /(https:\/\/[^\s]+\.workers\.dev)/);
if (!url) die("Deployed, but couldn't read the worker URL. Run `node setWebhook.mjs https://<your-worker-url>` manually.");

log(`Registering the Telegram webhook → ${url}`);
sh(`node "${join(HERE, "setWebhook.mjs")}" ${url}`, {
  env: { ...process.env, TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, ...(env.TELEGRAM_WEBHOOK_SECRET ? { TELEGRAM_WEBHOOK_SECRET: env.TELEGRAM_WEBHOOK_SECRET } : {}) },
});

console.log("\n✅ Done. Open Telegram and message your bot. Re-run `npm run setup` any time to redeploy.");
