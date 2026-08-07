/* ============================================================
   BIDBOSS — ui.js
   Pure(ish) rendering functions. Each render* function returns
   an HTML string for a screen or component; main.js decides
   when to call them and wires up events via delegation, so this
   file never needs to know about game state mutation directly.
   ============================================================ */

const UI = (() => {

  const fmt = (n) => {
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    if (n >= 1e9) return sign + "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return sign + "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return sign + "$" + (n / 1e3).toFixed(1) + "K";
    return sign + "$" + n.toFixed(0);
  };
  const fmtFull = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const pct = (n) => (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";

  const categoryIcon = {
    industrial: "⚙", precious: "◆", tech: "◈", luxury: "✦",
  };

  /* ---------------- MAIN MENU ---------------- */
  function renderMainMenu() {
    return `
    <div class="menu-screen">
      <div class="menu-bg">
        <div class="menu-grid"></div>
        <div class="ticker-row" id="menuTicker"></div>
      </div>
      <div class="menu-content">
        <div class="menu-badge">GLOBAL TRADING SIMULATION</div>
        <h1 class="menu-title">BID<span class="menu-title-accent">BOSS</span></h1>
        <p class="menu-tagline">BID. TRADE. <span class="tagline-dominate">DOMINATE.</span></p>
        <button class="btn-play" data-action="play">
          <span>ENTER THE MARKET</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="menu-stats">
          <div class="menu-stat"><span>10</span>Market Goods</div>
          <div class="menu-stat"><span>8</span>Rival Traders</div>
          <div class="menu-stat"><span>10</span>Ranks to BIDBOSS</div>
        </div>
      </div>
    </div>`;
  }

  /* ---------------- APP SHELL / TOPBAR ---------------- */
  function renderTopbar(player, netWorth, rank) {
    return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">B</span>
        <span class="brand-name">BIDBOSS</span>
      </div>
      <nav class="topnav" id="topnav">
        ${navItem("market", "Market")}
        ${navItem("auctions", "Auctions")}
        ${navItem("empire", "Empire")}
        ${navItem("bossboard", "Bossboard")}
        ${navItem("profile", "Profile")}
      </nav>
      <div class="topbar-stats">
        <div class="stat-pill">
          <span class="stat-label">Rank</span>
          <span class="stat-value rank-value">${rank.title}</span>
        </div>
        <div class="stat-pill cash-pill">
          <span class="stat-label">Cash</span>
          <span class="stat-value">${fmtFull(player.cash)}</span>
        </div>
        <div class="stat-pill worth-pill">
          <span class="stat-label">Net Worth</span>
          <span class="stat-value">${fmtFull(netWorth)}</span>
        </div>
      </div>
    </header>`;
  }

  function navItem(key, label) {
    return `<button class="nav-item" data-nav="${key}">${label}</button>`;
  }

  /* ---------------- MARKET SCREEN ---------------- */
  function renderMarket(market, player, filter = "all") {
    const cats = ["all", "industrial", "precious", "tech", "luxury"];
    const filterRow = cats.map(c =>
      `<button class="chip ${c === filter ? "chip-active" : ""}" data-filter="${c}">${c === "all" ? "All Goods" : c[0].toUpperCase() + c.slice(1)}</button>`
    ).join("");

    const products = BIDBOSS_DATA.PRODUCTS.filter(p => filter === "all" || p.category === filter);
    const cards = products.map(p => {
      const price = market.price(p.id);
      const trend = market.trend(p.id);
      const trendClass = trend > 0.0005 ? "trend-up" : trend < -0.0005 ? "trend-down" : "trend-flat";
      const owned = player.inventory[p.id];
      const spark = market.sparkline(p.id, 140, 36);
      const strokeColor = trend >= 0 ? "var(--green)" : "var(--red)";

      return `
      <div class="product-card" data-product="${p.id}">
        <div class="product-card-top">
          <div class="product-cat-icon">${categoryIcon[p.category] || "◆"}</div>
          <div class="product-name-block">
            <div class="product-name">${p.name}</div>
            <div class="product-cat">${p.category}</div>
          </div>
          <div class="product-trend ${trendClass}">${pct(trend)}</div>
        </div>
        <svg class="spark" viewBox="0 0 140 36" preserveAspectRatio="none">
          <polyline points="${spark}" fill="none" stroke="${strokeColor}" stroke-width="2"/>
        </svg>
        <div class="product-card-bottom">
          <div class="product-price">${fmtFull(price)}</div>
          ${owned ? `<div class="owned-tag">Own ${owned.qty.toFixed(2)}</div>` : ""}
        </div>
        <div class="product-actions">
          <button class="btn-mini btn-buy" data-buy="${p.id}">BUY</button>
          <button class="btn-mini btn-sell" data-sell="${p.id}" ${owned ? "" : "disabled"}>SELL</button>
        </div>
      </div>`;
    }).join("");

    const eventBanner = market.activeEvent ? `
      <div class="event-banner">
        <span class="event-dot"></span>
        <span class="event-text"><strong>MARKET NEWS —</strong> ${market.activeEvent.headline}</span>
      </div>` : "";

    return `
    <div class="screen-inner">
      <div class="screen-head">
        <h2>Open Market</h2>
        <p class="screen-sub">Buy low. Sell high. Watch the tape.</p>
      </div>
      ${eventBanner}
      <div class="chip-row">${filterRow}</div>
      <div class="product-grid">${cards}</div>
    </div>`;
  }

  /* ---------------- BUY/SELL MODAL ---------------- */
  function renderTradeModal(mode, product, price, owned) {
    const maxQty = mode === "sell" && owned ? owned.qty : null;
    return `
    <div class="modal-backdrop" data-close="modal">
      <div class="modal-card" data-stop>
        <div class="modal-head">
          <div>
            <div class="modal-eyebrow">${mode === "buy" ? "PLACE ORDER" : "LIQUIDATE"}</div>
            <div class="modal-title">${product.name}</div>
          </div>
          <button class="modal-close" data-close="modal">&times;</button>
        </div>
        <div class="modal-price">${fmtFull(price)} <span>/ unit</span></div>
        <label class="modal-label">Quantity</label>
        <div class="qty-row">
          <button class="qty-btn" data-qty-step="-1">−</button>
          <input type="number" id="tradeQty" class="qty-input" value="1" min="0.01" step="0.01" ${maxQty ? `max="${maxQty}"` : ""}/>
          <button class="qty-btn" data-qty-step="1">+</button>
        </div>
        ${maxQty ? `<button class="link-btn" id="maxQtyBtn">Sell max (${maxQty.toFixed(2)})</button>` : ""}
        <div class="modal-total">
          <span>Total</span>
          <span id="modalTotal">${fmtFull(price)}</span>
        </div>
        <button class="btn-confirm ${mode === "buy" ? "btn-confirm-buy" : "btn-confirm-sell"}" id="confirmTrade" data-mode="${mode}" data-product="${product.id}" data-price="${price}">
          ${mode === "buy" ? "CONFIRM PURCHASE" : "CONFIRM SALE"}
        </button>
      </div>
    </div>`;
  }

  /* ---------------- AUCTIONS SCREEN ---------------- */
  function renderAuctions(engine, player) {
    if (!engine.active) {
      return `
      <div class="screen-inner">
        <div class="screen-head">
          <h2>Auction House</h2>
          <p class="screen-sub">Rare lots surface without warning. Stay sharp.</p>
        </div>
        <div class="auction-idle">
          <div class="auction-idle-ring"></div>
          <div class="auction-idle-text">Next lot goes live in <strong>${engine.cooldown}s</strong></div>
          <div class="auction-idle-sub">Auctioneers are prepping the floor…</div>
        </div>
      </div>`;
    }

    const a = engine.active;
    const bidders = a.participants.map(ai => `
      <div class="bidder-chip ${a.leader === ai.id ? "bidder-leading" : ""}">
        <span class="bidder-name">${ai.name}</span>
        <span class="bidder-tag">${ai.tag}</span>
      </div>`).join("");

    const log = a.bidLog.slice(0, 8).map(l => `
      <div class="bid-log-row ${l.isPlayer ? "bid-log-player" : ""}">
        <span>${l.who}</span><span>${fmtFull(l.amount)}</span>
      </div>`).join("");

    const minNext = Math.round(a.currentBid * 1.03);
    const playerLeading = a.leaderIsPlayer;

    return `
    <div class="screen-inner">
      <div class="screen-head">
        <h2>Auction House</h2>
        <p class="screen-sub">Live lot in progress</p>
      </div>
      <div class="auction-live">
        <div class="auction-main">
          <div class="lot-eyebrow">LOT #${a.lot.id.toUpperCase()}</div>
          <div class="lot-name">${a.lot.name}</div>
          <div class="lot-est">Estimated Value <strong>${fmtFull(a.lot.estValue)}</strong></div>

          <div class="auction-timer ${a.secondsLeft <= 5 ? "timer-critical" : ""}">
            <div class="timer-ring" style="--progress:${(a.secondsLeft / 20) * 100}%">
              <span>${a.secondsLeft}s</span>
            </div>
          </div>

          <div class="current-bid-block">
            <span class="current-bid-label">Current Bid ${playerLeading ? "· <span class='you-lead'>YOU LEAD</span>" : ""}</span>
            <span class="current-bid-amount">${fmtFull(a.currentBid)}</span>
          </div>

          <div class="bid-controls">
            <button class="btn-bid" data-bid="${minNext}">RAISE TO ${fmt(minNext)}</button>
            <button class="btn-bid btn-bid-alt" data-bid="${Math.round(a.currentBid * 1.1)}">RAISE TO ${fmt(Math.round(a.currentBid * 1.1))}</button>
          </div>
          <div class="custom-bid-row">
            <input type="number" id="customBid" placeholder="Custom bid amount" min="${a.currentBid + 1}"/>
            <button class="btn-mini" id="customBidBtn">BID</button>
          </div>
        </div>

        <div class="auction-side">
          <div class="side-title">Bidders (${a.participants.length})</div>
          <div class="bidder-list">${bidders}</div>
          <div class="side-title">Live Log</div>
          <div class="bid-log">${log}</div>
        </div>
      </div>
    </div>`;
  }

  /* ---------------- BIDBOSS MOMENT ---------------- */
  function renderBidbossMoment(lot, finalBid) {
    const gain = lot.estValue - finalBid;
    const gainPositive = gain >= 0;
    return `
    <div class="modal-backdrop bidboss-backdrop" data-close="bidboss">
      <div class="bidboss-card" data-stop>
        <div class="bidboss-shine"></div>
        <div class="bidboss-label">AUCTION COMPLETE</div>
        <div class="bidboss-you-won">YOU WON</div>
        <div class="bidboss-lot-name">${lot.name}</div>
        <div class="bidboss-row">
          <div class="bidboss-figure">
            <span>Final Bid</span>
            <strong>${fmtFull(finalBid)}</strong>
          </div>
          <div class="bidboss-figure">
            <span>Est. Market Value</span>
            <strong>${fmtFull(lot.estValue)}</strong>
          </div>
        </div>
        <div class="bidboss-gain ${gainPositive ? "gain-pos" : "gain-neg"}">
          ${gainPositive ? "Potential Gain" : "Overpaid"} ${fmtFull(Math.abs(gain))}
        </div>
        <div class="bidboss-stamp">BIDBOSS!</div>
        <button class="btn-confirm btn-confirm-buy" data-close="bidboss">CONTINUE TRADING</button>
      </div>
    </div>`;
  }

  function renderAuctionLostToast(winnerName, lotName) {
    return `<div class="toast toast-lost">
      <strong>${winnerName}</strong> won <strong>${lotName}</strong>. Better luck on the next lot.
    </div>`;
  }

  /* ---------------- EMPIRE / INVENTORY SCREEN ---------------- */
  function renderEmpire(player, market) {
    const rows = Object.entries(player.inventory).map(([id, slot]) => {
      const meta = market.productMeta(id);
      const price = market.price(id);
      const value = price * slot.qty;
      const pl = value - (slot.avgCost * slot.qty);
      const plClass = pl >= 0 ? "pl-pos" : "pl-neg";
      return `
      <tr>
        <td>
          <div class="table-name">${categoryIcon[meta.category] || "◆"} ${meta.name}</div>
        </td>
        <td>${slot.qty.toFixed(2)}</td>
        <td>${fmtFull(slot.avgCost)}</td>
        <td>${fmtFull(price)}</td>
        <td>${fmtFull(value)}</td>
        <td class="${plClass}">${pl >= 0 ? "+" : ""}${fmtFull(pl)}</td>
        <td><button class="btn-mini btn-sell" data-sell="${id}">SELL</button></td>
      </tr>`;
    }).join("");

    const empty = Object.keys(player.inventory).length === 0;

    return `
    <div class="screen-inner">
      <div class="screen-head">
        <h2>Your Empire</h2>
        <p class="screen-sub">Everything you currently hold.</p>
      </div>
      ${empty ? `<div class="empty-state">No holdings yet. Head to the Market to make your first move.</div>` : `
      <div class="table-wrap">
        <table class="empire-table">
          <thead><tr><th>Asset</th><th>Qty</th><th>Avg Cost</th><th>Price</th><th>Value</th><th>P/L</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`}
    </div>`;
  }

  /* ---------------- BOSSBOARD ---------------- */
  function renderBossboard(player, netWorth) {
    const entries = BIDBOSS_DATA.AI_TRADERS.map(ai => ({
      name: ai.name, tag: ai.tag, netWorth: ai.netWorth, isPlayer: false,
    }));
    entries.push({ name: "You", tag: "Rising Trader", netWorth, isPlayer: true });
    entries.sort((a, b) => b.netWorth - a.netWorth);

    const rows = entries.map((e, i) => {
      const boardTitle = BIDBOSS_DATA.BOARD_TITLES.find(t => i <= t.maxIndex);
      return `
      <tr class="${e.isPlayer ? "board-row-player" : ""}">
        <td class="board-rank">#${i + 1}</td>
        <td>
          <div class="table-name">${e.name} ${e.isPlayer ? '<span class="you-badge">YOU</span>' : ""}</div>
          <div class="board-tag">${e.tag}</div>
        </td>
        <td class="board-title">${boardTitle.icon} ${boardTitle.title}</td>
        <td class="board-worth">${fmtFull(e.netWorth)}</td>
      </tr>`;
    }).join("");

    return `
    <div class="screen-inner">
      <div class="screen-head">
        <h2>The Bossboard</h2>
        <p class="screen-sub">Global ranking by net worth.</p>
      </div>
      <div class="table-wrap">
        <table class="empire-table board-table">
          <thead><tr><th>#</th><th>Trader</th><th>Title</th><th>Net Worth</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }

  /* ---------------- PROFILE ---------------- */
  function renderProfile(player, netWorth, rank, nextRank, progress) {
    const winRate = player.auctionsEntered > 0
      ? Math.round((player.auctionsWon / player.auctionsEntered) * 100) : 0;

    const historyRows = player.history.slice(0, 12).map(h => `
      <div class="history-row">
        <span class="history-label">${h.label}</span>
        <span class="${h.amount >= 0 ? "pl-pos" : "pl-neg"}">${h.amount >= 0 ? "+" : ""}${fmtFull(h.amount)}</span>
      </div>`).join("") || `<div class="empty-state">No activity yet.</div>`;

    return `
    <div class="screen-inner">
      <div class="screen-head">
        <h2>Profile</h2>
        <p class="screen-sub">Your journey to BIDBOSS.</p>
      </div>

      <div class="rank-card">
        <div class="rank-card-top">
          <div>
            <div class="rank-card-eyebrow">CURRENT RANK</div>
            <div class="rank-card-title">${rank.title}</div>
          </div>
          ${nextRank ? `<div class="rank-card-next">Next: <strong>${nextRank.title}</strong></div>` : `<div class="rank-card-next">MAX RANK</div>`}
        </div>
        <div class="rank-bar"><div class="rank-bar-fill" style="width:${(progress * 100).toFixed(1)}%"></div></div>
        ${nextRank ? `<div class="rank-card-sub">${fmtFull(netWorth)} / ${fmtFull(nextRank.min)}</div>` : ""}
      </div>

      <div class="profile-stats-grid">
        <div class="profile-stat"><span>${fmtFull(player.totalProfit)}</span>Total Trading Profit</div>
        <div class="profile-stat"><span>${player.auctionsWon}</span>Auctions Won</div>
        <div class="profile-stat"><span>${winRate}%</span>Win Rate</div>
        <div class="profile-stat"><span>${player.reputation}</span>Reputation</div>
      </div>

      <div class="screen-head" style="margin-top:28px;">
        <h3>Recent Activity</h3>
      </div>
      <div class="history-list">${historyRows}</div>

      <button class="btn-mini btn-reset" id="resetGameBtn">RESET PROGRESS</button>
    </div>`;
  }

  return {
    fmt, fmtFull, pct,
    renderMainMenu, renderTopbar, renderMarket, renderTradeModal,
    renderAuctions, renderBidbossMoment, renderAuctionLostToast,
    renderEmpire, renderBossboard, renderProfile,
  };
})();
