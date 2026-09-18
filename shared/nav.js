// Shared header (logo + nav + one-line news alert) and footer, injected
// into every page so markup isn't duplicated six times. `current` is set
// per-page via <body data-page="market|properties|map|news|trends|den">.

(function () {
  const PAGES = [
    { key: "market", label: "Market", href: "index.html" },
    { key: "properties", label: "Properties", href: "properties.html" },
    { key: "map", label: "Map", href: "map.html" },
    { key: "news", label: "News", href: "news.html" },
    { key: "trends", label: "Trends", href: "trends.html" },
    { key: "den", label: "The Den 🔒", href: "den.html" },
  ];

  function renderHeader() {
    const current = document.body.dataset.page;
    const navLinks = PAGES.map((p) =>
      `<a href="${p.href}" class="${p.key === current ? "active" : ""}">${p.label}</a>`
    ).join("");

    const newsItems = typeof PROWL_NEWS_ITEMS !== "undefined" ? PROWL_NEWS_ITEMS : null;
    const latestNews = (newsItems && newsItems[0]) || {
      headline: "New private-home sales stayed quiet as launches paused for the seasonal lull.",
    };

    const header = document.createElement("div");
    header.innerHTML = `
      <div class="prowl-header">
        <div class="prowl-header-inner">
          <a href="index.html" class="prowl-logo"><span class="paw">🐾</span>THE PROPERTY PROWL</a>
          <nav class="prowl-nav">${navLinks}</nav>
        </div>
      </div>
      <div class="prowl-alert">📰 Latest: ${latestNews.headline} <a href="news.html">Read more →</a></div>
    `;
    document.body.prepend(header);
  }

  function renderFooter() {
    const footer = document.createElement("div");
    footer.className = "prowl-footer";
    footer.innerHTML = `🐾 The Property Prowl — data first, commentary second. Not financial advice. Data: URA via data.gov.sg. Some signals are illustrative placeholders pending real data sources — see each card.`;
    document.body.appendChild(footer);
  }

  renderHeader();
  document.addEventListener("DOMContentLoaded", renderFooter);
  if (document.readyState !== "loading") renderFooter();
})();
