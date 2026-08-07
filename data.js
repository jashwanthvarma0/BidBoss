/* ============================================================
   BIDBOSS — data.js
   Static game data: products, AI trader roster, rank ladder.
   Keeping this isolated makes it trivial to add regions,
   products or AI personalities later without touching logic.
   ============================================================ */

const BIDBOSS_DATA = (() => {

  /* ---------- MARKET PRODUCTS ----------
     volatility  -> max % swing per tick
     trendBias   -> long term drift (-1..1), nudged by events
     category    -> used for iconography / filtering
  */
  const PRODUCTS = [
    { id: "steel",      name: "Steel Billet",        category: "industrial", base: 420,     volatility: 0.03, trendBias: 0.05  },
    { id: "oil",        name: "Crude Oil Barrel",     category: "industrial", base: 78,      volatility: 0.05, trendBias: -0.02 },
    { id: "gold",       name: "Gold Bar (1kg)",       category: "precious",   base: 64500,   volatility: 0.015,trendBias: 0.03  },
    { id: "diamond",    name: "Certified Diamond",    category: "precious",   base: 128000,  volatility: 0.02, trendBias: 0.01  },
    { id: "chip",       name: "Crypto Chip Array",    category: "tech",       base: 9400,    volatility: 0.07, trendBias: 0.08  },
    { id: "server",     name: "AI Server Rack",       category: "tech",       base: 41200,   volatility: 0.06, trendBias: 0.1   },
    { id: "watch",      name: "Vintage Chronograph",  category: "luxury",     base: 18700,   volatility: 0.025,trendBias: 0.02  },
    { id: "painting",   name: "Rare Oil Painting",    category: "luxury",     base: 96500,   volatility: 0.04, trendBias: 0.015 },
    { id: "car",        name: "Antique Roadster",     category: "luxury",     base: 154000,  volatility: 0.03, trendBias: 0.02  },
    { id: "processor",  name: "Quantum Processor",    category: "tech",       base: 210000,  volatility: 0.08, trendBias: 0.12  },
  ];

  /* ---------- AUCTION-ONLY RARE LOTS ----------
     These never appear in the open market — only surface in
     timed auctions, and carry a bigger gap between est. value
     and typical hammer price (the "BIDBOSS moment" payoff).
  */
  const RARE_LOTS = [
    { id: "lot_processor", name: "Rare Quantum Processor",     estValue: 247000, floor: 140000 },
    { id: "lot_masterpiece", name: "Lost Renaissance Sketch",  estValue: 410000, floor: 220000 },
    { id: "lot_meteor",    name: "Certified Meteorite Core",   estValue: 88000,  floor: 45000  },
    { id: "lot_prototype", name: "Prototype AI Core",          estValue: 560000, floor: 310000 },
    { id: "lot_diamond",   name: "Flawless Black Diamond",     estValue: 320000, floor: 175000 },
    { id: "lot_manuscript",name: "18th Century Manuscript",    estValue: 152000, floor: 80000  },
  ];

  /* ---------- AI TRADERS ----------
     bidAggression -> 0..1, chance to raise on any given tick
     bidStep       -> % of current bid they typically raise by
     capital       -> soft cap on how far they'll push a bid
     netWorth      -> tracked live, shown on the Bossboard
  */
  const AI_TRADERS = [
    { id: "shark",      name: "The Shark",      tag: "Aggressive & Wealthy",     bidAggression: 0.72, bidStep: [0.04, 0.09], capital: 900000,  netWorth: 640000 },
    { id: "sniper",     name: "The Sniper",     tag: "Waits, Then Strikes",      bidAggression: 0.30, bidStep: [0.08, 0.15], capital: 700000,  netWorth: 410000 },
    { id: "hustler",    name: "The Hustler",    tag: "Volume Over Value",        bidAggression: 0.55, bidStep: [0.01, 0.03], capital: 250000,  netWorth: 180000 },
    { id: "collector",  name: "The Collector",  tag: "Targets Rare Lots",        bidAggression: 0.48, bidStep: [0.05, 0.10], capital: 600000,  netWorth: 520000 },
    { id: "analyst",    name: "The Analyst",    tag: "Data-Driven",              bidAggression: 0.40, bidStep: [0.02, 0.05], capital: 500000,  netWorth: 350000 },
    { id: "whale",      name: "The Whale",      tag: "Moves Huge Capital",       bidAggression: 0.60, bidStep: [0.10, 0.20], capital: 2200000, netWorth: 1850000},
    { id: "gambler",    name: "The Gambler",    tag: "Enormous Risk Appetite",   bidAggression: 0.66, bidStep: [0.06, 0.18], capital: 450000,  netWorth: 260000 },
    { id: "negotiator", name: "The Negotiator", tag: "Private Deal Specialist",  bidAggression: 0.35, bidStep: [0.03, 0.07], capital: 550000,  netWorth: 400000 },
  ];

  /* ---------- RANK LADDER ----------
     Net-worth thresholds map to the BIDBOSS journey from the
     design doc. `short` is used in compact UI, `title` in full.
  */
  const RANKS = [
    { key: "rookie",       title: "Rookie Trader",        short: "Rookie",     min: 0 },
    { key: "street",       title: "Street Trader",        short: "Street",     min: 5000 },
    { key: "local",        title: "Local Trader",         short: "Local",      min: 15000 },
    { key: "professional", title: "Professional Dealer",  short: "Pro Dealer", min: 50000 },
    { key: "specialist",   title: "Auction Specialist",   short: "Specialist", min: 150000 },
    { key: "owner",        title: "Business Owner",       short: "Owner",      min: 400000 },
    { key: "maker",        title: "Market Maker",         short: "Maker",      min: 1000000 },
    { key: "tycoon",       title: "Business Tycoon",      short: "Tycoon",     min: 3000000 },
    { key: "kingmarket",   title: "Market King",          short: "Mkt King",   min: 8000000 },
    { key: "bidboss",      title: "BIDBOSS",              short: "BIDBOSS",    min: 20000000 },
  ];

  /* ---------- BOSSBOARD TITLES (by rank position, not net worth tier) ----------
     `maxIndex` is the highest 0-based board index (0 = #1 overall) that still
     earns this title. List must stay ordered ascending by maxIndex — the UI
     takes the first tier whose maxIndex is >= the trader's position.
  */
  const BOARD_TITLES = [
    { maxIndex: 0,        title: "Global BidBoss", icon: "💎" },
    { maxIndex: 2,        title: "Trade Titan",    icon: "👑" },
    { maxIndex: 5,        title: "Auction King",   icon: "🥇" },
    { maxIndex: 7,        title: "Market Shark",   icon: "🥈" },
    { maxIndex: Infinity, title: "Trade Hustler",  icon: "🥉" },
  ];

  /* ---------- RANDOM MARKET EVENTS ----------
     Each event nudges one or more product categories.
  */
  const MARKET_EVENTS = [
    { headline: "Factory shutdown cuts steel output",           category: "industrial", impact: 0.18 },
    { headline: "OPEC+ trims oil production quotas",            category: "industrial", impact: 0.12 },
    { headline: "Central bank signals rate hike",                category: "precious",   impact: 0.09 },
    { headline: "New AI chip breakthrough announced",            category: "tech",       impact: 0.22 },
    { headline: "Luxury auction house reports record season",    category: "luxury",     impact: 0.15 },
    { headline: "Global chip shortage eases",                    category: "tech",       impact: -0.14 },
    { headline: "Gold reserves hit record demand",                category: "precious",   impact: 0.11 },
    { headline: "Recession fears spook luxury buyers",            category: "luxury",     impact: -0.13 },
    { headline: "Quantum computing startup raises $2B",           category: "tech",       impact: 0.19 },
    { headline: "Oversupply floods industrial metals market",     category: "industrial", impact: -0.16 },
  ];

  return { PRODUCTS, RARE_LOTS, AI_TRADERS, RANKS, BOARD_TITLES, MARKET_EVENTS };
})();
