'use strict';
const $ = id => document.getElementById(id);
const key = 'alpegos-blacksmith-weapons-v4';
const gold = n => `${n.toLocaleString()} g`;
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${gold(Math.abs(n))}`;
let state = Blacksmith.createGame(), storageAvailable = true, servingCustomers = false;
try {
  const saved = localStorage.getItem(key);
  const restored = Blacksmith.migrateSave(JSON.parse(saved || localStorage.getItem('alpegos-blacksmith-weapons-v3') || localStorage.getItem('alpegos-blacksmith-weapons-v2') || localStorage.getItem('alpegos-blacksmith-v1')));
  if (restored) state = restored;
} catch { storageAvailable = false; }
function persist() {
  try { localStorage.setItem(key, JSON.stringify(state)); storageAvailable = true; } catch { storageAvailable = false; }
  $('save-status').textContent = storageAvailable ? '● Saved on this browser' : 'Session only · saving unavailable';
}
function resetPlan() {
  const p = Blacksmith.blankPlan();
  $('weapon-plans').innerHTML = Blacksmith.weapons.map(w => `<div class="weapon-plan-row"><div class="weapon-info"><span class="weapon-icon">${w.icon}</span><div><strong>${w.name}</strong><span id="craft-info-${w.id}">${w.cost} g to craft · market ${w.price} g</span><span id="inventory-${w.id}"></span></div></div><label for="quantity-${w.id}">Craft<input id="quantity-${w.id}" aria-label="${w.name} quantity to craft" type="number" min="0" max="40" step="1" value="${p.weapons[w.id].quantity}" required></label><label for="price-${w.id}">Price (g)<input id="price-${w.id}" aria-label="${w.name} price in gold" type="number" min="1" max="100" step="1" value="${w.price}" required></label></div>`).join('');
  $('advertising').value = p.advertising;
}
function plan() { return { weapons: Object.fromEntries(Blacksmith.weapons.map(w => [w.id, { quantity: $(`quantity-${w.id}`).valueAsNumber, price: $(`price-${w.id}`).valueAsNumber }])), advertising: $('advertising').valueAsNumber }; }
function lockInputs(disabled) {
  Blacksmith.weapons.forEach(w => ['quantity', 'price'].forEach(k => { $(`${k}-${w.id}`).disabled = disabled; }));
  $('advertising').disabled = disabled;
}
function budget() {
  const p = plan(), craftCost = Blacksmith.planCost(p, state), cost = craftCost + p.advertising;
  $('craft-cost').textContent = Number.isFinite(craftCost) ? gold(craftCost) : '—';
  $('ad-cost').textContent = Number.isFinite(p.advertising) ? gold(p.advertising) : '—';
  $('investment').textContent = Number.isFinite(cost) ? gold(cost) : '—';
  const error = Blacksmith.validate(state, p);
  $('validation').textContent = state.history.length === 30 ? '' : error;
  $('open-shop').disabled = servingCustomers || Boolean(error);
}
const points = n => `${n > 0 ? '+' : ''}${n} pts`;
function renderUpgrades() {
  const finished = state.history.length === 30;
  $('upgrade-count').textContent = `${state.upgrades.length} / 4 INSTALLED`;
  $('upgrade-grid').innerHTML = Blacksmith.upgrades.map(u => {
    const installed = state.upgrades.includes(u.id), disabled = installed || finished || servingCustomers || state.cash < u.cost;
    return `<article class="upgrade-item${installed ? ' installed' : ''}"><span class="upgrade-icon" aria-hidden="true">${u.icon}</span><h3>${u.name}</h3><p>${u.description}</p><button class="upgrade-buy" type="button" data-upgrade="${u.id}" ${disabled ? 'disabled' : ''}>${installed ? '✓ Installed · Max level' : finished ? 'Season complete' : servingCustomers ? 'Shop is open' : state.cash < u.cost ? `${gold(u.cost)} · Need ${gold(u.cost - state.cash)}` : `Buy for ${gold(u.cost)} →`}</button></article>`;
  }).join('');
  const spent = state.purchases.reduce((total, p) => total + p.cost, 0);
  $('upgrade-spending').textContent = `Workshop investments · ${gold(spent)} spent`;
  $('upgrade-ledger').innerHTML = state.purchases.length ? state.purchases.map(p => `<div><span>Before day ${p.afterDay + 1} · ${Blacksmith.upgrades.find(u => u.id === p.id).name}</span><strong>−${gold(p.cost)}</strong></div>`).join('') : 'No upgrades purchased yet.';
  const effect = Blacksmith.effects(state);
  $('capacity-hint').textContent = `${effect.capacity} weapons total per day · prices in gold`;
  $('ad-hint').textContent = effect.adReach > 1 ? 'Paid ads count as 50% more spending' : 'Promote every weapon in your shop';
  Blacksmith.weapons.forEach(w => {
    $(`quantity-${w.id}`).max = effect.capacity;
    $(`craft-info-${w.id}`).textContent = `${Blacksmith.unitCost(state, w)} g to craft · market ${w.price} g`;
  });
}
function satisfactionReport(report) {
  const s = report.satisfaction;
  if (!s) return '<p class="report-note">Satisfaction was not tracked on this day.</p>';
  const priceReason = s.priceEffect > 0 ? 'Good value compared with market prices' : s.priceEffect < 0 ? 'Prices above market value' : 'Prices balanced around market value';
  const inventoryReason = s.demand ? `${s.demand - s.unmetDemand} of ${s.demand} requested weapons supplied; ${s.unmetDemand} unmet` : 'No demand today; inventory had no effect';
  const limited = s.change !== s.priceEffect + s.inventoryEffect ? ' Score capped at 0–100.' : '';
  return `<section class="satisfaction-report" aria-label="Day ${report.day} customer satisfaction"><strong>Customer satisfaction: ${s.score}/100 (${points(s.change)})</strong><p>${priceReason}: ${points(s.priceEffect)}.</p><p>${inventoryReason}: ${points(s.inventoryEffect)}.</p><p>${s.before} → ${s.score}.${limited}</p></section>`;
}
function render() {
  const done = state.history.length === 30, last = state.history.at(-1);
  $('cash').innerHTML = `${state.cash.toLocaleString()} <small>g</small>`;
  $('stock').textContent = Blacksmith.totalStock(state.stock);
  $('satisfaction').textContent = `${state.satisfaction}/100`;
  $('satisfaction-note').textContent = last?.satisfaction ? `${points(last.satisfaction.change)} on day ${last.day}` : 'Prices and availability shape your score';
  Blacksmith.weapons.forEach(w => { $(`inventory-${w.id}`).textContent = `${state.stock[w.id]} in stock`; });
  $('profit').innerHTML = `${signed(state.cash - 100).replace(' g', '')} <small>g</small>`;
  $('profit').className = state.cash < 100 ? 'negative' : 'positive';
  $('day').innerHTML = `Day ${done ? 30 : state.history.length + 1} <small>/ 30</small>`;
  $('day-progress').style.width = `${state.history.length / 30 * 100}%`;
  $('plan-day').textContent = done ? '30 DAYS · THE JOURNEY IS COMPLETE' : `DAY ${String(state.history.length + 1).padStart(2, '0')} · THE WORKSHOP`;
  $('phase').textContent = done ? 'SEASON COMPLETE' : 'READY TO FORGE';
  $('market-title').textContent = done ? 'A month of fire and steel' : Blacksmith.markets[state.market].title;
  $('market-copy').textContent = done ? 'Your final cash is in. Start a new shop to try a different strategy.' : Blacksmith.markets[state.market].copy;
  lockInputs(done);
  $('open-shop').innerHTML = done ? '30 days complete <span>✓</span>' : 'Open shop & finish day <span>→</span>';
  if (last) {
    $('result-label').textContent = done ? 'YOUR 30-DAY STORY' : `DAY ${String(last.day).padStart(2, '0')} · THE EVENING REPORT`;
    $('result-heading').textContent = done ? 'The final hammer falls.' : last.profit > 0 ? 'A good day at the forge.' : last.profit < 0 ? 'A lesson at the forge.' : 'An even day at the forge.';
    $('result-content').className = 'filled-report';
    const rating = state.cash >= 1500 ? 'Master of the forge' : state.cash >= 500 ? 'A flourishing blacksmith' : state.cash > 100 ? 'A promising apprentice' : 'Every master starts somewhere';
    const breakdown = last.items.map((item, i) => `<div><span>${Blacksmith.weapons[i].icon} ${Blacksmith.weapons[i].name}</span><span>${item.sold} sold · ${item.stock} left</span><strong>${gold(item.revenue)}</strong></div>`).join('');
    $('result-content').innerHTML = `${done ? `<div class="final-banner"><span>✦ ${rating}</span><strong>${gold(state.cash)}</strong><p>Final cash · ${state.history.reduce((n,r) => n+r.sold,0)} weapons sold in 30 days</p></div>` : `<div class="sold-hero"><strong>${last.sold}<small> / ${last.sold + last.stock}</small></strong><span>WEAPONS SOLD</span></div>`}<div class="weapon-sales">${breakdown}</div>${satisfactionReport(last)}<div class="report-rows"><div><span>${done ? 'Day 30 revenue' : 'Sales revenue'}</span><strong>${gold(last.revenue)}</strong></div><div><span>Crafting expenses</span><strong>−${gold(last.craftingCost)}</strong></div><div><span>Advertising expenses</span><strong>−${gold(last.advertising)}</strong></div><div class="report-total"><span>Total expenses</span><strong>${gold(last.expenses)}</strong></div><div class="profit-row"><span>Day ${last.day} profit</span><strong class="${last.profit < 0 ? 'negative' : 'positive'}">${signed(last.profit)}</strong></div><div><span>Remaining cash</span><strong>${gold(last.cash)}</strong></div></div><p class="report-note">${done ? `${last.stock} unsold weapons remain. Final score is based on cash; stock is not liquidated.` : last.stock ? `${last.stock} unsold weapons saved for tomorrow. Adjust each weapon’s price to find its buyers.` : last.sold ? 'Sold out! Consider changing your weapon mix or raising prices tomorrow.' : 'No sales today. Try lowering prices or spreading the word.'}</p>`;
  } else {
    $('result-label').textContent = 'THE EVENING REPORT'; $('result-heading').textContent = 'Every blade has a beginning.';
    $('result-content').className = 'empty-report';
    $('result-content').innerHTML = '<div class="empty-icon">⚒</div><h3>The forge is waiting.</h3><p>Choose your weapon mix and open the shop.<br>Your daily results will appear here.</p><div class="tip"><span>✧</span><p><strong>A word from Alpego</strong>Swords sell for more, but daggers are cheaper to make. Mix your stock and watch which weapons sell.</p></div>';
  }
  $('ledger-count').textContent = `${state.history.length} day${state.history.length === 1 ? '' : 's'} in business`;
  $('ledger-body').innerHTML = state.history.length ? [...state.history].reverse().map(r => `<tr class="ledger-summary"><td><span class="day-chip">${String(r.day).padStart(2, '0')}</span></td><td>All weapons</td><td>${r.quantity}</td><td>${r.sold}</td><td>—</td><td>${gold(r.revenue)}</td><td>${gold(r.expenses)}</td><td class="${r.profit < 0 ? 'negative' : 'positive'}">${signed(r.profit)}</td><td><strong>${gold(r.cash)}</strong></td></tr><tr><td colspan="9">${satisfactionReport(r)}</td></tr>${r.items.filter(item => item.quantity || item.sold || item.stock).map(item => { const w = Blacksmith.weapons.find(w => w.id === item.weapon); return `<tr class="ledger-item"><td></td><td>${w.icon} ${w.name}</td><td>${item.quantity}</td><td>${item.sold}</td><td>${gold(item.price)}</td><td>${gold(item.revenue)}</td><td>${gold(item.craftingCost)} craft</td><td>—</td><td>${item.stock} left</td></tr>`; }).join('')}`).join('') : '<tr><td colspan="9" class="empty-ledger">A fresh ledger, a fresh start. Your story begins on day one.</td></tr>';
  renderUpgrades(); budget(); persist();
}
$('upgrade-grid').addEventListener('click', e => {
  const button = e.target.closest('[data-upgrade]');
  if (!button || button.disabled || servingCustomers) return;
  const id = button.dataset.upgrade, error = Blacksmith.upgradeError(state, id);
  if (error) { $('upgrade-status').textContent = error; return; }
  state = Blacksmith.purchaseUpgrade(state, id);
  $('upgrade-status').textContent = `${Blacksmith.upgrades.find(u => u.id === id).name} installed. The benefit starts with your next batch. Its cost is recorded in Workshop investments and total profit.`;
  render();
});
$('plan-form').addEventListener('input', budget);
$('plan-form').addEventListener('submit', e => {
  e.preventDefault(); if (servingCustomers) return;
  const error = Blacksmith.validate(state, plan()); if (error) { $('validation').textContent = error; return; }
  state = Blacksmith.finishDay(state, plan()); persist();
  $('satisfaction').textContent = `${state.satisfaction}/100`;
  $('satisfaction-note').textContent = `${points(state.history.at(-1).satisfaction.change)} on day ${state.history.length}`; servingCustomers = true; renderUpgrades();
  lockInputs(true); $('restart-button').disabled = true; $('open-shop').disabled = true;
  $('phase').textContent = 'SHOP OPEN'; $('open-shop').innerHTML = 'Serving customers… <span>⚒</span>';
  $('result-label').textContent = `DAY ${state.history.length} · SHOP OPEN`; $('result-heading').textContent = 'Adventures start at your counter.';
  $('result-content').className = 'empty-report'; $('result-content').innerHTML = '<div class="empty-icon">⚔</div><h3>Steel, smiles, and a little gold.</h3><p>Customers are visiting the shop above.<br>Your evening report is on its way.</p>';
  ShopCustomers.play(state.history.at(-1), () => { servingCustomers = false; $('restart-button').disabled = false; render(); });
});
$('skip-customers').addEventListener('click', ShopCustomers.finish);
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
document.querySelector('.dialog-close').addEventListener('click', () => $('help-dialog').close());
$('help-done').addEventListener('click', () => $('help-dialog').close());
$('restart-button').addEventListener('click', () => $('restart-dialog').showModal());
$('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
$('confirm-restart').addEventListener('click', () => { ShopCustomers.reset(); state = Blacksmith.createGame(); resetPlan(); $('upgrade-status').textContent = 'Choose an upgrade when your shop can afford it.'; $('restart-dialog').close(); render(); });
resetPlan(); render();
