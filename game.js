(function (root) {
  'use strict';
  const markets = [
    { title: 'A steady day at the market', copy: 'The town is stirring. A good day to find your rhythm.', factor: 1 },
    { title: 'Caravan in town', copy: 'Travelers need reliable blades. Expect more customers today.', factor: 1.3 },
    { title: 'Rain over the market', copy: 'Fewer people are out browsing. Keep your stock in mind.', factor: .75 },
    { title: 'The town fair', copy: 'The streets are busy. Your shop could see a little extra traffic.', factor: 1.45 },
    { title: 'A quiet market morning', copy: 'Foot traffic is light. A careful investment could pay off.', factor: .85 }
  ];
  const upgrades = [
    { id: 'anvil', name: 'Better anvil', icon: '⚒', cost: 50, description: 'Less waste, cleaner work. Crafting drops from 4 to 3 gold per dagger.' },
    { id: 'forge', name: 'Improved forge', icon: '♨', cost: 75, description: 'A hotter, roomier furnace. Daily crafting capacity rises from 40 to 60.' },
    { id: 'vise', name: 'Precision vise', icon: '⚙', cost: 65, description: 'A finer finish earns trust. Buyers accept prices as if they were 2 gold lower.' },
    { id: 'advertising', name: 'Improved advertising', icon: '✧', cost: 50, description: 'Better signs and smarter flyers. Paid ads count as 50% more spending, with the usual diminishing returns.' }
  ];
  function effects(state) {
    const owned = state.upgrades || [];
    return { unitCost: owned.includes('anvil') ? 3 : 4, capacity: owned.includes('forge') ? 60 : 40, marketPrice: owned.includes('vise') ? 12 : 10, adReach: owned.includes('advertising') ? 1.5 : 1 };
  }
  function createGame(random = Math.random) { return { version: 2, cash: 100, stock: 0, history: [], upgrades: [], purchases: [], market: 0, seed: Math.floor(random() * 2147483646) + 1 }; }
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
    if (![plan.quantity, plan.price, plan.advertising].every(Number.isSafeInteger)) return 'Use whole numbers for all three decisions.';
    const { unitCost, capacity } = effects(state);
    if (plan.quantity < 0 || plan.quantity > capacity) return `Craft between 0 and ${capacity} daggers a day.`;
    if (plan.price < 1 || plan.price > 100) return 'Set a price between 1 and 100 gold.';
    if (plan.advertising < 0 || plan.advertising > 1000) return 'Choose an advertising budget between 0 and 1,000 gold.';
    if (plan.quantity * unitCost + plan.advertising > state.cash) return 'That investment exceeds your gold. Craft fewer daggers or lower your ad budget.';
    return '';
  }
  function finishDay(state, plan) {
    const error = validate(state, plan); if (error) throw new Error(error);
    const seed = state.seed * 16807 % 2147483647;
    const variation = .85 + seed / 2147483647 * .3;
    const { unitCost, marketPrice, adReach } = effects(state);
    const demand = Math.max(0, Math.round((12 + 4 * Math.sqrt(plan.advertising * adReach)) * markets[state.market].factor * Math.exp((marketPrice - plan.price) / 7) * variation));
    const sold = Math.min(state.stock + plan.quantity, demand);
    const revenue = sold * plan.price, expenses = plan.quantity * unitCost + plan.advertising;
    const report = { day: state.history.length + 1, ...plan, unitCost, sold, revenue, expenses, profit: revenue - expenses, cash: state.cash + revenue - expenses, stock: state.stock + plan.quantity - sold, market: state.market };
    return { ...state, cash: report.cash, stock: report.stock, history: [...state.history, report], market: (seed % 5), seed };
  }
  function validSave(s) {
    if (!s || ![1, 2].includes(s.version) || !Number.isSafeInteger(s.seed) || s.seed < 1 || s.seed >= 2147483647 || !Number.isInteger(s.market) || !markets[s.market] || !Array.isArray(s.history) || s.history.length > 30) return false;
    const legacy = s.version === 1;
    if (!legacy && (!Array.isArray(s.upgrades) || !Array.isArray(s.purchases) || s.purchases.length > upgrades.length)) return false;
    const purchases = legacy ? [] : s.purchases;
    let cash = 100, stock = 0, cursor = 0;
    const owned = [];
    for (let i = 0; i <= s.history.length; i++) {
      while (cursor < purchases.length && purchases[cursor]?.afterDay === i) {
        const p = purchases[cursor++], upgrade = upgrades.find(u => u.id === p.id);
        if (!upgrade || i >= 30 || p.cost !== upgrade.cost || owned.includes(p.id) || cash < p.cost) return false;
        cash -= p.cost; owned.push(p.id);
      }
      if (i === s.history.length) break;
      const r = s.history[i], stage = { cash, upgrades: owned, history: [] };
      const unitCost = effects(stage).unitCost;
      if (!r || !['day','quantity','price','advertising','sold','revenue','expenses','profit','cash','stock','market'].every(k => Number.isSafeInteger(r[k]))) return false;
      if ((!legacy && r.unitCost !== unitCost) || r.day !== i + 1 || validate(stage, r) || !markets[r.market] || r.sold < 0 || r.sold > stock + r.quantity || r.revenue !== r.sold * r.price || r.expenses !== r.quantity * unitCost + r.advertising || r.profit !== r.revenue - r.expenses || r.cash !== cash + r.profit || r.stock !== stock + r.quantity - r.sold) return false;
      cash = r.cash; stock = r.stock;
    }
    return cursor === purchases.length && s.cash === cash && s.stock === stock && (legacy || (s.upgrades.length === owned.length && s.upgrades.every((id, i) => id === owned[i])));
  }
  function migrateSave(saved) {
    if (!validSave(saved)) return null;
    if (saved.version === 2) return saved;
    return { ...saved, version: 2, upgrades: [], purchases: [], history: saved.history.map(r => ({ ...r, unitCost: 4 })) };
  }
  const api = { markets, upgrades, effects, createGame, validate, finishDay, validSave, migrateSave, upgradeError, purchaseUpgrade };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blacksmith = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
