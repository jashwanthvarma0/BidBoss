/* ============================================================
   BIDBOSS — main.js
   Boots the app, owns the game loop, and wires DOM events to
   the Player / MarketEngine / AuctionEngine via delegation.
   This is the only file that mutates state AND touches the DOM,
   keeping data.js / player.js / market.js / auctions.js / ui.js
   free of cross-concerns.
   ============================================================ */

(() => {
  const root = document.getElementById("app");

  const state = {
    screen: "market",     // market | auctions | empire | bossboard | profile
    marketFilter: "all",
    modal: null,           // { type: 'trade', mode, productId } | { type: 'bidboss', lot, finalBid }
    inGame: false,
  };

  const player = new Player();
  const market = new MarketEngine();
  const auctions = new AuctionEngine(handleAuctionEvent);

  const priceLookup = (id) => market.price(id);

  /* ---------------- BOOT ---------------- */
  function boot() {
    renderMenu();
    startMenuTicker();
  }

  function renderMenu() {
    root.innerHTML = UI.renderMainMenu();
  }

  function startMenuTicker() {
    const el = document.getElementById("menuTicker");
    if (!el) return;
    const items = BIDBOSS_DATA.PRODUCTS.map(p =>
      `${p.name} ${UI.fmt(p.base)}`
    );
    el.innerHTML = [...items, ...items].map(t => `<span>${t}</span>`).join("");
  }

  function enterGame() {
    state.inGame = true;
    renderShell();
    startLoop();
  }

  /* ---------------- SHELL ---------------- */
  function renderShell() {
    root.innerHTML = `
      <div id="topbarSlot"></div>
      <main class="app-main">
        <div class="screen active" id="screenContent"></div>
      </main>
      <div id="modalSlot"></div>
      <div id="toastSlot" class="toast-slot"></div>
    `;
    renderTopbar();
    renderScreen();
  }

  function renderTopbar() {
    const nw = player.netWorth(priceLookup);
    const rank = player.currentRank(nw);
    document.getElementById("topbarSlot").innerHTML = UI.renderTopbar(player, nw, rank);
    document.querySelectorAll("[data-nav]").forEach(btn => {
      btn.classList.toggle("nav-active", btn.dataset.nav === state.screen);
    });
  }

  function renderScreen() {
    const el = document.getElementById("screenContent");
    if (!el) return;
    switch (state.screen) {
      case "market":
        el.innerHTML = UI.renderMarket(market, player, state.marketFilter);
        break;
      case "auctions":
        el.innerHTML = UI.renderAuctions(auctions, player);
        break;
      case "empire":
        el.innerHTML = UI.renderEmpire(player, market);
        break;
      case "bossboard":
        el.innerHTML = UI.renderBossboard(player, player.netWorth(priceLookup));
        break;
      case "profile": {
        const nw = player.netWorth(priceLookup);
        const rank = player.currentRank(nw);
        const nextRank = player.nextRank(nw);
        const progress = player.rankProgress(nw);
        el.innerHTML = UI.renderProfile(player, nw, rank, nextRank, progress);
        break;
      }
    }
    document.querySelectorAll("[data-nav]").forEach(btn => {
      btn.classList.toggle("nav-active", btn.dataset.nav === state.screen);
    });
  }

  /* ---------------- MODALS ---------------- */
  function openTradeModal(mode, productId) {
    const meta = market.productMeta(productId);
    const price = market.price(productId);
    const owned = player.inventory[productId];
    if (mode === "sell" && !owned) return;
    state.modal = { type: "trade", mode, productId };
    document.getElementById("modalSlot").innerHTML = UI.renderTradeModal(mode, meta, price, owned);
    wireTradeModal(price, owned, mode);
  }

  function wireTradeModal(price, owned, mode) {
    const qtyInput = document.getElementById("tradeQty");
    const totalEl = document.getElementById("modalTotal");
    const updateTotal = () => {
      const qty = parseFloat(qtyInput.value) || 0;
      totalEl.textContent = UI.fmtFull(qty * price);
    };
    qtyInput.addEventListener("input", updateTotal);
    document.querySelectorAll("[data-qty-step]").forEach(btn => {
      btn.addEventListener("click", () => {
        const step = parseFloat(btn.dataset.qtyStep);
        let val = (parseFloat(qtyInput.value) || 0) + step;
        qtyInput.value = Math.max(0.01, val).toFixed(2);
        updateTotal();
      });
    });
    const maxBtn = document.getElementById("maxQtyBtn");
    if (maxBtn && owned) {
      maxBtn.addEventListener("click", () => {
        qtyInput.value = owned.qty.toFixed(2);
        updateTotal();
      });
    }
  }

  function closeModal() {
    state.modal = null;
    document.getElementById("modalSlot").innerHTML = "";
  }

  function handleAuctionEvent(evt) {
    if (evt.type === "auction_start") {
      player.auctionsEntered += 1;
    }
    if (evt.type === "auction_end") {
      if (evt.winner === "player") {
        player.acquireLot(evt.lot, evt.finalBid);
        document.getElementById("modalSlot").innerHTML = UI.renderBidbossMoment(evt.lot, evt.finalBid);
        fireConfetti();
      } else {
        const ai = BIDBOSS_DATA.AI_TRADERS.find(t => t.id === evt.winner);
        showToast(UI.renderAuctionLostToast(ai ? ai.name : "A rival trader", evt.lot.name));
      }
    }
  }

  function showToast(html) {
    const slot = document.getElementById("toastSlot");
    if (!slot) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const node = wrap.firstElementChild;
    slot.appendChild(node);
    setTimeout(() => node.classList.add("toast-out"), 3200);
    setTimeout(() => node.remove(), 3700);
  }

  function fireConfetti() {
    document.body.classList.add("flash-gold");
    setTimeout(() => document.body.classList.remove("flash-gold"), 700);
  }

  /* ---------------- EVENT DELEGATION ---------------- */
  document.addEventListener("click", (e) => {
    const playBtn = e.target.closest("[data-action='play']");
    if (playBtn) { enterGame(); return; }

    const navBtn = e.target.closest("[data-nav]");
    if (navBtn) { state.screen = navBtn.dataset.nav; renderScreen(); renderTopbar(); return; }

    const filterBtn = e.target.closest("[data-filter]");
    if (filterBtn) { state.marketFilter = filterBtn.dataset.filter; renderScreen(); return; }

    const buyBtn = e.target.closest("[data-buy]");
    if (buyBtn) { openTradeModal("buy", buyBtn.dataset.buy); return; }

    const sellBtn = e.target.closest("[data-sell]");
    if (sellBtn) { openTradeModal("sell", sellBtn.dataset.sell); return; }

    const productCard = e.target.closest(".product-card");
    if (productCard && !e.target.closest("button")) {
      openTradeModal("buy", productCard.dataset.product); return;
    }

    const closeTarget = e.target.closest("[data-close]");
    if (closeTarget && e.target === closeTarget) { closeModal(); return; }

    const confirmBtn = e.target.closest("#confirmTrade");
    if (confirmBtn) {
      const mode = confirmBtn.dataset.mode;
      const productId = confirmBtn.dataset.product;
      const price = parseFloat(confirmBtn.dataset.price);
      const qty = parseFloat(document.getElementById("tradeQty").value) || 0;
      if (qty <= 0) return;
      if (mode === "buy") {
        const ok = player.buy(productId, qty, price);
        if (!ok) showToast(`<div class="toast toast-error">Not enough cash for that order.</div>`);
      } else {
        player.sell(productId, qty, price);
      }
      closeModal();
      renderScreen();
      renderTopbar();
      return;
    }

    const bidBtn = e.target.closest("[data-bid]");
    if (bidBtn) {
      const amount = parseInt(bidBtn.dataset.bid, 10);
      if (player.cash < amount) { showToast(`<div class="toast toast-error">You can't cover that bid.</div>`); return; }
      auctions.playerBid(amount);
      renderScreen();
      return;
    }

    const customBidBtn = e.target.closest("#customBidBtn");
    if (customBidBtn) {
      const input = document.getElementById("customBid");
      const amount = parseInt(input.value, 10);
      if (!amount) return;
      if (player.cash < amount) { showToast(`<div class="toast toast-error">You can't cover that bid.</div>`); return; }
      auctions.playerBid(amount);
      renderScreen();
      return;
    }

    const resetBtn = e.target.closest("#resetGameBtn");
    if (resetBtn) {
      if (confirm("Reset all progress? This cannot be undone.")) {
        player.reset();
        renderScreen();
        renderTopbar();
      }
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.modal) closeModal();
  });

  /* ---------------- GAME LOOP ---------------- */
  let marketTickCounter = 0;
  function startLoop() {
    setInterval(() => {
      marketTickCounter++;
      if (marketTickCounter % 3 === 0) market.tick(); // prices move every 3s
      auctions.tick();                                 // auction clock every 1s

      // idle drift for AI net worth so the Bossboard feels alive
      if (marketTickCounter % 5 === 0) {
        BIDBOSS_DATA.AI_TRADERS.forEach(ai => {
          const drift = (Math.random() * 2 - 1) * ai.netWorth * 0.004;
          ai.netWorth = Math.max(50000, ai.netWorth + drift);
        });
      }

      if (state.screen === "market" || state.screen === "auctions" || state.screen === "bossboard") {
        renderScreen();
      }
      renderTopbar();
    }, 1000);
  }

  boot();
})();
