(function (root) {
  'use strict';
  const markets = [
    { title: 'A steady day at the market', copy: 'The town is stirring. A good day to find your rhythm.', factor: 1 },
    { title: 'Caravan in town', copy: 'Travelers need reliable blades. Expect more customers today.', factor: 1.3 },
    { title: 'Rain over the market', copy: 'Fewer people are out browsing. Keep your stock in mind.', factor: .75 },
    { title: 'The town fair', copy: 'The streets are busy. Your shop could see a little extra traffic.', factor: 1.45 },
    { title: 'A quiet market morning', copy: 'Foot traffic is light. A careful investment could pay off.', factor: .85 }
  ];
  function createGame(random = Math.random) { return { version: 1, cash: 100, stock: 0, history: [], market: 0, seed: Math.floor(random() * 2147483646) + 1 }; }
  function validate(state, plan) {
    if (state.history.length >= 30) return 'Your 30-day journey is complete. Start a new shop to play again.';
    if (![plan.quantity, plan.price, plan.advertising].every(Number.isSafeInteger)) return 'Use whole numbers for all three decisions.';
    if (plan.quantity < 0 || plan.quantity > 40) return 'Craft between 0 and 40 daggers a day.';
    if (plan.price < 1 || plan.price > 100) return 'Set a price between 1 and 100 gold.';
    if (plan.advertising < 0 || plan.advertising > 1000) return 'Choose an advertising budget between 0 and 1,000 gold.';
    if (plan.quantity * 4 + plan.advertising > state.cash) return 'That investment exceeds your gold. Craft fewer daggers or lower your ad budget.';
    return '';
  }
  function finishDay(state, plan) {
    const error = validate(state, plan); if (error) throw new Error(error);
    const seed = state.seed * 16807 % 2147483647;
    const variation = .85 + seed / 2147483647 * .3;
    const demand = Math.max(0, Math.round((12 + 4 * Math.sqrt(plan.advertising)) * markets[state.market].factor * Math.exp((10 - plan.price) / 7) * variation));
    const sold = Math.min(state.stock + plan.quantity, demand);
    const revenue = sold * plan.price, expenses = plan.quantity * 4 + plan.advertising;
    const report = { day: state.history.length + 1, ...plan, sold, revenue, expenses, profit: revenue - expenses, cash: state.cash + revenue - expenses, stock: state.stock + plan.quantity - sold, market: state.market };
    return { version: 1, cash: report.cash, stock: report.stock, history: [...state.history, report], market: (seed % 5), seed };
  }
  function validSave(s) {
    if (!s || s.version !== 1 || !Number.isSafeInteger(s.seed) || s.seed < 1 || s.seed >= 2147483647 || !Number.isInteger(s.market) || !markets[s.market] || !Array.isArray(s.history) || s.history.length > 30) return false;
    let cash = 100, stock = 0;
    for (const [i, r] of s.history.entries()) {
      if (!r || !['day','quantity','price','advertising','sold','revenue','expenses','profit','cash','stock','market'].every(k => Number.isSafeInteger(r[k]))) return false;
      if (r.day !== i + 1 || validate({ cash, history: [] }, r) || !markets[r.market] || r.sold < 0 || r.sold > stock + r.quantity || r.revenue !== r.sold * r.price || r.expenses !== r.quantity * 4 + r.advertising || r.profit !== r.revenue - r.expenses || r.cash !== cash + r.profit || r.stock !== stock + r.quantity - r.sold) return false;
      cash = r.cash; stock = r.stock;
    }
    return s.cash === cash && s.stock === stock;
  }
  const api = { markets, createGame, validate, finishDay, validSave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blacksmith = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
