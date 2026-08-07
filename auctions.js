/* ============================================================
   BIDBOSS — auctions.js
   Runs one auction "lot" at a time. AI traders evaluate the
   current bid against their personality (aggression, capital,
   step size) each tick and may raise. The player can jump in
   with a manual bid. When the clock hits zero, the highest
   bidder wins the lot.
   ============================================================ */

class AuctionEngine {
  constructor(onEvent) {
    this.onEvent = onEvent || (() => {});
    this.active = null;
    this.cooldown = 6; // ticks until next auction can start
  }

  /* pick a lot and spin up a fresh auction */
  startAuction() {
    const lot = BIDBOSS_DATA.RARE_LOTS[
      Math.floor(Math.random() * BIDBOSS_DATA.RARE_LOTS.length)
    ];
    // 3-5 AI traders participate per lot, weighted toward collectors on rare items
    const pool = [...BIDBOSS_DATA.AI_TRADERS];
    const participants = [];
    const count = 3 + Math.floor(Math.random() * 3);
    while (participants.length < count && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      participants.push({ ...pool.splice(idx, 1)[0] });
    }

    this.active = {
      lot,
      participants,
      currentBid: lot.floor,
      leader: participants[Math.random() < 0.5 ? 0 : 1]?.id || participants[0].id,
      leaderIsPlayer: false,
      secondsLeft: 20,
      bidLog: [{ who: participants[0].name, amount: lot.floor, isPlayer: false }],
      resolved: false,
    };
    this.onEvent({ type: "auction_start", lot });
  }

  playerBid(amount) {
    const a = this.active;
    if (!a || a.resolved) return false;
    if (amount <= a.currentBid) return false;
    a.currentBid = amount;
    a.leader = "player";
    a.leaderIsPlayer = true;
    a.bidLog.unshift({ who: "You", amount, isPlayer: true });
    if (a.bidLog.length > 20) a.bidLog.length = 20;
    // bidding war adds urgency: shave a little time when player jumps in late
    if (a.secondsLeft > 6) a.secondsLeft = Math.max(6, a.secondsLeft - 1);
    this.onEvent({ type: "bid", amount, who: "You" });
    return true;
  }

  /* advance the auction clock by one second; call every tick */
  tick() {
    if (!this.active) {
      if (this.cooldown > 0) { this.cooldown--; return; }
      this.startAuction();
      return;
    }
    const a = this.active;
    if (a.resolved) return;

    // AI decision pass
    a.participants.forEach(ai => {
      if (a.leader === ai.id) return; // already leading, no need to raise self
      if (a.currentBid >= ai.capital) return; // priced out
      const urgency = a.secondsLeft < 6 ? 1.6 : 1; // AIs get more decisive near the end
      const willBid = Math.random() < ai.bidAggression * 0.35 * urgency;
      if (!willBid) return;
      const [minStep, maxStep] = ai.bidStep;
      const stepPct = minStep + Math.random() * (maxStep - minStep);
      let newBid = a.currentBid * (1 + stepPct);
      newBid = Math.min(newBid, ai.capital);
      if (newBid <= a.currentBid) return;
      a.currentBid = Math.round(newBid);
      a.leader = ai.id;
      a.leaderIsPlayer = false;
      a.bidLog.unshift({ who: ai.name, amount: a.currentBid, isPlayer: false });
      if (a.bidLog.length > 20) a.bidLog.length = 20;
    });

    a.secondsLeft--;
    if (a.secondsLeft <= 0) {
      this.resolve();
    }
  }

  resolve() {
    const a = this.active;
    if (!a) return;
    a.resolved = true;
    const winner = a.leaderIsPlayer ? "player" : a.leader;
    this.onEvent({ type: "auction_end", lot: a.lot, winner, finalBid: a.currentBid });

    // bump the winning AI's tracked net worth so the Bossboard stays alive
    if (winner !== "player") {
      const ai = BIDBOSS_DATA.AI_TRADERS.find(t => t.id === winner);
      if (ai) ai.netWorth += Math.round(a.lot.estValue - a.currentBid);
    }

    this.active = null;
    this.cooldown = 10 + Math.floor(Math.random() * 8);
  }
}
