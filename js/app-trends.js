(function () {
  const d = PROWL_SITE_DATA;
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  document.getElementById("legendPrice").innerHTML = `
    <span class="item"><span class="swatch" style="background:${cssVar("--series-1")}"></span>All Residential</span>
    <span class="item"><span class="swatch" style="background:${cssVar("--series-2")}"></span>CCR</span>
    <span class="item"><span class="swatch" style="background:${cssVar("--series-3")}"></span>RCR</span>
    <span class="item"><span class="swatch" style="background:${cssVar("--series-4")}"></span>OCR</span>
  `;
  ProwlCharts.renderLineChart(document.getElementById("chartPrice"), d.history, [
    { key: "price_all", label: "All Residential", color: cssVar("--series-1") },
    { key: "price_ccr", label: "CCR", color: cssVar("--series-2") },
    { key: "price_rcr", label: "RCR", color: cssVar("--series-3") },
    { key: "price_ocr", label: "OCR", color: cssVar("--series-4") },
  ], { height: 300 });

  document.getElementById("legendRent").innerHTML = `
    <span class="item"><span class="swatch" style="background:${cssVar("--series-1")}"></span>Non-Landed price</span>
    <span class="item"><span class="swatch" style="background:${cssVar("--series-2")}"></span>Non-Landed rent</span>
  `;
  ProwlCharts.renderLineChart(document.getElementById("chartRent"), d.history, [
    { key: "price_nonlanded", label: "Price (Non-Landed)", color: cssVar("--series-1") },
    { key: "rent_nonlanded", label: "Rent (Non-Landed)", color: cssVar("--series-2") },
  ], { height: 260 });

  ProwlCharts.renderBarChart(document.getElementById("chartLiquidity"), d.history, "txn_total", { label: "Units transacted" });
})();
