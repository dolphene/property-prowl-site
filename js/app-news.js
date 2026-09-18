(function () {
  const CATEGORY_COLOR = {
    "Property": "good", "Supply": "serious", "Rates & Financing": "good",
    "Singapore Economy": "neutral", "Global Macro": "neutral",
  };

  function storyCard(s) {
    const tier = CATEGORY_COLOR[s.category] || "neutral";
    return `
      <div class="panel">
        <div class="tag-row" style="margin-bottom:8px;">
          <span class="tag" style="background:var(--surface-2);color:var(--text-secondary);">${s.category}</span>
          <span style="font-size:11px;color:var(--text-muted);align-self:center;">${s.date}</span>
        </div>
        <h2 style="margin-bottom:4px;">${s.headline}</h2>
        <p class="desc" style="margin-bottom:14px;">${s.source}</p>
        <div class="wc-grid">
          <div class="wc-card"><div class="title">WHAT HAPPENED?</div><div class="detail">${s.what_happened}</div></div>
          <div class="wc-card"><div class="title">WHY IT MATTERS</div><div class="detail">${s.why_it_matters}</div></div>
          <div class="wc-card"><div class="title">SIGNAL AFFECTED</div><div class="detail"><span class="status-${tier}" style="font-weight:700;">${s.signal_affected}</span></div></div>
          <div class="wc-card"><div class="title">WHAT TO WATCH NEXT</div><div class="detail">${s.what_to_watch_next}</div></div>
        </div>
      </div>
    `;
  }

  document.getElementById("newsList").innerHTML = PROWL_NEWS_ITEMS.map(storyCard).join("");
})();
