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

## Local save compatibility

The game writes version-2 saves under **alpegos-blacksmith-weapons-v2**. If no weapon save exists, it reads the original **alpegos-blacksmith-v1** save and migrates the existing ledger, cash, seed, day, and dagger stock without replaying any sales. The other three stocks start at zero. The original dagger-only save is left intact. Invalid saves are rejected. Local-file storage depends on browser policy; if unavailable, keep the tab open or serve locally.

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

The main project includes weapon varieties. Shop upgrades and visual polish remain separate on their own feature branches.
