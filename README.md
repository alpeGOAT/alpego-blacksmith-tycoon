# Alpego's Blacksmith Tycoon

Download or clone the project, then open [index.html](./index.html) from the project folder in a modern browser. No installation, build, or account is needed. Optional Google Fonts fall back to system fonts offline; all artwork and game code are local.

Run a weapon shop for 30 days, starting with 100 gold. Choose a daily mix from this catalog, ordered by highest to lowest normal sale price:

| Weapon | Market price | Crafting cost | Base buyers/day |
| --- | ---: | ---: | ---: |
| Sword | 30 gold | 14 gold | 5 |
| Axe | 22 gold | 10 gold | 7 |
| Spear | 16 gold | 7 gold | 9 |
| Dagger | 10 gold | 4 gold | 12 |

Each weapon has its own quantity, price, stock, and buyers. Prices are whole gold from 1–100. Craft up to **20 weapons total per day at forge level 0**, subject to available cash. Advertising promotes stocked weapons and has diminishing returns. Buyers depend on that weapon's price relative to its market price, its base demand, the daily market, and a small random variation. The market can request **up to 60 weapons total per day**, divided proportionally among weapons offered when demand would exceed that limit. Price defaults follow sword > axe > spear > dagger; you can freely adjust them.

Crafting and ads are paid upfront. There are no hidden fees, rent, debt, or refunds. Unsold weapons carry over separately: setting a weapon's crafting quantity to zero still allows it to sell existing stock. The evening report shows sales and remaining stock for each weapon, plus total revenue, crafting, advertising, profit, and remaining cash. The ledger has a daily summary with weapon detail rows; detail expenses are crafting only and advertising is included once in the daily summary. The game ends after day 30, or earlier if the shop has no stock and cannot afford its cheapest weapon. The final score is remaining cash. Stock has no liquidation value.

Peasants, sellswords, hunters, and witchers visit after opening. They leave carrying the relevant sword, axe, spear, or dagger. One visitor represents each sale on small days. Busy days group purchases across at most 16 visitors; mixed orders show the first weapon, and their payment includes every item. The animated count and revenue still match the exact daily totals. Skip to results at any time; reduced-motion settings skip automatically. Saving the resolved day before the scene prevents a reload from repeating sales.

## Customer satisfaction

Your shop starts at **70/100 satisfaction**. Each completed day records two effects:

- **Prices:** prices count only for weapons available when the shop opens, including carryover stock. Each relative difference `(market price − posted price) / market price` is capped at ±100%. The game averages these differences, multiplies by 6, and rounds. Market prices are neutral.
- **Availability:** only weapons available at opening count. The game uses `round(4 − 8 × unmet demand / total demand)`, from +4 when all demand is filled to −4 when none is filled. Offering no weapons costs 4 points. Offering weapons with zero demand has a neutral availability effect.

The score stays between 0 and 100. The overview shows the current score; the evening report shows price and inventory effects, requested weapons supplied, and the actual change after the cap. Satisfaction details are omitted from the shop ledger. The opening satisfaction score multiplies each weapon’s demand before rounding: `1 + (score − 50) × 0.006`. Scores 0/25/50/75/100 give −30%/−15%/0%/+15%/+30%; the starting score of 70 gives +12%. Each evening’s updated score affects the following day, alongside market conditions, prices, advertising and upgrades. Sales remain capped by stock. The overview shows today’s modifier and the evening report shows tomorrow’s modifier. Customer sprites represent purchases (grouped above 16), rather than a separate count of all visitors. Historical reports retain the satisfaction calculation that was in effect when they were created. Final score remains cash.

## Local save compatibility

The game writes version-5 saves under **alpegos-blacksmith-weapons-v5**. Existing version-4 saves migrate with their 40/60-weapon capacity preserved as forge level 1/2. Existing version-3 saves retain their satisfaction scores and complete history; version-2 weapon saves, version-1 dagger saves, and dagger-only saves from the separate upgrades branch also migrate without changing cash, inventory, purchases, or sales. Satisfaction starts at 70 for saves that did not track it; their old ledger entries remain untracked because historical demand was not recorded. Older save keys are left intact. Invalid saves are rejected. Before a tab writes, it checks whether another tab has changed the save. If so, it loads the latest state and asks you to review it before retrying the action. Browsers with Web Locks also serialize simultaneous writes. Local-file storage depends on browser policy; if unavailable, keep the tab open or serve locally.

## Workshop upgrades

Buy upgrades between days. The anvil has three purchasable levels; the forge starts at level 0 with two upgrades. Other upgrades are purchased once. They apply immediately, stack, persist across reloads, and reset with a new game. Existing anvil purchases count as level 1. Purchases are blocked during customer visits and after day 30.

| Upgrade | Cost | Effect |
| --- | ---: | --- |
| Better anvil | 50 gold per level, 150 total | Three levels reduce each weapon’s crafting cost by 1, 2, then 3 gold. Level 1 costs: 13/9/6/3; level 2: 12/8/5/2; level 3: 11/7/4/1 for sword/axe/spear/dagger. |
| Improved forge | Level 0 included; 75 gold each for levels 1 and 2 | Daily capacity: level 0 = 20, level 1 = 40, level 2 = 60 weapons total. |
| Precision vise | 65 gold | Buyers value each weapon as if its price were 2 gold lower. |
| Improved advertising | 50 gold | Paid advertising is treated as 1.5 times the spend before diminishing returns; zero spend still gives no ad boost. |

The vise increases the demand reference by 2 gold without changing the existing satisfaction price formula, which still compares posted prices with the catalog's normal market prices. Anvil and forge affect production. Satisfaction remains based on actual demand and supply.

Upgrades deduct cash immediately and appear in the **Workshop investments** journal. Daily profit covers only crafting and advertising; total profit includes equipment spending: `cash − 100 = sum(daily profits) − sum(upgrade costs)`. Ledger cash is the balance at the close of each day. Reports store each weapon's actual crafting unit cost, so later upgrades never rewrite past expenses. The final score remains cash, with no resale value for equipment or stock.

## Background music

Use **Music: Off / Music: On** in the top-right corner to play or pause **Medieval: The Old Tower Inn** by RandomMind. It starts off on each page load, repeats while enabled, and continues across game days. There is no volume control. A local MP3 is preferred for compatibility, with the original WAV loop as a fallback. No internet connection is required for the bundled audio. Some browser previews restrict media when opening HTML files directly; if playback fails, run `node server.js` and open http://localhost:4173. Source and CC0 license details are in `assets/audio/CREDITS.md`.

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
