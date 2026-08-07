/* ============================================================
   BIDBOSS — market.js
   Drives live price simulation for the open market. Each tick,
   every product drifts by trendBias plus random noise scaled
   by volatility. Active MarketEvents apply a temporary skew to
   an entire category, decaying back to normal over time.
   ============================================================ */

class MarketEngine {
  constructor() {
    this.prices = {};       // productId -> current price
    this.history = {};      // productId -> [last N prices] for sparklines
    this.activeEvent = null;// { headline, category, impact, ticksLeft }
    this.tickCount = 0;

    BIDBOSS_DATA.PRODUCTS.forEach(p => {
      this.prices[p.id] = p.base;
      this.history[p.id] = [p.base];
    });
  }

  productMeta(id) {
    return BIDBOSS_DATA.PRODUCTS.find(p => p.id === id);
  }

  price(id) {
    return this.prices[id];
  }

  trend(id) {
    const h = this.history[id];
    if (!h || h.length < 2) return 0;
    const prev = h[h.length - 2];
    const cur = h[h.length - 1];
    return (cur - prev) / prev;
  }

  /* advance the whole market by one tick */
  tick() {
    this.tickCount++;

    // maybe spawn a new event
    if (!this.activeEvent && Math.random() < 0.12) {
      const template = BIDBOSS_DATA.MARKET_EVENTS[
        Math.floor(Math.random() * BIDBOSS_DATA.MARKET_EVENTS.length)
      ];
      this.activeEvent = { ...template, ticksLeft: 8 + Math.floor(Math.random() * 6) };
    }

    BIDBOSS_DATA.PRODUCTS.forEach(p => {
      let price = this.prices[p.id];
      const noise = (Math.random() * 2 - 1) * p.volatility;
      let drift = p.trendBias * 0.01;

      if (this.activeEvent && this.activeEvent.category === p.category) {
        drift += this.activeEvent.impact * 0.02;
      }

      price = price * (1 + noise + drift);
      price = Math.max(p.base * 0.25, price); // price floor so nothing goes to zero

      this.prices[p.id] = price;
      const h = this.history[p.id];
      h.push(price);
      if (h.length > 30) h.shift();
    });

    if (this.activeEvent) {
      this.activeEvent.ticksLeft--;
      if (this.activeEvent.ticksLeft <= 0) this.activeEvent = null;
    }
  }

  sparkline(id, width = 60, height = 20) {
    const h = this.history[id];
    if (h.length < 2) return "";
    const min = Math.min(...h);
    const max = Math.max(...h);
    const range = (max - min) || 1;
    const step = width / (h.length - 1);
    return h.map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - ((v - min) / range) * height).toFixed(1);
      return `${x},${y}`;
    }).join(" ");
  }
}
