# Alpego's Blacksmith Tycoon

Open **index.html** in a modern browser. No installation, build, or account is needed. Optional Google Fonts fall back to system fonts offline; all artwork and game code are local.

Run a weapon shop for 30 days, starting with 100 gold. Choose a daily mix from this catalog, ordered by highest to lowest normal sale price:

| Weapon | Market price | Crafting cost | Base buyers/day |
| --- | ---: | ---: | ---: |
| Sword | 30 gold | 14 gold | 5 |
| Axe | 22 gold | 10 gold | 7 |
| Spear | 16 gold | 7 gold | 9 |
| Dagger | 10 gold | 4 gold | 12 |

Each weapon has its own quantity, price, stock, and buyers. Prices are whole gold from 1–100. Craft up to **40 weapons total per day**, subject to available cash. Advertising promotes all four weapon lines and has diminishing returns. Buyers depend on that weapon's price relative to its market price, its base demand, the daily market, and a small random variation. Price defaults follow sword > axe > spear > dagger; you can freely adjust them.

Crafting and ads are paid upfront. There are no hidden fees, rent, debt, or refunds. Unsold weapons carry over separately: setting a weapon's crafting quantity to zero still allows it to sell existing stock. The evening report shows sales and remaining stock for each weapon, plus total revenue, crafting, advertising, profit, and remaining cash. The ledger has a daily summary with weapon detail rows; detail expenses are crafting only and advertising is included once in the daily summary. After day 30 the final score is cash; stock has no liquidation value.

Peasants, sellswords, hunters, and witchers visit after opening. They leave carrying the relevant sword, axe, spear, or dagger. One visitor represents each sale on small days. Busy days group purchases across at most 16 visitors; mixed orders show the first weapon, and their payment includes every item. The animated count and revenue still match the exact daily totals. Skip to results at any time; reduced-motion settings skip automatically. Saving the resolved day before the scene prevents a reload from repeating sales.

## Customer satisfaction

Your shop starts at **70/100 satisfaction**. Each completed day records two effects:

- **Prices:** each posted price is compared with that weapon's market price. The relative differences are capped at ±100%, averaged equally across all four lines, and multiplied by 6 (rounded). Discounts help; high prices hurt, even for weapons with no sales. Market prices have a neutral effect.
- **Availability:** meeting all demand adds 4 points. Missing a share of demand reduces that bonus: `round(4 − 16 × unmet demand / total demand)`, down to −12 when no demand is met. Carryover inventory counts. With no demand, this effect is zero.

The score stays between 0 and 100. The overview shows the current score; daily reports and ledger entries show price and inventory effects, requested weapons supplied, and the actual change after the cap. Satisfaction does not alter demand or the final cash score.

## Local save compatibility

The game writes version-4 saves under **alpegos-blacksmith-weapons-v4**. Existing version-3 saves retain their satisfaction scores and complete history; version-2 weapon saves, version-1 dagger saves, and dagger-only saves from the separate upgrades branch also migrate without changing cash, inventory, purchases, or sales. Satisfaction starts at 70 for saves that did not track it; their old ledger entries remain untracked because historical demand was not recorded. Older save keys are left intact. Invalid saves are rejected. Local-file storage depends on browser policy; if unavailable, keep the tab open or serve locally.

## Workshop upgrades

Buy upgrades between days. They apply immediately, stack, persist across reloads, and reset with a new game. Purchases are blocked during customer visits and after day 30.

| Upgrade | Cost | Effect |
| --- | ---: | --- |
| Better anvil | 50 gold | Each weapon costs 1 gold less to craft: sword 13, axe 9, spear 6, dagger 3. |
| Improved forge | 75 gold | Craft up to 60 weapons in total per day instead of 40. |
| Precision vise | 65 gold | Buyers value each weapon as if its price were 2 gold lower. |
| Improved advertising | 50 gold | Paid advertising is treated as 1.5 times the spend before diminishing returns; zero spend still gives no ad boost. |

The vise increases the demand reference by 2 gold without changing the existing satisfaction price formula, which still compares posted prices with the catalog's normal market prices. Anvil and forge affect production. Satisfaction remains based on actual demand and supply.

Upgrades deduct cash immediately and appear in the **Workshop investments** journal. Daily profit covers only crafting and advertising; total profit includes equipment spending: `cash − 100 = sum(daily profits) − sum(upgrade costs)`. Ledger cash is the balance at the close of each day. Reports store each weapon's actual crafting unit cost, so later upgrades never rewrite past expenses. The final score remains cash, with no resale value for equipment or stock.

## Optional local server

With Node.js installed:

```sh
node server.js
```

Visit http://localhost:4173 and stop with Ctrl+C. To preview alongside another branch in PowerShell:

```powershell
$env:PORT = '4175'
node server.js
```

Visit http://localhost:4175. Run checks with `node --test game.test.js` and `node --check app.js` / `node --check customers.js` / `node --check game.js`.

The main project includes weapon varieties, customer satisfaction, workshop upgrades, and visual polish. The visual layer in `polish.css` adds warm parchment colors, more readable controls, report and dialog transitions, richer shop scenery, forge embers, and distinct customer equipment. Walking pauses at the counter, mixed-weapon purchases retain their own sprites, and reduced-motion preferences skip customer playback and disable decorative motion.
