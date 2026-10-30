const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, finishDay, validate, validSave, effects, upgrades, purchaseUpgrade, migrateSave } = require('./game');
test('starts with 100 gold and preserves accounting through 30 days', () => {
  let s = createGame(() => .5);
  assert.equal(s.cash, 100);
  for (let day = 1; day <= 30; day++) {
    const before = s;
    s = finishDay(s, { quantity: Math.min(15, Math.floor(s.cash / 4)), price: 10, advertising: 0 });
    const r = s.history.at(-1);
    assert.equal(r.day, day);
    assert.equal(s.cash, before.cash + r.revenue - r.expenses);
    assert.equal(s.stock, before.stock + r.quantity - r.sold);
    assert.ok(s.cash >= 0 && s.stock >= 0);
    assert.ok(validSave(s));
  }
  assert.throws(() => finishDay(s, { quantity: 0, price: 10, advertising: 0 }), /complete/);
});
test('prevents overspending and invalid input without mutating state', () => {
  const s = createGame(), snapshot = JSON.stringify(s);
  for (const p of [{ quantity: 26, price: 10, advertising: 0 }, { quantity: -1, price: 10, advertising: 0 }, { quantity: .5, price: 10, advertising: 0 }, { quantity: 0, price: NaN, advertising: 0 }, { quantity: 0, price: 0, advertising: 0 }, { quantity: 0, price: 10, advertising: -1 }]) assert.ok(validate(s, p));
  assert.equal(JSON.stringify(s), snapshot);
});
test('stock carries over, can sell without crafting, and zero cash can continue', () => {
  let s = finishDay(createGame(() => .5), { quantity: 25, price: 100, advertising: 0 });
  assert.equal(s.stock, 25); assert.equal(s.cash, 0);
  s = finishDay(s, { quantity: 0, price: 1, advertising: 0 });
  assert.equal(s.history.at(-1).sold, 25); assert.equal(s.cash, 25); assert.equal(s.stock, 0);
  s = finishDay(s, { quantity: 0, price: 10, advertising: 0 });
  assert.equal(s.history.at(-1).sold, 0);
});
test('price and advertising influence demand, without selling beyond stock', () => {
  const s = { ...createGame(() => .5), cash: 1000, stock: 200 };
  const sales = (price, advertising) => finishDay(s, { quantity: 0, price, advertising }).history.at(-1).sold;
  assert.ok(sales(6, 0) > sales(15, 0)); assert.ok(sales(10, 25) > sales(10, 0));
  const empty = finishDay(createGame(), { quantity: 0, price: 1, advertising: 100 });
  assert.equal(empty.history.at(-1).sold, 0);
});
test('rejects malformed and inconsistent saved games', () => {
  assert.equal(validSave(null), false);
  assert.equal(validSave({ ...createGame(), cash: -1 }), false);
  const s = finishDay(createGame(), { quantity: 10, price: 10, advertising: 5 });
  assert.ok(validSave(JSON.parse(JSON.stringify(s))));
  s.history[0].cash += 1; assert.equal(validSave(s), false);
});
test('upgrades charge once, cannot overdraw cash, and never mutate the prior state', () => {
  const initial = createGame(), snapshot = JSON.stringify(initial);
  const s = purchaseUpgrade(initial, 'anvil');
  assert.equal(s.cash, 50); assert.equal(s.history.length, 0);
  assert.equal(JSON.stringify(initial), snapshot);
  assert.throws(() => purchaseUpgrade(s, 'anvil'), /already installed/);
  assert.throws(() => purchaseUpgrade(s, 'forge'), /more gold/);
  assert.throws(() => purchaseUpgrade(s, '__proto__'), /Unknown/);
  assert.ok(validSave(s));
  assert.deepEqual(s.purchases, [{ id: 'anvil', cost: 50, afterDay: 0 }]);
});
test('anvil lowers crafting costs and reports preserve historical costs', () => {
  let s = finishDay(createGame(() => .5), { quantity: 10, price: 10, advertising: 0 });
  assert.equal(s.history[0].unitCost, 4);
  s = purchaseUpgrade(s, 'anvil');
  s = finishDay(s, { quantity: 10, price: 10, advertising: 0 });
  assert.equal(s.history[1].expenses, 30);
  assert.equal(s.history[1].unitCost, 3);
  assert.equal(s.history[0].expenses, 40);
  assert.equal(s.cash - 100, s.history.reduce((n, r) => n + r.profit, 0) - 50);
  assert.ok(validSave(s));
});
test('forge raises capacity, vise improves demand, and advertising improves paid reach', () => {
  const base = { ...createGame(() => .5), cash: 1000, stock: 200 };
  const forge = purchaseUpgrade(base, 'forge');
  assert.equal(effects(forge).capacity, 60);
  assert.ok(validate(base, { quantity: 41, price: 10, advertising: 0 }));
  assert.equal(validate(forge, { quantity: 60, price: 10, advertising: 0 }), '');
  assert.ok(validate(forge, { quantity: 61, price: 10, advertising: 0 }));
  const sales = (s, advertising) => finishDay(s, { quantity: 0, price: 10, advertising }).history.at(-1).sold;
  assert.ok(sales(purchaseUpgrade(base, 'vise'), 0) > sales(base, 0));
  assert.ok(sales(purchaseUpgrade(base, 'advertising'), 25) > sales(base, 25));
  assert.equal(sales(purchaseUpgrade(base, 'advertising'), 0), sales(base, 0));
});
test('all upgrades and purchases reconcile through 30 days and prohibit late purchases', () => {
  let s = createGame(() => .5);
  for (let day = 0; day < 30; day++) {
    for (const u of upgrades) if (!s.upgrades.includes(u.id) && s.cash >= u.cost + 30) s = purchaseUpgrade(s, u.id);
    const { unitCost, capacity } = effects(s);
    s = finishDay(s, { quantity: Math.min(capacity, 20, Math.floor(s.cash / unitCost)), price: 10, advertising: 0 });
    assert.ok(validSave(s));
    assert.equal(s.cash - 100, s.history.reduce((n, r) => n + r.profit, 0) - s.purchases.reduce((n, p) => n + p.cost, 0));
  }
  assert.equal(s.upgrades.length, 4);
  assert.throws(() => purchaseUpgrade(s, 'forge'), /complete/);
  const neverUpgraded = { ...s, upgrades: [], purchases: [] };
  assert.throws(() => purchaseUpgrade(neverUpgraded, 'anvil'), /complete/);
});
test('version 1 saves migrate losslessly and inconsistent investment journals are rejected', () => {
  let s = finishDay(createGame(() => .5), { quantity: 10, price: 10, advertising: 5 });
  const legacy = { ...s, version: 1 }; delete legacy.upgrades; delete legacy.purchases;
  legacy.history = legacy.history.map(({ unitCost, ...report }) => report);
  const migrated = migrateSave(legacy);
  assert.equal(migrated.cash, legacy.cash); assert.equal(migrated.stock, legacy.stock);
  assert.equal(migrated.version, 2); assert.equal(migrated.history[0].unitCost, 4);
  assert.deepEqual(migrated.upgrades, []); assert.ok(validSave(migrated));
  assert.equal(migrateSave({ ...legacy, cash: -1 }), null);
  s = purchaseUpgrade(migrated, 'anvil');
  for (const mutate of [
    x => { x.purchases[0].cost = 0; },
    x => { x.purchases[0].afterDay = 30; },
    x => { x.purchases[0].afterDay = -1; },
    x => { x.upgrades = ['forge']; },
    x => { x.purchases.push({ ...x.purchases[0] }); },
    x => { x.purchases = null; },
    x => { x.history[0].unitCost = 3; }
  ]) { const invalid = JSON.parse(JSON.stringify(s)); mutate(invalid); assert.equal(validSave(invalid), false); }
});
