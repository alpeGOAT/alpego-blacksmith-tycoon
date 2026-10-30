const { test } = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game');
const { weapons, blankPlan, createGame, finishDay, validate, validSave, migrateSave, totalStock } = game;
function emptyPlan() { const p = blankPlan(); weapons.forEach(w => { p.weapons[w.id].quantity = 0; }); p.advertising = 0; return p; }
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
  p.weapons.sword.quantity = 0; p.weapons.dagger.quantity = 20; p.weapons.axe.quantity = 21;
  assert.match(validate({ ...s, cash: 10000 }, p), /40 weapons/);
  p.weapons.axe.quantity = .1; assert.match(validate(s,p), /whole numbers/);
  p.weapons.axe.quantity = 0; p.weapons.spear.price = 101; assert.match(validate(s,p), /spear price/);
  p.weapons.spear.price = NaN; assert.match(validate(s,p), /whole numbers/);
  assert.equal(JSON.stringify(s), snapshot);
});
test('unsold stock remains per weapon and can be sold without crafting or spending', () => {
  const p = emptyPlan(); p.weapons.dagger.quantity = 25; p.weapons.dagger.price = 100;
  let s = finishDay(createGame(() => .5), p);
  assert.equal(s.cash, 0); assert.equal(s.stock.dagger, 25);
  const next = emptyPlan(); next.weapons.dagger.price = 1;
  s = finishDay(s, next); assert.equal(s.stock.dagger, 0); assert.equal(s.cash, 25);
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
test('discounts improve satisfaction and overpriced weapons hurt even with no sales', () => {
  const state = { ...createGame(() => .5), stock: game.stockOf(1000) };
  const cheap = emptyPlan(), expensive = emptyPlan();
  weapons.forEach(w => { cheap.weapons[w.id].price = Math.ceil(w.price / 2); expensive.weapons[w.id].price = w.price * 2; });
  const discounted = finishDay(state, cheap).history[0].satisfaction;
  const overpriced = finishDay({ ...state, stock: game.stockOf() }, expensive).history[0].satisfaction;
  assert.equal(discounted.priceEffect, 3);
  assert.equal(discounted.inventoryEffect, 4);
  assert.equal(overpriced.priceEffect, -6);
  assert.ok(overpriced.change < 0);
});
test('shortages use unmet demand across all weapons, including unstocked lines', () => {
  const next = finishDay(createGame(() => .5), emptyPlan()), r = next.history[0];
  assert.equal(r.satisfaction.unmetDemand, r.items.reduce((n, item) => n + item.demand, 0));
  assert.equal(r.satisfaction.inventoryEffect, -12);
  assert.equal(next.satisfaction, 58);
  const mixed = { ...createGame(() => .5), stock: { ...game.stockOf(), dagger: 100 } };
  const report = finishDay(mixed, emptyPlan()).history[0];
  assert.ok(report.satisfaction.unmetDemand > 0);
  assert.ok(report.satisfaction.unmetDemand < report.satisfaction.demand);
  assert.ok(report.satisfaction.inventoryEffect > -12);
  assert.ok(report.satisfaction.inventoryEffect < 4);
});
test('carryover stock satisfies demand without crafting and zero demand has no inventory effect', () => {
  const state = { ...createGame(() => .5), stock: game.stockOf(100) };
  const report = finishDay(state, emptyPlan()).history[0];
  assert.equal(report.quantity, 0); assert.equal(report.satisfaction.inventoryEffect, 4);
  const p = emptyPlan(); weapons.forEach(w => { p.weapons[w.id].price = 100; });
  const quiet = finishDay(createGame(() => .5), p).history[0].satisfaction;
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
