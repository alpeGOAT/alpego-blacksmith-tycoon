const { test } = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game');
const { weapons, blankPlan, createGame, finishDay, validate, validSave, migrateSave, totalStock } = game;
function emptyPlan() { const p = blankPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 0; }); p.advertising = 0; return p; }
test('opening satisfaction multiplies demand before rounding with bounded inventory and accounting', () => {
  const initial = { ...createGame(() => .5), stock: game.stockOf(100) };
  const seed = initial.seed * 16807 % 2147483647;
  const variation = .85 + seed / 2147483647 * .3;
  const scores = [0, 25, 50, 70, 75, 100];
  const totals = [];
  for (const score of scores) {
    const next = finishDay({ ...initial, satisfaction: score }, emptyPlan());
    const report = next.history[0];
    assert.equal(game.satisfactionMultiplier(score), 1 + (score - 50) * .006);
    for (const [i, w] of weapons.entries()) {
      const item = report.items[i];
      assert.equal(item.demand, Math.round(w.demand * variation * (1 + (score - 50) * .006)));
      assert.equal(item.sold, item.demand);
      assert.equal(item.stock, 100 - item.sold);
    }
    assert.equal(next.cash, 100 + report.revenue);
    totals.push(report.sold);
  }
  assert.ok(totals.every((n, i) => i === 0 || n >= totals[i - 1]));
  assert.ok(totals.at(-1) > totals[0]);
});
test('evening satisfaction affects the following turn and old reports remain unchanged', () => {
  const day1 = finishDay(createGame(() => .5), emptyPlan());
  const oldReport = structuredClone(day1.history[0]);
  assert.equal(day1.satisfaction, 66);
  const plan = emptyPlan();
  for (const w of weapons) plan.weapons[w.id].quantity = 1;
  const day2 = finishDay(day1, plan);
  const variation = .85 + day2.seed / 2147483647 * .3;
  for (const [i, w] of weapons.entries()) {
    assert.equal(day2.history[1].items[i].demand,
      Math.round(w.demand * game.markets[day1.market].factor * variation * 1.096));
    assert.equal(day2.history[1].items[i].sold, 1);
  }
  assert.deepEqual(day2.history[0], oldReport);
  assert.ok(validSave(day2));
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(day2))), day2);
});
test('catalog descends sword > axe > spear > dagger and all four can sell on day one', () => {
  assert.deepEqual(weapons.map(w => w.id), ['sword', 'axe', 'spear', 'dagger']);
  assert.deepEqual(weapons.map(w => w.price), [30,22,16,10]);
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 1; });
  const s = finishDay(createGame(() => .5), p), r = s.history[0];
  assert.equal(r.sold, 4); assert.equal(r.revenue, 78); assert.equal(r.craftingCost, 35); assert.equal(s.cash, 143);
  assert.ok(validSave(s));
});
test('separate inventory, price and crafting costs reconcile through a mixed 30-day game', () => {
  let s = createGame(() => .5);
  for (let day = 1; day <= 30; day++) {
    const before = s, p = emptyPlan();
    for (const w of weapons) p.weapons[w.id].quantity = Math.min(3, Math.floor(s.cash / 40));
    s = finishDay(s, p); const r = s.history.at(-1);
    assert.equal(r.day, day); assert.equal(s.cash, before.cash + r.revenue - r.expenses);
    assert.equal(totalStock(s.stock), totalStock(before.stock) + r.quantity - r.sold);
    assert.ok(validSave(s));
    for (const item of r.items) assert.equal(s.stock[item.weapon], before.stock[item.weapon] + item.quantity - item.sold);
  }
  assert.throws(() => finishDay(s, emptyPlan()), /complete/);
});
test('capacity applies across the whole batch, affordability uses each weapon cost, invalid values fail', () => {
  const s = createGame(), p = emptyPlan(), snapshot = JSON.stringify(s);
  p.weapons.sword.quantity = 8; assert.match(validate(s,p), /exceeds/);
  p.weapons.sword.quantity = 0; p.weapons.dagger.quantity = 10; p.weapons.axe.quantity = 11;
  assert.match(validate({ ...s, cash: 10000 }, p), /20 weapons/);
  p.weapons.axe.quantity = .1; assert.match(validate(s,p), /whole numbers/);
  p.weapons.axe.quantity = 0; p.weapons.spear.price = 101; assert.match(validate(s,p), /spear price/);
  p.weapons.spear.price = NaN; assert.match(validate(s,p), /whole numbers/);
  assert.equal(JSON.stringify(s), snapshot);
});
test('unsold stock remains per weapon and can be sold without crafting or spending', () => {
  const p = emptyPlan(); p.weapons.dagger.quantity = 20; p.weapons.dagger.price = 100; p.advertising = 20;
  let s = finishDay(createGame(() => .5), p);
  assert.equal(s.cash, 0); assert.equal(s.stock.dagger, 20);
  const next = emptyPlan(); next.weapons.dagger.price = 1;
  s = finishDay(s, next); assert.equal(s.stock.dagger, 0); assert.equal(s.cash, 20);
  assert.equal(s.history[1].items.find(i=>i.weapon === 'sword').sold, 0);
  assert.ok(validSave(s));
});
test('prices and advertising independently affect each weapon demand', () => {
  const s = { ...createGame(() => .5), cash: 1000, stock: game.stockOf(100) };
  for (const w of weapons) {
    const p = emptyPlan(), sales = plan => finishDay(s,plan).history[0].items.find(i=>i.weapon === w.id).sold;
    const normal = sales(p); p.weapons[w.id].price = Math.floor(w.price/2); assert.ok(sales(p)>normal);
    p.weapons[w.id].price = w.price; p.advertising = 25; assert.ok(sales(p)>normal);
  }
});
test('legacy saves migrate without replaying sales, erasing history, or changing cash', () => {
  const old = { version: 1, cash: 20, stock: 20, seed: 42, market: 2, history: [{ day: 1, quantity: 20, price: 100, advertising: 0, sold: 0, revenue: 0, expenses: 80, profit: -80, cash: 20, stock: 20, market: 0 }] };
  const snapshot = JSON.stringify(old), s = migrateSave(old);
  assert.equal(s.cash, old.cash); assert.equal(s.stock.dagger, old.stock); assert.equal(s.stock.sword, 0);
  assert.equal(s.history[0].profit, old.history[0].profit); assert.equal(s.seed, old.seed);
  assert.ok(validSave(s)); assert.equal(JSON.stringify(old), snapshot);
  assert.ok(validSave(finishDay(s, emptyPlan())));
  assert.equal(migrateSave({ ...old, cash: -1 }), null);
});
test('save validation rejects inconsistent inventory, missing weapons and forged accounting', () => {
  const s = finishDay(createGame(), blankPlan());
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  assert.equal(validSave({ ...s, stock: { ...s.stock, axe: 1 } }), false);
  const bad = structuredClone(s); bad.history[0].items[0].weapon = 'dagger'; assert.equal(validSave(bad), false);
  const badCash = structuredClone(s); badCash.history[0].cash++; assert.equal(validSave(badCash), false);
  assert.equal(migrateSave(null), null);
  assert.equal(migrateSave({ version: 1, stock: 0, history: [null] }), null);
});

test('satisfaction starts at 70 and rewards fair prices and fully met demand', () => {
  const state = { ...createGame(() => .5), stock: game.stockOf(100) };
  const snapshot = structuredClone(state);
  const next = finishDay(state, emptyPlan()), report = next.history[0];
  assert.equal(state.satisfaction, 70);
  assert.equal(next.satisfaction, 74);
  assert.equal(report.satisfaction.priceEffect, 0);
  assert.equal(report.satisfaction.inventoryEffect, 4);
  assert.equal(report.satisfaction.unmetDemand, 0);
  assert.deepEqual(state, snapshot);
});
test('discounts improve satisfaction and overpriced stocked weapons hurt', () => {
  const state = { ...createGame(() => .5), stock: game.stockOf(1000) };
  const cheap = emptyPlan(), expensive = emptyPlan();
  weapons.forEach(w => { cheap.weapons[w.id].price = Math.ceil(w.price / 2); expensive.weapons[w.id].price = w.price * 2; });
  const discounted = finishDay(state, cheap).history[0].satisfaction;
  const overpriced = finishDay(state, expensive).history[0].satisfaction;
  assert.equal(discounted.priceEffect, 3);
  assert.equal(discounted.inventoryEffect, 4);
  assert.equal(overpriced.priceEffect, -6);
  assert.ok(overpriced.change < 0);
});
test('only stocked weapons affect price and inventory satisfaction', () => {
  const next = finishDay(createGame(() => .5), emptyPlan()), r = next.history[0];
  assert.equal(r.satisfaction.unmetDemand, 0);
  assert.equal(r.satisfaction.inventoryEffect, -4);
  assert.equal(next.satisfaction, 66);
  const mixed = { ...createGame(() => .5), stock: { ...game.stockOf(), dagger: 100 } };
  const plan = emptyPlan();
  const normal = finishDay(mixed, plan).history[0];
  plan.weapons.sword.price = 1;
  plan.weapons.axe.price = 100;
  const changed = finishDay(mixed, plan).history[0];
  assert.deepEqual(changed.satisfaction, normal.satisfaction);
  assert.equal(normal.satisfaction.unmetDemand, 0);
  assert.equal(normal.satisfaction.inventoryEffect, 4);
  assert.equal(normal.satisfaction.demand, normal.items.find(i => i.weapon === 'dagger').demand);
  const short = finishDay({ ...mixed, stock: { ...mixed.stock, dagger: 1 } }, plan).history[0];
  assert.ok(short.satisfaction.inventoryEffect < 0);
  assert.equal(short.satisfaction.unmetDemand, short.satisfaction.demand - 1);
});
test('carryover stock satisfies demand without crafting and zero demand has no inventory effect', () => {
  const state = { ...createGame(() => .5), stock: game.stockOf(100) };
  const report = finishDay(state, emptyPlan()).history[0];
  assert.equal(report.quantity, 0); assert.equal(report.satisfaction.inventoryEffect, 4);
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].price = 100; });
  const quiet = finishDay(state, p).history[0].satisfaction;
  assert.equal(quiet.demand, 0); assert.equal(quiet.inventoryEffect, 0);
  assert.ok(Number.isFinite(quiet.score)); assert.ok(quiet.priceEffect < 0);
});
test('score stays within 0–100 and reports the actual bounded change', () => {
  const happy = finishDay({ ...createGame(() => .5), satisfaction: 99, stock: game.stockOf(100) }, emptyPlan());
  assert.equal(happy.satisfaction, 100); assert.equal(happy.history[0].satisfaction.change, 1);
  const unhappy = finishDay({ ...createGame(() => .5), satisfaction: 1 }, emptyPlan());
  assert.equal(unhappy.satisfaction, 0); assert.equal(unhappy.history[0].satisfaction.change, -1);
});
test('version-2 saves migrate without rewriting history or inventing demand and remain playable', () => {
  const old = structuredClone(finishDay(createGame(() => .5), blankPlan()));
  old.version = 2; delete old.satisfaction;
  old.history.forEach(r => { delete r.satisfaction; r.items.forEach(item => delete item.demand); });
  const snapshot = structuredClone(old), migrated = migrateSave(old);
  assert.equal(migrated.satisfaction, 70); assert.equal(migrated.history[0].satisfaction, null);
  assert.equal(migrated.cash, old.cash); assert.equal(migrated.seed, old.seed);
  assert.deepEqual(migrated.stock, old.stock); assert.deepEqual(old, snapshot);
  assert.ok(migrated.history[0].items.every(item => item.demand === null));
  assert.ok(validSave(migrated));
  const next = finishDay(migrated, emptyPlan());
  assert.equal(next.history[1].satisfaction.before, 70); assert.ok(validSave(next));
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(next))), next);
});
test('save validation rejects forged scores, effects, missing demand and broken score continuity', () => {
  const state = finishDay(finishDay(createGame(() => .5), blankPlan()), emptyPlan());
  assert.ok(validSave(state));
  for (const change of [s => s.satisfaction++, s => s.history[0].satisfaction.priceEffect++,
    s => s.history[1].satisfaction.before++, s => delete s.history[0].items[0].demand,
    s => s.history[0].items[0].demand = -1, s => s.history[1].satisfaction = null]) {
    const forged = structuredClone(state); change(forged);
    assert.equal(validSave(forged), false); assert.equal(migrateSave(forged), null);
  }
});

test('upgrade purchases charge per level, preserve satisfaction, and cannot overdraw cash or buy after day 30', () => {
  const before = createGame(() => .5), snapshot = structuredClone(before);
  const bought = game.purchaseUpgrade(before, 'anvil');
  assert.equal(bought.cash, 50); assert.equal(bought.satisfaction, 70);
  assert.ok(validSave(bought)); assert.deepEqual(before, snapshot);
  const second = game.purchaseUpgrade(bought, 'anvil');
  assert.equal(second.cash, 0); assert.equal(game.effects(second).craftDiscount, 2);
  assert.ok(validSave(second));
  assert.throws(() => game.purchaseUpgrade(second, 'anvil'), /more gold/);
  assert.throws(() => game.purchaseUpgrade(bought, 'forge'), /more gold/);
  assert.throws(() => game.purchaseUpgrade(bought, 'unknown'), /Unknown/);
  assert.throws(() => game.purchaseUpgrade({ ...before, history: Array(30) }, 'anvil'), /complete/);
  const empty = game.purchaseUpgrade(bought, 'advertising');
  assert.equal(empty.cash, 0); assert.ok(validSave(empty));
  assert.match(validate(empty, emptyPlan()), /bankrupt/);
  assert.throws(() => finishDay(empty, emptyPlan()), /bankrupt/);
  assert.equal(game.isBankrupt({ ...empty, cash: 2 }), true);
  assert.equal(game.isBankrupt({ ...empty, cash: 3 }), false);
  assert.equal(game.isBankrupt({ ...empty, stock: { ...empty.stock, dagger: 1 } }), false);
});

test('an older satisfaction report stays valid after the new rules take effect', () => {
  const old = finishDay(createGame(() => .5), emptyPlan());
  const report = old.history[0];
  // Historic days estimated demand even for empty shelves.
  report.items.forEach((item, i) => { item.demand = weapons[i].demand; });
  const demand = report.items.reduce((sum, item) => sum + item.demand, 0);
  report.satisfaction = { before: 70, priceEffect: 0, inventoryEffect: -12, demand, unmetDemand: demand, score: 58, change: -12 };
  old.satisfaction = 58;
  const restored = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(restored, old);
  const next = finishDay(restored, blankPlan());
  assert.equal(next.history[1].satisfaction.model, 'offered-stock');
  assert.deepEqual(next.history[0], report);
  assert.ok(validSave(next));
});

test('three anvil levels persist, charge 50 each, preserve history and stop at maximum', () => {
  let state = createGame(() => .5);
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 1; });
  const costs = [[13, 9, 6, 3], [12, 8, 5, 2], [11, 7, 4, 1]];
  for (let level = 1; level <= 3; level++) {
    const before = structuredClone(state);
    state = game.purchaseUpgrade(state, 'anvil');
    assert.equal(state.cash, before.cash - 50);
    assert.equal(game.effects(state).craftDiscount, level);
    assert.deepEqual(weapons.map(w => game.unitCost(state, w)), costs[level - 1]);
    assert.deepEqual(state.history, before.history);
    state = finishDay(state, p);
    assert.deepEqual(state.history.at(-1).items.map(i => i.unitCost), costs[level - 1]);
    assert.ok(validSave(state));
    assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(state))), state);
  }
  const snapshot = structuredClone(state);
  assert.throws(() => game.purchaseUpgrade(state, 'anvil'), /maximum level/);
  assert.deepEqual(state, snapshot);
  const fourth = structuredClone(state);
  fourth.purchases.push({ id: 'anvil', cost: 50, afterDay: 3 });
  fourth.upgrades.push('anvil'); fourth.cash -= 50;
  assert.equal(validSave(fourth), false);
  const old = migrateSave({ version: 2, cash: 50, stock: 0, seed: 42, market: 0, history: [], upgrades: ['anvil'], purchases: [{ id: 'anvil', cost: 50, afterDay: 0 }] });
  assert.equal(game.effects(old).craftDiscount, 1);
  assert.equal(game.effects(game.purchaseUpgrade(old, 'anvil')).craftDiscount, 2);
});

test('anvil discounts all four weapons and historical expenses never change', () => {
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 1; });
  const day1 = finishDay(createGame(() => .5), p), historical = structuredClone(day1.history[0]);
  const upgraded = game.purchaseUpgrade(day1, 'anvil');
  assert.equal(game.planCost(p, upgraded), 31);
  const day2 = finishDay(upgraded, p);
  assert.deepEqual(day2.history[0], historical);
  assert.deepEqual(day2.history[1].items.map(i => i.unitCost), [13,9,6,3]);
  assert.equal(day2.history[1].craftingCost, 31);
  assert.equal(day2.cash, day1.cash - 50 + day2.history[1].profit);
  assert.ok(validSave(day2));
});

test('forge starts at level 1 and enforces 20, 40 and 60 shared capacity', () => {
  let state = createGame(() => .5);
  const earn = emptyPlan(); weapons.forEach(w => { earn.weapons[w.id].quantity = 2; });
  state = finishDay(state, earn);
  for (let level = 1; level <= 3; level++) {
    if (level > 1) {
      const cash = state.cash;
      state = game.purchaseUpgrade(state, 'forge');
      assert.equal(state.cash, cash - 75);
    }
    assert.equal(game.upgradeLevel(state, 'forge'), level);
    assert.equal(game.effects(state).capacity, level * 20);
    const batch = emptyPlan(); batch.weapons.dagger.quantity = level * 20;
    assert.equal(validate({ ...state, cash: 10000 }, batch), '');
    batch.weapons.sword.quantity = 1;
    assert.match(validate({ ...state, cash: 10000 }, batch), /total each day|total each/);
    assert.ok(validSave(state));
    assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(state))), state);
    state = finishDay(state, earn);
  }
  assert.throws(() => game.purchaseUpgrade(state, 'forge'), /maximum level/);
});

test('version-4 forge saves retain old capacity, investments and historical batches', () => {
  for (const bought of [false, true]) {
    let old = { ...createGame(() => .5), version: 4 };
    delete old.forgeBaseLevel;
    if (bought) old = game.purchaseUpgrade(old, 'forge');
    const p = emptyPlan(); p.weapons.dagger.quantity = bought ? 6 : 25;
    old = finishDay(old, p);
    const snapshot = structuredClone(old), migrated = migrateSave(old);
    assert.equal(migrated.version, 5);
    assert.equal(game.effects(migrated).capacity, bought ? 60 : 40);
    assert.deepEqual(migrated.history, old.history);
    assert.deepEqual(migrated.purchases, old.purchases);
    assert.equal(migrated.cash, old.cash);
    assert.ok(validSave(migrated));
    assert.deepEqual(old, snapshot);
  }
});

test('forge capacity is shared across weapons and paid advertising has no free zero-spend boost', () => {
  const rich = { ...createGame(() => .5), cash: 10000 }, p = emptyPlan();
  p.weapons.sword.quantity = 30; p.weapons.axe.quantity = 30;
  assert.match(validate(rich, p), /20 weapons/);
  const upgraded = game.purchaseUpgrade(game.purchaseUpgrade(rich, 'forge'), 'forge');
  assert.equal(validate(upgraded, p), '');
  p.weapons.dagger.quantity = 1; assert.match(validate(upgraded, p), /60 weapons/);
  const stocked = { ...rich, stock: { ...rich.stock, dagger: 100 } };
  const ads = game.purchaseUpgrade(stocked, 'advertising');
  const daggerDemand = (state, plan) => finishDay(state, plan).history[0].items.find(i => i.weapon === 'dagger').demand;
  assert.equal(daggerDemand(ads, emptyPlan()), daggerDemand(stocked, emptyPlan()));
  const paid = emptyPlan(); paid.advertising = 16;
  assert.ok(daggerDemand(ads, paid) > daggerDemand(stocked, paid));
});

test('a busy day shares at most 60 orders among stocked weapon lines', () => {
  const state = { ...createGame(() => .5), market: 3, cash: 10000, stock: { ...game.stockOf(), sword: 80, dagger: 80 } };
  const plan = emptyPlan(); plan.advertising = 1000;
  plan.weapons.axe.price = 1;
  plan.weapons.spear.price = 1;
  const report = finishDay(state, plan).history[0];
  const demand = Object.fromEntries(report.items.map(item => [item.weapon, item.demand]));
  assert.deepEqual(demand, { sword: 18, axe: 0, spear: 0, dagger: 42 });
  assert.equal(report.sold, 60);
  assert.equal(report.satisfaction.demand, 60);
  assert.equal(report.satisfaction.unmetDemand, 0);
  const scarce = finishDay({ ...state, stock: { ...state.stock, sword: 5 } }, plan).history[0];
  assert.equal(scarce.sold, 47);
  assert.equal(scarce.satisfaction.unmetDemand, 13);
});

test('vise increases demand for every weapon while retaining the satisfaction price calculation', () => {
  const rich = { ...createGame(() => .5), cash: 10000, stock: game.stockOf(1000) }, p = emptyPlan();
  weapons.forEach(w => { p.weapons[w.id].price = w.price + 2; });
  const plain = finishDay(rich, p).history[0];
  const vise = finishDay(game.purchaseUpgrade(rich, 'vise'), p).history[0];
  vise.items.forEach((item, i) => assert.ok(item.demand >= plain.items[i].demand));
  assert.ok(vise.items.some((item, i) => item.demand > plain.items[i].demand));
  assert.equal(vise.satisfaction.priceEffect, plain.satisfaction.priceEffect);
  assert.equal(vise.satisfaction.inventoryEffect, 4);
});

test('all upgrades, satisfaction, and investment accounting reconcile through 30 mixed-weapon days', () => {
  let s = createGame(() => .5), totalProfit = 0;
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 2; });
  for (let day = 1; day <= 30; day++) {
    if (day === 6) for (const u of game.upgrades) s = game.purchaseUpgrade(s, u.id);
    s = finishDay(s, p); totalProfit += s.history.at(-1).profit;
    assert.ok(validSave(s), `day ${day}`);
    assert.equal(s.cash, 100 + totalProfit - s.purchases.reduce((n, u) => n + u.cost, 0));
    assert.ok(s.satisfaction >= 0 && s.satisfaction <= 100);
  }
  assert.equal(s.upgrades.length, 4); assert.equal(s.purchases.length, 4);
  assert.throws(() => finishDay(s, p), /complete/);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))), s);
});

test('version-3 cloud saves retain satisfaction and every ledger result when upgraded', () => {
  const old = structuredClone(finishDay(createGame(() => .5), blankPlan()));
  old.version = 3; delete old.upgrades; delete old.purchases;
  old.history.forEach(r => r.items.forEach(item => delete item.unitCost));
  const snapshot = structuredClone(old), migrated = migrateSave(old);
  assert.ok(validSave(migrated)); assert.equal(migrated.version, 5);
  assert.equal(migrated.satisfaction, old.satisfaction);
  assert.deepEqual(migrated.history[0].satisfaction, old.history[0].satisfaction);
  assert.equal(migrated.cash, old.cash); assert.deepEqual(migrated.stock, old.stock);
  assert.deepEqual(old, snapshot);
  assert.ok(validSave(finishDay(game.purchaseUpgrade(migrated, 'anvil'), emptyPlan())));
});

test('dagger-only upgrade branch saves retain purchases and original discounted expenses', () => {
  const old = { version: 2, cash: 120, stock: 0, seed: 42, market: 2, upgrades: ['anvil'], purchases: [{ id: 'anvil', cost: 50, afterDay: 0 }], history: [{ day: 1, quantity: 10, price: 10, unitCost: 3, advertising: 0, sold: 10, stock: 0, revenue: 100, expenses: 30, profit: 70, cash: 120, market: 0 }] };
  const snapshot = structuredClone(old), migrated = migrateSave(old);
  assert.ok(validSave(migrated)); assert.equal(migrated.cash, 120);
  assert.deepEqual(migrated.purchases, old.purchases);
  assert.equal(migrated.history[0].items[3].unitCost, 3);
  assert.equal(migrated.history[0].satisfaction, null);
  assert.ok(validSave(finishDay(migrated, blankPlan())));
  assert.deepEqual(old, snapshot);
});

test('save validation rejects invalid, duplicate, reordered, and unaffordable investments', () => {
  const s = finishDay(game.purchaseUpgrade(createGame(() => .5), 'anvil'), blankPlan());
  for (const change of [
    v => v.purchases[0].cost--, v => v.purchases[0].afterDay = 2,
    v => v.purchases.push({ ...v.purchases[0] }), v => v.upgrades.push('forge'),
    v => v.history[0].items[0].unitCost++, v => v.history[0].items[3].craftingCost++,
    v => { v.purchases[0] = { id: 'forge', cost: 75, afterDay: 0 }; v.purchases.push({ id: 'vise', cost: 65, afterDay: 0 }); }
  ]) { const bad = structuredClone(s); change(bad); assert.equal(validSave(bad), false); assert.equal(migrateSave(bad), null); }
});
