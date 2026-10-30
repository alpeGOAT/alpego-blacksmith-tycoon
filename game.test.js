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
