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

## Workshop upgrades (isolated feature branch)

This branch adds four one-time investments, purchased between days. They apply immediately, persist across reloads, and reset with a new game:

| Upgrade | Cost | Effect |
| --- | ---: | --- |
| Better anvil | 50 gold | Crafting costs 3 gold per dagger instead of 4. |
| Improved forge | 75 gold | Daily crafting capacity rises from 40 to 60. |
| Precision vise | 65 gold | Price-sensitive demand uses a market reference of 12 gold instead of 10. |
| Improved advertising | 50 gold | Advertising reach uses `sqrt(advertising × 1.5)` instead of `sqrt(advertising)`. No free benefit at zero spend. |

Demand remains `round((12 + 4 × sqrt(adSpend × adReach)) × marketFactor × exp((marketPrice − salePrice) / 7) × dailyVariation)`, capped by available inventory. Anvil and forge affect production only. All upgrades stack, have one level, require sufficient cash, and cannot be purchased during customer visits or after day 30.

Upgrades deduct cash immediately and appear in a separate **Workshop investments** journal. Daily expenses/profit still cover the day's crafting and advertising; total profit includes upgrade spending: `cash − 100 = sum(daily profits) − sum(upgrade costs)`. Ledger cash is the balance at that day's close. Upgrades have no resale value at the final score.

Save version 2 retains the existing storage key. Valid version-1 saves migrate automatically, preserving cash, inventory, seeds, and history; each historical report receives its original 4-gold unit cost. Version-2 reports store their crafting unit cost. The purchase journal records the upgrade, exact cost, and number of completed days at purchase. Save validation replays purchases and daily accounting chronologically, rejecting inconsistent or duplicate purchases.

For an isolated preview alongside other branches, set `PORT=4175` in your environment before running `node server.js`. No dependency installation or build is needed.
