# Alpego's Blacksmith Tycoon

Open **index.html** in any modern web browser. No installation, account, or build step is needed. All game code and artwork are local; optional Google Fonts fall back to system fonts offline.

Start with 100 gold and manage a dagger shop for 30 days. Crafting costs 4 gold per dagger, up to 40 per day. Choose a sale price and advertising budget, then finish the day to see sales, revenue, expenses, profit, and cash. Unsold stock carries over. All spending must be affordable upfront. There are no hidden fees. The final score is cash after day 30; leftover stock is not liquidated.

Demand depends on price, advertising (with diminishing returns), the announced daily market, and a small random variation. There is no guaranteed sale. The full ledger and game progress save in browser local storage when available. If your browser blocks storage for local files, keep the tab open for that session or use the local server below.

When you open shop, peasants, sellswords, hunters, and white-haired witchers walk up to the counter, pay, and leave carrying a dagger. Small sales days show one visitor per dagger; busy days group purchases across up to 16 visitors so the scene stays under six seconds. The counter tracks the exact sales and revenue. Skip straight to results at any time; reduced-motion preferences skip the animation automatically. The day is saved before the scene starts, so reloading cannot duplicate a sale.

Optional local server (Node.js):

```sh
node server.js
```

Then visit http://localhost:4173. Stop with Ctrl+C.

Run the simulation checks with `node --test game.test.js`.
