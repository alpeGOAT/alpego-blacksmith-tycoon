(function (root) {
  'use strict';
  const weapons = [
    { id: 'sword', name: 'Sword', plural: 'swords', icon: '⚔', price: 30, cost: 14, demand: 5 },
    { id: 'axe', name: 'Axe', plural: 'axes', icon: '🪓', price: 22, cost: 10, demand: 7 },
    { id: 'spear', name: 'Spear', plural: 'spears', icon: '↟', price: 16, cost: 7, demand: 9 },
    { id: 'dagger', name: 'Dagger', plural: 'daggers', icon: '†', price: 10, cost: 4, demand: 12 }
  ];
  const markets = [
    { title: 'A steady day at the market', copy: 'The town is stirring. A good day to find your rhythm.', factor: 1 },
    { title: 'Caravan in town', copy: 'Travelers need reliable weapons. Expect more customers today.', factor: 1.3 },
    { title: 'Rain over the market', copy: 'Fewer people are out browsing. Keep your stock in mind.', factor: .75 },
    { title: 'The town fair', copy: 'The streets are busy. Your shop could see a little extra traffic.', factor: 1.45 },
    { title: 'A quiet market morning', copy: 'Foot traffic is light. A careful investment could pay off.', factor: .85 }
  ];
  const stockOf = (value = 0) => Object.fromEntries(weapons.map(w => [w.id, value]));
  const totalStock = stock => weapons.reduce((n, w) => n + stock[w.id], 0);
  const blankPlan = () => ({ weapons: Object.fromEntries(weapons.map(w => [w.id, { quantity: w.id === 'dagger' ? 10 : 0, price: w.price }])), advertising: 5 });
  function createGame(random = Math.random) { return { version: 2, cash: 100, stock: stockOf(), history: [], market: 0, seed: Math.floor(random() * 2147483646) + 1 }; }
  function planCost(plan) { return weapons.reduce((n, w) => n + plan.weapons[w.id].quantity * w.cost, 0); }
  function validate(state, plan) {
    if (state.history.length >= 30) return 'Your 30-day journey is complete. Start a new shop to play again.';
    if (!plan || !plan.weapons || !Number.isSafeInteger(plan.advertising)) return 'Use whole numbers for all your decisions.';
    let quantity = 0;
    for (const w of weapons) {
      const item = plan.weapons[w.id];
      if (!item || !Number.isSafeInteger(item.quantity) || !Number.isSafeInteger(item.price)) return 'Use whole numbers for all weapon quantities and prices.';
      if (item.quantity < 0 || item.quantity > 40) return 'Craft between 0 and 40 weapons in total each day.';
      if (item.price < 1 || item.price > 100) return `Set the ${w.name.toLowerCase()} price between 1 and 100 gold.`;
      quantity += item.quantity;
    }
    if (quantity > 40) return 'Your forge can craft 40 weapons in total each day. Reduce your batch.';
    if (plan.advertising < 0 || plan.advertising > 1000) return 'Choose an advertising budget between 0 and 1,000 gold.';
    if (planCost(plan) + plan.advertising > state.cash) return 'That investment exceeds your gold. Craft fewer weapons or lower your ad budget.';
    return '';
  }
  function finishDay(state, plan) {
    const error = validate(state, plan); if (error) throw new Error(error);
    const seed = state.seed * 16807 % 2147483647, variation = .85 + seed / 2147483647 * .3;
    const stock = stockOf();
    const items = weapons.map(w => {
      const { quantity, price } = plan.weapons[w.id];
      const demand = Math.max(0, Math.round((w.demand + 4 * Math.sqrt(plan.advertising) * w.demand / 12) * markets[state.market].factor * Math.exp((w.price - price) / (w.price * .7)) * variation));
      const sold = Math.min(state.stock[w.id] + quantity, demand);
      stock[w.id] = state.stock[w.id] + quantity - sold;
      return { weapon: w.id, quantity, price, sold, stock: stock[w.id], revenue: sold * price, craftingCost: quantity * w.cost };
    });
    const sum = field => items.reduce((n, item) => n + item[field], 0);
    const revenue = sum('revenue'), craftingCost = sum('craftingCost'), expenses = craftingCost + plan.advertising;
    const report = { day: state.history.length + 1, items, quantity: sum('quantity'), sold: sum('sold'), stock: totalStock(stock), advertising: plan.advertising, craftingCost, revenue, expenses, profit: revenue - expenses, cash: state.cash + revenue - expenses, market: state.market };
    return { version: 2, cash: report.cash, stock, history: [...state.history, report], market: seed % 5, seed };
  }
  function validSave(s) {
    if (!s || s.version !== 2 || !Number.isSafeInteger(s.seed) || s.seed < 1 || s.seed >= 2147483647 || !Number.isInteger(s.market) || !markets[s.market] || !Array.isArray(s.history) || s.history.length > 30 || !s.stock) return false;
    let cash = 100, stock = stockOf();
    for (const [i, r] of s.history.entries()) {
      if (!r || !['day','quantity','sold','stock','advertising','craftingCost','revenue','expenses','profit','cash','market'].every(k => Number.isSafeInteger(r[k])) || !Array.isArray(r.items) || r.items.length !== weapons.length || r.day !== i + 1 || !markets[r.market]) return false;
      let quantity = 0, sold = 0, revenue = 0, craftingCost = 0;
      for (const [j, w] of weapons.entries()) {
        const item = r.items[j];
        if (!item || item.weapon !== w.id || !['quantity','price','sold','stock','revenue','craftingCost'].every(k => Number.isSafeInteger(item[k])) || item.quantity < 0 || item.quantity > 40 || item.price < 1 || item.price > 100 || item.sold < 0 || item.sold > stock[w.id] + item.quantity || item.stock !== stock[w.id] + item.quantity - item.sold || item.revenue !== item.sold * item.price || item.craftingCost !== item.quantity * w.cost) return false;
        stock[w.id] = item.stock; quantity += item.quantity; sold += item.sold; revenue += item.revenue; craftingCost += item.craftingCost;
      }
      if (quantity > 40 || r.advertising < 0 || r.advertising > 1000 || craftingCost + r.advertising > cash || r.quantity !== quantity || r.sold !== sold || r.stock !== totalStock(stock) || r.revenue !== revenue || r.craftingCost !== craftingCost || r.expenses !== craftingCost + r.advertising || r.profit !== revenue - r.expenses || r.cash !== cash + r.profit) return false;
      cash = r.cash;
    }
    return s.cash === cash && weapons.every(w => s.stock[w.id] === stock[w.id]);
  }
  // Convert the original dagger-only ledger without rerolling or replaying any day.
  function migrateSave(saved) {
    if (validSave(saved)) return saved;
    if (!saved || saved.version !== 1 || !Array.isArray(saved.history) || !saved.history.every(r => r && typeof r === 'object') || !Number.isSafeInteger(saved.stock)) return null;
    const migrated = { ...saved, version: 2, stock: { ...stockOf(), dagger: saved.stock }, history: saved.history.map(r => ({ ...r, craftingCost: r.quantity * 4, items: weapons.map(w => w.id === 'dagger' ? { weapon: w.id, quantity: r.quantity, price: r.price, sold: r.sold, stock: r.stock, revenue: r.revenue, craftingCost: r.quantity * 4 } : { weapon: w.id, quantity: 0, price: w.price, sold: 0, stock: 0, revenue: 0, craftingCost: 0 }) })) };
    return validSave(migrated) ? migrated : null;
  }
  const api = { weapons, markets, stockOf, totalStock, blankPlan, planCost, createGame, validate, finishDay, validSave, migrateSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blacksmith = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
