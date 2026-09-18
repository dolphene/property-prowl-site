(function () {
  const d = PROWL_SITE_DATA;
  const latest = d.latest;

  const STATE_META = {
    WATCH:       { tier: "neutral",  emoji: "⚪", label: "Watch" },
    STALKING:    { tier: "warning",  emoji: "🟡", label: "Stalking" },
    GET_READY:   { tier: "serious",  emoji: "🟠", label: "Get Ready" },
    OPPORTUNITY: { tier: "good",     emoji: "🟢", label: "Opportunity" },
  };

  // ---------- state card ----------
  function renderStateCard() {
    const meta = STATE_META[d.market_state] || STATE_META.WATCH;
    document.getElementById("stateCard").innerHTML = `
      <div class="state-card">
        <div class="state-name">${meta.emoji} ${meta.label.toUpperCase()}</div>
        <p>${d.translation.body}</p>
      </div>
    `;
  }

  // ---------- what changed ----------
  function renderWhatChanged() {
    const html = d.what_changed.map((c) => `
      <div class="wc-card">
        <div class="title">${c.title}</div>
        <div class="detail">${c.detail}</div>
      </div>
    `).join("");
    document.getElementById("wcGrid").innerHTML = html || `<div class="wc-card"><div class="detail">No notable changes this quarter.</div></div>`;
  }

  // ---------- six signals ----------
  const SIGNAL_META = [
    { key: "price_pressure", icon: "🏠", name: "Price Pressure", question: "What are private-property prices doing?" },
    { key: "rental_resilience", icon: "💰", name: "Rental Resilience", question: "Are rents holding up relative to prices?" },
    { key: "vacancy", icon: "🏢", name: "Vacancy", question: "Is vacancy rising alongside falling rents?" },
    { key: "supply_pressure", icon: "🏗️", name: "Supply Pressure", question: "How much new supply is competing for demand?" },
    { key: "liquidity", icon: "🔄", name: "Liquidity", question: "Are buyers actually transacting?" },
    { key: "financing", icon: "💳", name: "Financing", question: "Are borrowing costs helping or hurting?" },
  ];

  function realDetail(key) {
    switch (key) {
      case "price_pressure":
        return `Private residential prices are ${latest.price_all_yoy_pct >= 0 ? "up" : "down"} ${Math.abs(latest.price_all_yoy_pct).toFixed(1)}% YoY, ${latest.price_all_qoq_pct >= 0 ? "+" : ""}${latest.price_all_qoq_pct.toFixed(1)}% QoQ in ${latest.quarter}.`;
      case "rental_resilience": {
        const div = latest.price_rent_divergence_yoy_pts;
        return div <= 0
          ? `Rents are keeping pace with or outrunning prices (${Math.abs(div).toFixed(1)} pt gap) — a sign yields are holding or improving.`
          : `Prices are outrunning rents by ${div.toFixed(1)} points YoY — yields are compressing slightly.`;
      }
      case "liquidity":
        return `${Math.round(latest.txn_total).toLocaleString()} units transacted in ${latest.quarter}, ${latest.txn_total_yoy_pct >= 0 ? "+" : ""}${latest.txn_total_yoy_pct.toFixed(0)}% YoY.`;
      default:
        return "";
    }
  }

  function renderSignals() {
    const html = SIGNAL_META.map((m) => {
      const sig = d.signals[m.key];
      const detail = sig.real ? realDetail(m.key) : sig.detail;
      return `
        <div class="signal-card">
          ${sig.real ? "" : `<span class="badge-illustrative">Illustrative</span>`}
          <div class="icon-row">
            <span class="name">${m.icon} ${m.name}</span>
          </div>
          <span class="status-pill pill-${sig.tier}"><span class="dot dot-${sig.tier}"></span><span class="status-${sig.tier}">${sig.headline} ${sig.arrow}</span></span>
          <div class="question">${m.question}</div>
          <div class="detail">${detail}</div>
        </div>
      `;
    }).join("");
    document.getElementById("signalGrid").innerHTML = html;
  }

  // ---------- your prowl ----------
  function renderYourProwl() {
    const list = prowlLoadProperties();
    const counts = prowlCounts(list);
    const top = list.filter((p) => p.status === "OPPORTUNITY" || p.status === "GET_READY").slice(0, 2);
    const cardsHtml = top.map((p) => `
      <div class="property-card">
        <div class="dev-name">${p.name}</div>
        <div class="meta">${p.bedrooms}-bed · ${p.area}</div>
        <div class="tag-row"><span class="tag status-${p.status.toLowerCase()}">${p.status.replace("_", " ")}</span></div>
        <div class="price-row"><span>Asking</span><b>$${(p.asking / 1e6).toFixed(2)}M</b></div>
      </div>
    `).join("");
    document.getElementById("yourProwlPanel").innerHTML = `
      <h2>YOUR PROWL</h2>
      <p class="desc">${counts.total} propert${counts.total === 1 ? "y" : "ies"} being stalked · <b>${counts.get_ready}</b> Get Ready · <b>${counts.opportunity}</b> Opportunity</p>
      <div class="property-grid">${cardsHtml || `<div class="wc-card">Nothing flagged right now — <a href="properties.html">go stalk something</a>.</div>`}</div>
      <p style="margin-top:14px;"><a href="properties.html">View full watchlist →</a></p>
    `;
  }

  // ---------- market trend chart ----------
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function renderTrend() {
    document.getElementById("trendLegend").innerHTML = `
      <span class="item"><span class="swatch" style="background:${cssVar("--series-1")}"></span>All Residential</span>
      <span class="item"><span class="swatch" style="background:${cssVar("--series-2")}"></span>CCR</span>
      <span class="item"><span class="swatch" style="background:${cssVar("--series-3")}"></span>RCR</span>
      <span class="item"><span class="swatch" style="background:${cssVar("--series-4")}"></span>OCR</span>
    `;
    ProwlCharts.renderLineChart(document.getElementById("trendChart"), d.history, [
      { key: "price_all", label: "All Residential", color: cssVar("--series-1") },
      { key: "price_ccr", label: "CCR", color: cssVar("--series-2") },
      { key: "price_rcr", label: "RCR", color: cssVar("--series-3") },
      { key: "price_ocr", label: "OCR", color: cssVar("--series-4") },
    ], { height: 300, ariaLabel: "Private price index by region, 2006 to 2026" });
  }

  // ---------- translation ----------
  function renderTranslation() {
    document.getElementById("translationCard").innerHTML = `
      <div class="translation-card">
        <div class="headline">PROWL TRANSLATION</div>
        <div class="body">${d.translation.headline}</div>
        <span class="tag">${d.translation.translation}</span>
      </div>
    `;
  }

  renderStateCard();
  renderWhatChanged();
  renderSignals();
  renderYourProwl();
  renderTrend();
  renderTranslation();
})();
