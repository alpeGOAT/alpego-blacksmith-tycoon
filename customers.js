'use strict';
// Small inline vector characters keep the game self-contained and crisp at any size.
const ShopCustomers = (() => {
  const kinds = [
    { name: 'Peasant', coat: '#b7794c', skin: '#dfb58d', detail: '<path d="M18 24q12-15 24 0v5H18z" fill="#c6a258"/><path d="M12 28h36" stroke="#94753b" stroke-width="4"/><path d="m24 49 13 22H22z" fill="#e2c998"/>' },
    { name: 'Sellsword', coat: '#718084', skin: '#be8d70', detail: '<path d="M18 28v-7q12-17 24 0v7l-8-5H24z" fill="#a3b1ad"/><path d="M29 14v12" stroke="#d4ddd6" stroke-width="3"/><path d="M17 43h26v13H17z" fill="#a3b1ad"/><path d="m20 50 20 20" stroke="#694e3f" stroke-width="4"/><path d="M45 58v24m-5-20h10" stroke="#c2ccc3" stroke-width="3"/>' },
    { name: 'Hunter', coat: '#547657', skin: '#e1b08c', detail: '<path d="m15 27 11-18 17 18-12-4z" fill="#3d6548"/><path d="m33 17 8-12 3 6-9 9" fill="#b86342"/><path d="M16 42 9 71l14-8M42 42l9 29-14-8" fill="#3d6548"/><path d="M49 37q18 23 0 44M49 37v44" stroke="#b28d55" stroke-width="2" fill="none"/>' },
    { name: 'Witcher', coat: '#414f52', skin: '#dfc7af', detail: '<path d="m17 22 2-9 11-5 12 6 3 27-9-5V21l-7-4-8 7v15l-7 3z" fill="#e0dfcf"/><path d="m17 39 24 29m0-29L18 68" stroke="#a5b5af" stroke-width="3"/><path d="m16 43 5 5m18-5-5 5" stroke="#d1b978" stroke-width="3"/><path d="m22 46 16 17m0-17L22 63" stroke="#b4aea0" stroke-width="2"/><circle cx="30" cy="60" r="4" fill="#d0c9ad"/><path d="m34 28 3 10" stroke="#b47b69"/><path d="M23 29h4m6 0h4" stroke="#d3b459" stroke-width="2"/>' }
  ];
  let timers = [], complete = null;
  const $ = id => document.getElementById(id);
  const accessories = {
    Peasant: '<path d="M16 49 5 62l2 17h14l3-18z" fill="#a78d56"/><path d="M9 65h10m-9 6h8" stroke="#d2bb80" stroke-width="2"/><path d="M11 59q-3-9 4-11" stroke="#d2bb80" stroke-width="2" fill="none"/>',
    Sellsword: '<path d="M4 45h17v21q-8 13-17 0z" fill="#8b5745" stroke="#c3b18c" stroke-width="2"/><path d="M12 49v20m-5-12h10" stroke="#d5c79d" stroke-width="2"/>',
    Hunter: '<path d="m11 47 7-2 8 26-8 3z" fill="#8b6b44"/><path d="m12 45-5-18m9 18-2-22" stroke="#b59d66" stroke-width="2"/><path d="m4 29 6-2-4-6m5 4 5-2-5-6" stroke="#d5c48d" stroke-width="2" fill="none"/>',
    Witcher: '<path d="m12 6 31 56M47 7 17 62" stroke="#c4ccc1" stroke-width="3"/><path d="m11 14 8-4m20 1 8 4" stroke="#d5bb76" stroke-width="3"/><path d="m8 0 7 12m32-11-6 12" stroke="#6c5e49" stroke-width="4"/><path d="m19 42-9 32h10m21-32 9 32H40" fill="#35434a"/>'
  };
  function sprite(kind, index) {
    return `<svg viewBox="0 0 60 104" class="customer-sprite" style="--walk-delay:${index % 3 * -.1}s"><ellipse cx="30" cy="98" rx="17" ry="3" fill="#243e3424"/><g class="customer-body">${accessories[kind.name]}<path class="customer-leg leg-left" d="M23 68v22l-5 4h11V68" fill="#444c43"/><path class="customer-leg leg-right" d="M32 68v26h12l-5-4V68" fill="#363e36"/><path d="m21 40-6 27h30l-6-27z" fill="${kind.coat}"/><path d="M20 44 13 61m27-17 7 17" stroke="${kind.coat}" stroke-width="8" stroke-linecap="round"/><path d="M23 33v10h14V33" fill="${kind.skin}"/><rect x="19" y="16" width="23" height="23" rx="10" fill="${kind.skin}"/><path d="M24 28h2m9 0h2" stroke="#33483b" stroke-width="2"/><path d="M27 34q4 3 7 0" stroke="#916950" fill="none"/><path d="M18 64h24" stroke="#574d39" stroke-width="4"/>${kind.detail}<g class="bought-dagger"><path d="m46 50 5-24 3 25-4 5z" fill="#d9e3df" stroke="#748b84"/><path d="m45 53 12 2" stroke="#d3aa56" stroke-width="3"/><path d="m50 55-1 9" stroke="#80533d" stroke-width="4"/></g></g></svg>`;
  }
  function later(callback, delay) { timers.push(setTimeout(callback, delay)); }
  function finish() {
    if (!complete) return;
    timers.forEach(clearTimeout); timers = [];
    $('customer-layer').replaceChildren(); $('street').classList.remove('is-open');
    $('skip-customers').hidden = true;
    const callback = complete; complete = null; callback();
  }
  function reset() {
    finish();
    $('scene-title').textContent = 'A blade for every adventure.';
    $('scene-status').textContent = 'The shutters are up. Open shop to meet your customers.';
    $('scene-tally').textContent = 'PEASANTS · SELLSWORDS · HUNTERS · WITCHERS';
  }
  function play(report, callback) {
    finish();
    complete = () => {
      $('scene-title').textContent = `Day ${report.day} · ${report.sold ? 'The last customer heads home.' : 'The market closes for the evening.'}`;
      $('scene-status').textContent = report.sold ? `${report.sold} daggers found a new owner. Another day’s work, well forged.` : 'No buyers today. Tomorrow is a fresh start.';
      $('scene-tally').textContent = `${report.sold} DAGGERS SOLD · ${report.revenue.toLocaleString()} GOLD EARNED`;
      callback();
    };
    $('scene-title').textContent = `Day ${report.day} · Open for business!`;
    $('scene-status').textContent = report.sold ? 'Here come the adventurers. Good steel travels far.' : 'A quiet day on Market Street. No dagger sales today.';
    $('scene-tally').textContent = '0 DAGGERS SOLD · 0 GOLD EARNED';
    $('skip-customers').hidden = false;
    $('street').classList.add('is-open');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    $('street').scrollIntoView({ behavior: 'smooth', block: 'center' });
    // One visitor per dagger for small days; large orders are grouped to keep it brief.
    const count = Math.min(report.sold, 16), duration = 2600, stagger = 190;
    let sold = 0;
    for (let i = 0; i < count; i++) {
      const kind = kinds[(i + report.day - 1) % kinds.length];
      const amount = Math.floor(report.sold / count) + (i < report.sold % count ? 1 : 0);
      const customer = document.createElement('div');
      customer.className = `customer customer-${kind.name.toLowerCase()}`;
      customer.style.animationDelay = `${i * stagger}ms`;
      customer.innerHTML = `<span class="purchase-pop">+${amount} ⚔ <b>+${amount * report.price} g</b></span>${sprite(kind, i)}<span class="customer-name">${kind.name}</span>`;
      // Nested effects share the arrival delay with the walking animation.
      customer.style.setProperty('--arrival-delay', `${i * stagger}ms`);
      $('customer-layer').append(customer);
      later(() => { sold += amount; $('scene-tally').textContent = `${sold} DAGGERS SOLD · ${(sold * report.price).toLocaleString()} GOLD EARNED`; }, i * stagger + duration * .48);
    }
    later(finish, count ? duration + (count - 1) * stagger + 150 : 1600);
  }
  return { play, finish, reset };
})();
