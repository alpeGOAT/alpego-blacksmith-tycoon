const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, finishDay, validate, validSave } = require('./game');
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
