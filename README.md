# BIDBOSS — *Bid. Trade. Dominate.*

A playable browser build of the BIDBOSS trading & auction empire concept. Pure HTML/CSS/JS — no build step, no dependencies, no server required to run.

---

## 🚀 Running it

**Option 1 — just open it**
Double-click `index.html`. Everything (fonts pulled from Google Fonts, no other network calls) loads client-side.

**Option 2 — local server (recommended for clients/demos)**
```bash
cd bidboss
python3 -m http.server 8080
# then open http://localhost:8080
```
Any static server works (VS Code Live Server, `npx serve`, etc.).

**Deploying**: the whole folder is static — drop it on Netlify, Vercel, GitHub Pages, S3, or any web host as-is.

---

## 📁 File structure

```
bidboss/
├── index.html              # Entry point, loads CSS + JS in dependency order
├── css/
│   ├── variables.css        # Design tokens: colors, fonts, radii, shadows
│   ├── base.css              # Resets + global element defaults
│   ├── layout.css            # Structural layout (menu, app shell, grids)
│   ├── components.css        # Every reusable component (cards, modals, tables…)
│   └── animations.css        # All @keyframes in one place
├── js/
│   ├── data.js                # Static game data: products, AI traders, rank ladder
│   ├── player.js               # Player state, inventory, net worth, rank logic
│   ├── market.js                # Live price simulation engine
│   ├── auctions.js              # Auction engine + AI bidder decision logic
│   ├── ui.js                     # Pure render functions (state → HTML strings)
│   └── main.js                    # Boot, game loop, DOM event wiring
└── README.md
```

The split mirrors a typical production front-end: **data → state → simulation → rendering → controller**, so each concern can be extended independently (e.g. swapping `ui.js` for a React renderer later would touch no other file).

---

## 🎮 What's implemented (MVP slice of the full design doc)

- **Main menu** — animated grid background, ticking price tape, brand moment.
- **Open Market** — 10 tradeable goods across 4 categories, live price ticks every 3s with per-product volatility/trend, sparkline charts, category filters, buy/sell modal with quantity stepper.
- **Auction House** — timed rare-lot auctions (20s clock), 3–5 AI bidders per lot drawn from 8 named personalities (Shark, Sniper, Hustler, Collector, Analyst, Whale, Gambler, Negotiator) each with distinct aggression/step/capital, live bid log, custom bid input, and the signature **"BIDBOSS!" win moment** (final bid vs. est. value, gain/loss reveal).
- **Empire** — inventory table with live P/L per holding.
- **Bossboard** — global leaderboard ranking the player against all 8 AI traders by net worth, with tiered titles (Trade Hustler → Market Shark → Auction King → Trade Titan → Global BidBoss).
- **Profile** — rank progress bar through the full 10-tier journey (Rookie Trader → … → BIDBOSS), stats, recent activity feed, reset option.
- **Persistence** — progress saves to `localStorage` automatically; refreshing the page resumes your session.
- **Market events** — random headlines periodically skew an entire category's prices for a stretch, mirroring the "factory shutdown → steel shortage" chain from the design doc.

## 🔜 Natural next slices (not built yet, architecture supports them)

- Multiple regions/trade routes (data.js already models products by category — add a `region` dimension and a transport-cost function in market.js).
- Employees/companies/warehouses (Empire screen is the obvious place to extend).
- Multiplayer/player-vs-player auctions (auctions.js's AI participant list can be swapped for real players via a backend).
- Sound design for the BIDBOSS moment (animations.css already isolates the win-modal keyframes for easy audio hook-in).

---

## 🎨 Design system

Palette: near-black voids and graphite panels, **electric green** for live/positive data, **gold** reserved strictly for premium moments (auction wins, rank titles, legendary lots) — matching the brief's "use gold sparingly" direction.

Type: **Chakra Petch** (display/headings — angular, technical), **JetBrains Mono** (all numeric data — prices, timers, bids), **Manrope** (body/UI text). All tokens live in `css/variables.css`.
