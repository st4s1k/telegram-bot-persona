// Demo persona tests. They run inside the engine tree (staged next to the engine's tests by the dev or
// CI) and reach the engine internals through the harness, which re-exports the engine barrel. This shows
// how to test a pack: config defaults, /help + /config rendering, command handlers, persona-state, hooks.
import * as H from "./harness.mjs";
const {
  test, describe, assert,
  getGlobalConfig, buildConfigHelp, buildHelp, buildInfoStatus,
  parseCommandAndArg, CONFIG_GROUPS, COMMANDS, DEFAULT_CHAT_DATA, t,
  makeEnv, makeMsg, makeCtxFor,
} = H;

describe("demo persona · config", () => {
  test("defaults: switches on; probs + dice_max from env", () => {
    const cfg = getGlobalConfig(makeEnv({ DEMO_GREET_PROB: "0.7", DEMO_FACTOID_PROB: "0.2", DEMO_DICE_MAX: "20" }));
    assert.equal(cfg.greet_back, true);
    assert.equal(cfg.yesno, true);
    assert.equal(cfg.factoid, true);
    assert.equal(cfg.greet_prob, 0.7);
    assert.equal(cfg.factoid_prob, 0.2);
    assert.equal(cfg.dice_max, 20);
  });

  test("buildConfigHelp renders the persona groups", () => {
    const cfg = getGlobalConfig(makeEnv());
    const out = buildConfigHelp(cfg, {});
    // Engine group names are locale keys; the persona's are literals. t() resolves both.
    for (const g of Object.keys(CONFIG_GROUPS)) assert.ok(out.includes(t("ru", g)), g);
  });
});

describe("demo persona · help", () => {
  test("buildHelp lists the demo commands", () => {
    const h = buildHelp();
    for (const c of ["/dice", "/energy", "/joke", "/help", "/config"]) assert.ok(h.includes(c), c);
  });
});

describe("demo persona · commands", () => {
  test("parseCommandAndArg recognizes the demo commands + extracts the arg", () => {
    const cfg = getGlobalConfig(makeEnv());
    assert.equal(parseCommandAndArg("/dice 7 7", cfg).type, "dice");
    assert.equal(parseCommandAndArg("/energy 4", cfg).type, "energy");
    assert.equal(parseCommandAndArg("/joke about cats", cfg).type, "joke");
    assert.equal(parseCommandAndArg("/joke about cats", cfg).argText, "about cats");
  });

  test("/dice with min==max is deterministic", async () => {
    const ctx = makeCtxFor(makeMsg({ text: "/dice 7 7" }), makeEnv());
    const out = await COMMANDS.dice(ctx, { argText: "7 7" });
    assert.match(out, /rolls \*\*7\*\*/);
    assert.match(out, /\(7.7\)/); // (7–7), dash-agnostic
  });

  test("/energy sets + shows the level via personaState", async () => {
    const ctx = makeCtxFor(makeMsg({ text: "/energy 4" }), makeEnv());
    const set = await COMMANDS.energy(ctx, { argText: "4" });
    assert.ok(set.includes("4/5"));
    assert.equal(ctx.chatData.personaState.energy, 4); // written into the generic slot
    assert.equal(ctx.chatData._dirty, true);
    const show = await COMMANDS.energy(ctx, { argText: "" });
    assert.ok(show.includes("4/5"));
  });

  test("/energy rejects out-of-range input", async () => {
    const ctx = makeCtxFor(makeMsg({ text: "/energy 9" }), makeEnv());
    assert.match(await COMMANDS.energy(ctx, { argText: "9" }), /0 to 5/);
  });
});

describe("demo persona · state hooks", () => {
  test("buildInfoStatus shows the energy line from the infoLines hook", () => {
    const cd = { ...DEFAULT_CHAT_DATA(), personaState: { energy: 3 } };
    const ctx = makeCtxFor(makeMsg(), makeEnv(), cd);
    const out = buildInfoStatus(ctx);
    assert.ok(out.includes("Energy"));
    assert.ok(out.includes("3/5"));
  });
});
