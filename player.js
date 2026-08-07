/* ============================================================
   BIDBOSS — player.js
   Owns player state: cash, inventory, reputation, rank.
   Persists to localStorage so a session survives a refresh.
   ============================================================ */

class Player {
  constructor() {
    this.name = "You";
    this.cash = 5000;
    this.inventory = {};        // { productId: { qty, avgCost } }
    this.reputation = 50;       // 0-100
    this.auctionsWon = 0;
    this.auctionsEntered = 0;
    this.totalProfit = 0;
    this.history = [];          // { t, type, label, amount }
    this.load();
  }

  /* ---------- persistence ---------- */
  save() {
    try {
      localStorage.setItem("bidboss_save", JSON.stringify({
        name: this.name, cash: this.cash, inventory: this.inventory,
        reputation: this.reputation, auctionsWon: this.auctionsWon,
        auctionsEntered: this.auctionsEntered, totalProfit: this.totalProfit,
        history: this.history.slice(-40),
      }));
    } catch (e) { /* storage unavailable, ignore silently */ }
  }

  load() {
    try {
      const raw = localStorage.getItem("bidboss_save");
      if (!raw) return;
      const s = JSON.parse(raw);
      Object.assign(this, s);
    } catch (e) { /* corrupt or missing save, start fresh */ }
  }

  reset() {
    localStorage.removeItem("bidboss_save");
    this.cash = 5000;
    this.inventory = {};
    this.reputation = 50;
    this.auctionsWon = 0;
    this.auctionsEntered = 0;
    this.totalProfit = 0;
    this.history = [];
    this.save();
  }

  /* ---------- trading ---------- */
  canAfford(amount) { return this.cash >= amount; }

  buy(productId, qty, unitPrice) {
    const cost = qty * unitPrice;
    if (!this.canAfford(cost)) return false;
    this.cash -= cost;
    const slot = this.inventory[productId] || { qty: 0, avgCost: 0 };
    const totalCost = slot.avgCost * slot.qty + cost;
    slot.qty += qty;
    slot.avgCost = totalCost / slot.qty;
    this.inventory[productId] = slot;
    this.logEvent("buy", `Bought ${qty}× ${productId}`, -cost);
    this.save();
    return true;
  }

  sell(productId, qty, unitPrice) {
    const slot = this.inventory[productId];
    if (!slot || slot.qty < qty) return false;
    const revenue = qty * unitPrice;
    const costBasis = slot.avgCost * qty;
    slot.qty -= qty;
    if (slot.qty <= 0.0001) delete this.inventory[productId];
    this.cash += revenue;
    this.totalProfit += (revenue - costBasis);
    this.logEvent("sell", `Sold ${qty}× ${productId}`, revenue);
    this.save();
    return revenue - costBasis;
  }

  /* called after winning an auction lot (not held as tradeable inventory,
     but folded into net worth via a direct cash-equivalent asset entry) */
  acquireLot(lot, price) {
    this.cash -= price;
    this.reputation = Math.min(100, this.reputation + 3);
    this.auctionsWon += 1;
    this.logEvent("auction_win", `Won "${lot.name}"`, -price);
    this.save();
  }

  logEvent(type, label, amount) {
    this.history.unshift({ t: Date.now(), type, label, amount });
    if (this.history.length > 60) this.history.length = 60;
  }

  /* ---------- valuation ---------- */
  inventoryValue(priceLookup) {
    let total = 0;
    for (const [id, slot] of Object.entries(this.inventory)) {
      const price = priceLookup(id);
      total += (price || slot.avgCost) * slot.qty;
    }
    return total;
  }

  netWorth(priceLookup) {
    return this.cash + this.inventoryValue(priceLookup);
  }

  /* ---------- rank ---------- */
  currentRank(netWorth) {
    const ranks = BIDBOSS_DATA.RANKS;
    let current = ranks[0];
    for (const r of ranks) {
      if (netWorth >= r.min) current = r; else break;
    }
    return current;
  }

  nextRank(netWorth) {
    const ranks = BIDBOSS_DATA.RANKS;
    for (const r of ranks) {
      if (netWorth < r.min) return r;
    }
    return null; // maxed out
  }

  rankProgress(netWorth) {
    const ranks = BIDBOSS_DATA.RANKS;
    const cur = this.currentRank(netWorth);
    const next = this.nextRank(netWorth);
    if (!next) return 1;
    const span = next.min - cur.min;
    const progressed = netWorth - cur.min;
    return Math.max(0, Math.min(1, progressed / span));
  }
}
