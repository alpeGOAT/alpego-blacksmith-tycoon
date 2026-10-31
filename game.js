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
  const upgrades = [
    { id: 'anvil', name: 'Better anvil', icon: '⚒', cost: 50, description: 'Less waste, cleaner work. Every weapon costs 1 gold less to craft.' },
    { id: 'forge', name: 'Improved forge', icon: '♨', cost: 75, description: 'A hotter furnace. Craft up to 60 weapons in total each day instead of 40.' },
    { id: 'vise', name: 'Precision vise', icon: '⚙', cost: 65, description: 'A finer finish. Buyers value every weapon as if its price were 2 gold lower.' },
    { id: 'advertising', name: 'Improved advertising', icon: '✧', cost: 50, description: 'Better signs and smarter flyers. Paid ads count as 50% more spending, with diminishing returns.' }
  ];
  function effects(state = {}) {
    const owned = state.upgrades || [];
    return { craftDiscount: owned.includes('anvil') ? 1 : 0, capacity: owned.includes('forge') ? 60 : 40, marketBonus: owned.includes('vise') ? 2 : 0, adReach: owned.includes('advertising') ? 1.5 : 1 };
  }
  function unitCost(state, weapon) { return weapon.cost - effects(state).craftDiscount; }
  function createGame(random = Math.random) { return { version: 4, upgrades: [], purchases: [], satisfaction: 70, cash: 100, stock: stockOf(), history: [], market: 0, seed: Math.floor(random() * 2147483646) + 1 }; }
  function planCost(plan, state) { return weapons.reduce((n, w) => n + plan.weapons[w.id].quantity * unitCost(state, w), 0); }
  function upgradeError(state, id) {
    const upgrade = upgrades.find(u => u.id === id);
    if (!upgrade) return 'Unknown upgrade.';
    if (state.history.length >= 30) return 'Your 30-day journey is complete.';
    if (state.upgrades.includes(id)) return 'This upgrade is already installed.';
    if (state.cash < upgrade.cost) return `You need ${upgrade.cost - state.cash} more gold for this upgrade.`;
    return '';
  }
  function purchaseUpgrade(state, id) {
    const error = upgradeError(state, id); if (error) throw new Error(error);
    const upgrade = upgrades.find(u => u.id === id);
    return { ...state, cash: state.cash - upgrade.cost, upgrades: [...state.upgrades, id], purchases: [...state.purchases, { id, cost: upgrade.cost, afterDay: state.history.length }] };
  }
  function validate(state, plan) {
    if (state.history.length >= 30) return 'Your 30-day journey is complete. Start a new shop to play again.';
    if (!plan || !plan.weapons || !Number.isSafeInteger(plan.advertising)) return 'Use whole numbers for all your decisions.';
    const { capacity } = effects(state);
    let quantity = 0;
    for (const w of weapons) {
      const item = plan.weapons[w.id];
      if (!item || !Number.isSafeInteger(item.quantity) || !Number.isSafeInteger(item.price)) return 'Use whole numbers for all weapon quantities and prices.';
      if (item.quantity < 0 || item.quantity > capacity) return `Craft between 0 and ${capacity} weapons in total each day.`;
      if (item.price < 1 || item.price > 100) return `Set the ${w.name.toLowerCase()} price between 1 and 100 gold.`;
      quantity += item.quantity;
    }
    if (quantity > capacity) return `Your forge can craft ${capacity} weapons in total each day. Reduce your batch.`;
    if (plan.advertising < 0 || plan.advertising > 1000) return 'Choose an advertising budget between 0 and 1,000 gold.';
    if (planCost(plan, state) + plan.advertising > state.cash) return 'That investment exceeds your gold. Craft fewer weapons or lower your ad budget.';
    return '';
  }
  function finishDay(state, plan) {
    const error = validate(state, plan); if (error) throw new Error(error);
    const seed = state.seed * 16807 % 2147483647, variation = .85 + seed / 2147483647 * .3;
    const stock = stockOf();
    const { marketBonus, adReach } = effects(state);
    const items = weapons.map(w => {
      const { quantity, price } = plan.weapons[w.id];
      const demand = Math.max(0, Math.round((w.demand + 4 * Math.sqrt(plan.advertising * adReach) * w.demand / 12) * markets[state.market].factor * Math.exp((w.price + marketBonus - price) / (w.price * .7)) * variation));
      const sold = Math.min(state.stock[w.id] + quantity, demand);
      stock[w.id] = state.stock[w.id] + quantity - sold;
      return { weapon: w.id, quantity, price, demand, sold, stock: stock[w.id], revenue: sold * price, unitCost: unitCost(state, w), craftingCost: quantity * unitCost(state, w) };
    });
    const sum = field => items.reduce((n, item) => n + item[field], 0);
    const revenue = sum('revenue'), craftingCost = sum('craftingCost'), expenses = craftingCost + plan.advertising;
    const satisfaction = satisfactionChange(state.satisfaction, items);
    const report = { satisfaction, day: state.history.length + 1, items, quantity: sum('quantity'), sold: sum('sold'), stock: totalStock(stock), advertising: plan.advertising, craftingCost, revenue, expenses, profit: revenue - expenses, cash: state.cash + revenue - expenses, market: state.market };
    return { ...state, satisfaction: satisfaction.score, cash: report.cash, stock, history: [...state.history, report], market: seed % 5, seed };
  }
  function validLegacySave(s) {
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
  function migrateLegacySave(saved) {
    if (validLegacySave(saved)) return saved;
    if (!saved || saved.version !== 1 || !Array.isArray(saved.history) || !saved.history.every(r => r && typeof r === 'object') || !Number.isSafeInteger(saved.stock)) return null;
    const migrated = { ...saved, version: 2, stock: { ...stockOf(), dagger: saved.stock }, history: saved.history.map(r => ({ ...r, craftingCost: r.quantity * 4, items: weapons.map(w => w.id === 'dagger' ? { weapon: w.id, quantity: r.quantity, price: r.price, sold: r.sold, stock: r.stock, revenue: r.revenue, craftingCost: r.quantity * 4 } : { weapon: w.id, quantity: 0, price: w.price, sold: 0, stock: 0, revenue: 0, craftingCost: 0 }) })) };
    return validLegacySave(migrated) ? migrated : null;
  }
  // All four posted prices count, including lines that sold out or attracted no buyers.
  function satisfactionChange(before, items) {
    const priceEffect = Math.round(items.reduce((sum, item, i) =>
      sum + Math.max(-1, Math.min(1, (weapons[i].price - item.price) / weapons[i].price)), 0) / weapons.length * 6);
    const demand = items.reduce((sum, item) => sum + item.demand, 0);
    const unmetDemand = items.reduce((sum, item) => sum + item.demand - item.sold, 0);
    const inventoryEffect = demand ? Math.round(4 - 16 * unmetDemand / demand) : 0;
    const score = Math.max(0, Math.min(100, before + priceEffect + inventoryEffect));
    return { before, priceEffect, inventoryEffect, demand, unmetDemand, score, change: score - before };
  }
  function validSatisfactionHistory(saved) {
    let score = 70, tracking = false;
    for (const report of saved.history) {
      // Old ledgers do not contain demand; never invent historical satisfaction.
      if (report.satisfaction === null) {
        if (tracking || !report.items.every(item => item.demand === null)) return false;
        continue;
      }
      tracking = true;
      if (!report.satisfaction || !report.items.every(item => Number.isSafeInteger(item.demand) && item.demand >= item.sold)) return false;
      const expected = satisfactionChange(score, report.items);
      if (!Object.keys(expected).every(key => report.satisfaction[key] === expected[key])) return false;
      score = expected.score;
    }
    return saved.satisfaction === score;
  }
  function validSave(saved) {
    if (!saved || saved.version !== 4 || !Number.isSafeInteger(saved.seed) || saved.seed < 1 || saved.seed >= 2147483647 || !Number.isInteger(saved.market) || !markets[saved.market] || !Array.isArray(saved.history) || saved.history.length > 30 || !saved.stock || !Array.isArray(saved.upgrades) || !Array.isArray(saved.purchases) || saved.purchases.length > upgrades.length) return false;
    let cash = 100, stock = stockOf(), cursor = 0;
    const owned = [];
    for (let i = 0; i <= saved.history.length; i++) {
      while (cursor < saved.purchases.length && saved.purchases[cursor]?.afterDay === i) {
        const p = saved.purchases[cursor++], upgrade = upgrades.find(u => u.id === p.id);
        if (!upgrade || i >= 30 || p.cost !== upgrade.cost || owned.includes(p.id) || cash < p.cost) return false;
        cash -= p.cost; owned.push(p.id);
      }
      if (i === saved.history.length) break;
      const r = saved.history[i], stage = { upgrades: owned }, capacity = effects(stage).capacity;
      if (!r || !['day','quantity','sold','stock','advertising','craftingCost','revenue','expenses','profit','cash','market'].every(k => Number.isSafeInteger(r[k])) || !Array.isArray(r.items) || r.items.length !== weapons.length || r.day !== i + 1 || !markets[r.market]) return false;
      let quantity = 0, sold = 0, revenue = 0, craftingCost = 0;
      for (const [j, w] of weapons.entries()) {
        const item = r.items[j], cost = unitCost(stage, w);
        if (!item || item.weapon !== w.id || !['quantity','price','sold','stock','revenue','craftingCost','unitCost'].every(k => Number.isSafeInteger(item[k])) || item.quantity < 0 || item.quantity > capacity || item.price < 1 || item.price > 100 || item.sold < 0 || item.sold > stock[w.id] + item.quantity || item.stock !== stock[w.id] + item.quantity - item.sold || item.revenue !== item.sold * item.price || item.unitCost !== cost || item.craftingCost !== item.quantity * cost) return false;
        stock[w.id] = item.stock; quantity += item.quantity; sold += item.sold; revenue += item.revenue; craftingCost += item.craftingCost;
      }
      if (quantity > capacity || r.advertising < 0 || r.advertising > 1000 || craftingCost + r.advertising > cash || r.quantity !== quantity || r.sold !== sold || r.stock !== totalStock(stock) || r.revenue !== revenue || r.craftingCost !== craftingCost || r.expenses !== craftingCost + r.advertising || r.profit !== revenue - r.expenses || r.cash !== cash + r.profit) return false;
      cash = r.cash;
    }
    return cursor === saved.purchases.length && saved.cash === cash && weapons.every(w => saved.stock[w.id] === stock[w.id]) && saved.upgrades.length === owned.length && saved.upgrades.every((id, i) => id === owned[i]) && validSatisfactionHistory(saved);
  }
  function migrateSave(saved) {
    if (validSave(saved)) return saved;
    // The isolated upgrades branch used a dagger-only version-2 format.
    if (saved?.version === 2 && Number.isSafeInteger(saved.stock) && Array.isArray(saved.history) && Array.isArray(saved.purchases) && Array.isArray(saved.upgrades) && saved.history.every(r => r && typeof r === 'object')) {
      const upgraded = { ...saved, version: 4, satisfaction: 70, stock: { ...stockOf(), dagger: saved.stock }, history: saved.history.map(r => {
        const stage = { upgrades: saved.purchases.filter(p => p && p.afterDay < r.day).map(p => p.id) };
        return { ...r, craftingCost: r.quantity * r.unitCost, satisfaction: null, items: weapons.map(w => ({
          weapon: w.id, quantity: w.id === 'dagger' ? r.quantity : 0, price: w.id === 'dagger' ? r.price : w.price, demand: null,
          sold: w.id === 'dagger' ? r.sold : 0, stock: w.id === 'dagger' ? r.stock : 0, revenue: w.id === 'dagger' ? r.revenue : 0,
          unitCost: w.id === 'dagger' ? r.unitCost : unitCost(stage, w), craftingCost: w.id === 'dagger' ? r.quantity * r.unitCost : 0
        })) };
      }) };
      return validSave(upgraded) ? upgraded : null;
    }
    const tracked = saved?.version === 3 && validLegacySave({ ...saved, version: 2 }) && validSatisfactionHistory(saved);
    const legacy = tracked ? saved : migrateLegacySave(saved);
    if (!legacy) return null;
    const migrated = { ...legacy, version: 4, upgrades: [], purchases: [], satisfaction: tracked ? legacy.satisfaction : 70, history: legacy.history.map(report => ({
      ...report, satisfaction: tracked ? report.satisfaction : null, items: report.items.map((item, i) => ({ ...item, demand: tracked ? item.demand : null, unitCost: weapons[i].cost }))
    })) };
    return validSave(migrated) ? migrated : null;
  }
  const api = { weapons, markets, upgrades, effects, unitCost, upgradeError, purchaseUpgrade, stockOf, totalStock, blankPlan, planCost, createGame, validate, finishDay, validSave, migrateSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blacksmith = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
