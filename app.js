'use strict';
const $ = id => document.getElementById(id);
const key = 'alpegos-blacksmith-v1';
const gold = n => `${n.toLocaleString()} g`;
const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${gold(Math.abs(n))}`;
let state = Blacksmith.createGame();
let storageAvailable = true;
let servingCustomers = false;
try { const saved = JSON.parse(localStorage.getItem(key)); if (Blacksmith.validSave(saved)) state = saved; } catch { storageAvailable = false; }
function persist() { try { localStorage.setItem(key, JSON.stringify(state)); storageAvailable = true; } catch { storageAvailable = false; } $('save-status').textContent = storageAvailable ? '● Saved on this browser' : 'Session only · saving unavailable'; }
function plan() { return { quantity: $('quantity').valueAsNumber, price: $('price').valueAsNumber, advertising: $('advertising').valueAsNumber }; }
function budget() {
  const p = plan(), cost = p.quantity * 4 + p.advertising;
  $('craft-cost').textContent = Number.isFinite(p.quantity) ? gold(p.quantity * 4) : '—';
  $('ad-cost').textContent = Number.isFinite(p.advertising) ? gold(p.advertising) : '—';
  $('investment').textContent = Number.isFinite(cost) ? gold(cost) : '—';
  const error = Blacksmith.validate(state, p);
  $('validation').textContent = state.history.length === 30 ? '' : error;
  $('open-shop').disabled = servingCustomers || Boolean(error);
}
function render() {
  const done = state.history.length === 30, last = state.history.at(-1);
  $('cash').innerHTML = `${state.cash.toLocaleString()} <small>g</small>`;
  $('stock').textContent = state.stock;
  $('profit').innerHTML = `${signed(state.cash - 100).replace(' g', '')} <small>g</small>`;
  $('profit').className = state.cash < 100 ? 'negative' : 'positive';
  $('day').innerHTML = done ? 'Day 30 <small>/ 30</small>' : `Day ${state.history.length + 1} <small>/ 30</small>`;
  $('day-progress').style.width = `${state.history.length / 30 * 100}%`;
  $('plan-day').textContent = done ? '30 DAYS · THE JOURNEY IS COMPLETE' : `DAY ${String(state.history.length + 1).padStart(2, '0')} · THE WORKSHOP`;
  $('phase').textContent = done ? 'SEASON COMPLETE' : 'READY TO FORGE';
  $('market-title').textContent = done ? 'A month of fire and steel' : Blacksmith.markets[state.market].title;
  $('market-copy').textContent = done ? 'Your final cash is in. Start a new shop to try a different strategy.' : Blacksmith.markets[state.market].copy;
  ['quantity', 'price', 'advertising'].forEach(id => { $(id).disabled = done; });
  $('open-shop').innerHTML = done ? '30 days complete <span>✓</span>' : 'Open shop & finish day <span>→</span>';
  if (last) {
    $('result-label').textContent = done ? 'YOUR 30-DAY STORY' : `DAY ${String(last.day).padStart(2, '0')} · THE EVENING REPORT`;
    $('result-heading').textContent = done ? 'The final hammer falls.' : last.profit > 0 ? 'A good day at the forge.' : last.profit < 0 ? 'A lesson at the forge.' : 'An even day at the forge.';
    $('result-content').className = 'filled-report';
    const rating = state.cash >= 1500 ? 'Master of the forge' : state.cash >= 500 ? 'A flourishing blacksmith' : state.cash > 100 ? 'A promising apprentice' : 'Every master starts somewhere';
    $('result-content').innerHTML = `${done ? `<div class="final-banner"><span>✦ ${rating}</span><strong>${gold(state.cash)}</strong><p>Final cash · ${state.history.reduce((n,r) => n+r.sold,0)} daggers sold in 30 days</p></div>` : `<div class="sold-hero"><strong>${last.sold}<small> / ${last.sold + last.stock}</small></strong><span>DAGGERS SOLD</span></div>`}<div class="report-rows"><div><span>${done ? 'Day 30 revenue' : 'Sales revenue'}</span><strong>${gold(last.revenue)}</strong></div><div><span>Crafting expenses</span><strong>−${gold(last.quantity * 4)}</strong></div><div><span>Advertising expenses</span><strong>−${gold(last.advertising)}</strong></div><div class="report-total"><span>Total expenses</span><strong>${gold(last.expenses)}</strong></div><div class="profit-row"><span>Day ${last.day} profit</span><strong class="${last.profit < 0 ? 'negative' : 'positive'}">${signed(last.profit)}</strong></div><div><span>Remaining cash</span><strong>${gold(last.cash)}</strong></div></div><p class="report-note">${done ? `${last.stock} unsold daggers remain. Final score is based on cash; stock is not liquidated.` : last.stock ? `${last.stock} unsold dagger${last.stock === 1 ? '' : 's'} saved for tomorrow. Try a lower price if stock is building up.` : last.sold ? 'Sold out! A bigger batch or a higher price could help tomorrow.' : 'No sales today. Try lowering your price or spreading the word.'}</p>`;
  } else {
    $('result-label').textContent = 'THE EVENING REPORT'; $('result-heading').textContent = 'Every blade has a beginning.';
    $('result-content').className = 'empty-report';
    $('result-content').innerHTML = '<div class="empty-icon">⚒</div><h3>The forge is waiting.</h3><p>Make your first batch and open the shop.<br>Your daily results will appear here.</p><div class="tip"><span>✧</span><p><strong>A word from Alpego</strong>Start small. Watch demand. Unsold daggers stay on your shelves for tomorrow.</p></div>';
  }
  $('ledger-count').textContent = `${state.history.length} day${state.history.length === 1 ? '' : 's'} in business`;
  $('ledger-body').innerHTML = state.history.length ? [...state.history].reverse().map(r => `<tr><td><span class="day-chip">${String(r.day).padStart(2, '0')}</span></td><td>${r.quantity}</td><td>${r.sold}</td><td>${gold(r.price)}</td><td>${gold(r.revenue)}</td><td>${gold(r.expenses)}</td><td class="${r.profit < 0 ? 'negative' : 'positive'}">${signed(r.profit)}</td><td><strong>${gold(r.cash)}</strong></td></tr>`).join('') : '<tr><td colspan="8" class="empty-ledger">A fresh ledger, a fresh start. Your story begins on day one.</td></tr>';
  budget(); persist();
}
$('plan-form').addEventListener('input', budget);
$('plan-form').addEventListener('submit', e => {
  e.preventDefault();
  if (servingCustomers) return;
  const error = Blacksmith.validate(state, plan());
  if (error) { $('validation').textContent = error; return; }
  state = Blacksmith.finishDay(state, plan());
  // Save the resolved day first so refreshing during the scene cannot lose or repeat sales.
  persist(); servingCustomers = true;
  ['quantity', 'price', 'advertising', 'restart-button', 'open-shop'].forEach(id => { $(id).disabled = true; });
  $('phase').textContent = 'SHOP OPEN';
  $('open-shop').innerHTML = 'Serving customers… <span>⚒</span>';
  $('result-label').textContent = `DAY ${state.history.length} · SHOP OPEN`;
  $('result-heading').textContent = 'Adventures start at your counter.';
  $('result-content').className = 'empty-report';
  $('result-content').innerHTML = '<div class="empty-icon">⚔</div><h3>Steel, smiles, and a little gold.</h3><p>Customers are visiting the shop above.<br>Your evening report is on its way.</p>';
  ShopCustomers.play(state.history.at(-1), () => { servingCustomers = false; $('restart-button').disabled = false; render(); });
});
$('skip-customers').addEventListener('click', ShopCustomers.finish);
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
document.querySelector('.dialog-close').addEventListener('click', () => $('help-dialog').close());
$('help-done').addEventListener('click', () => $('help-dialog').close());
$('restart-button').addEventListener('click', () => $('restart-dialog').showModal());
$('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
$('confirm-restart').addEventListener('click', () => { ShopCustomers.reset(); state = Blacksmith.createGame(); $('quantity').value = 10; $('price').value = 10; $('advertising').value = 5; $('restart-dialog').close(); render(); });
render();
