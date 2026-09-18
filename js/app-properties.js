(function () {
  const VALUE_LABEL = { unusually_below: "UNUSUALLY BELOW COMPS", below: "BELOW COMPS", fair: "FAIR", above: "ABOVE COMPS" };
  const RENTAL_LABEL = { weak: "WEAK", watch: "WATCH", working: "WORKING", strong: "STRONG" };
  const TIER_LABEL = { 1: "Tier 1 (same development, ≤12mo)", 2: "Tier 2 (same development, ≤24mo)", 3: "Tier 3 (nearby, same type, ≤24mo)", 4: "Tier 4 (broader district)" };

  function grossYield(p) {
    if (!p.rental || !p.asking) return null;
    return (p.rental * 12 / p.asking * 100);
  }

  function card(p) {
    const y = grossYield(p);
    const valueCss = p.value === "unusually_below" ? "below" : p.value;
    return `
      <div class="property-card" data-status="${p.status}" data-type="${p.type || ""}" data-area="${p.area}" data-bedrooms="${p.bedrooms}" data-rental="${p.rentalEconomics}">
        <div class="dev-name">${p.name}</div>
        <div class="meta">${p.bedrooms}-bed · ${p.area}${p.type ? " · " + p.type : ""}${p.sizeSqft ? " · " + p.sizeSqft + " sqft" : ""}</div>
        <div class="tag-row">
          <span class="tag status-${p.status.toLowerCase()}">${p.status.replace("_", " ")}</span>
          <span class="tag value-${valueCss}">${VALUE_LABEL[p.value] || "FAIR"}</span>
        </div>
        <div class="price-row"><span>Asking</span><b>$${(p.asking / 1e6).toFixed(2)}M</b></div>
        ${p.compsLow ? `<div class="price-row"><span>Comparable range</span><b>$${(p.compsLow / 1e6).toFixed(2)}M–$${(p.compsHigh / 1e6).toFixed(2)}M</b></div>` : ""}
        ${p.psfLow ? `<div class="price-row"><span>Comparable PSF</span><b>$${Math.round(p.psfLow).toLocaleString()}–$${Math.round(p.psfHigh).toLocaleString()} psf</b></div>` : ""}
        ${p.rental ? `<div class="price-row"><span>Rental / yield</span><b>$${p.rental.toLocaleString()} · ${y.toFixed(1)}%</b></div>` : ""}
        <div class="tag-row"><span class="tag" style="background:var(--surface-2);color:var(--text-secondary);">RENTAL: ${RENTAL_LABEL[p.rentalEconomics] || "WATCH"}</span></div>
        <div class="note">${p.note}</div>
        <div class="confidence">Confidence: ${p.confidence}${p.demo ? " · Illustrative example" : " · Real URA comparables"}</div>
      </div>
    `;
  }

  function render() {
    const list = prowlLoadProperties();
    const loc = document.getElementById("fLocation").value;
    const type = document.getElementById("fType").value;
    const bedrooms = document.getElementById("fBedrooms").value;
    const status = document.getElementById("fStatus").value;
    const rental = document.getElementById("fRental").value;

    const filtered = list.filter((p) =>
      (!loc || p.area === loc) &&
      (!type || p.type === type) &&
      (!bedrooms || String(p.bedrooms) === bedrooms) &&
      (!status || p.status === status) &&
      (!rental || p.rentalEconomics === rental)
    );

    document.getElementById("propertyGrid").innerHTML = filtered.length
      ? filtered.map(card).join("")
      : `<div class="wc-card">No properties match these filters yet.</div>`;
  }

  ["fLocation", "fType", "fBedrooms", "fStatus", "fRental"].forEach((id) =>
    document.getElementById(id).addEventListener("change", render)
  );

  document.getElementById("btnAdd").addEventListener("click", () => {
    document.getElementById("addPanel").style.display = "block";
  });
  document.getElementById("btnCancelAdd").addEventListener("click", () => {
    document.getElementById("addPanel").style.display = "none";
  });
  function deriveStatusAndValue(askingPsf, comps) {
    if (!comps || comps.tier === null) {
      return { value: "fair", status: "WATCH", note: "No comparable transactions found in the default watch-area dataset for this development/district. Try a project inside Serangoon, Kovan, Bartley, Bishan, Thomson, Toa Payoh, Potong Pasir, Paya Lebar, MacPherson or Katong." };
    }
    let value = "fair";
    if (askingPsf !== null) {
      if (askingPsf < comps.psfLow * 0.9) value = "unusually_below";
      else if (askingPsf < comps.psfLow) value = "below";
      else if (askingPsf > comps.psfHigh) value = "above";
    }
    let status = "WATCH";
    if (value === "unusually_below" && (comps.confidence === "HIGH" || comps.confidence === "MEDIUM")) status = "OPPORTUNITY";
    else if (value === "below" || value === "unusually_below") status = "GET_READY";
    else if (comps.tier <= 2) status = "STALKING";

    const tierLabel = TIER_LABEL[comps.tier] || "";
    const psfNote = askingPsf !== null
      ? `Asking $${Math.round(askingPsf).toLocaleString()} psf vs comparable range $${Math.round(comps.psfLow).toLocaleString()}–$${Math.round(comps.psfHigh).toLocaleString()} psf.`
      : "No size given, so asking price couldn't be compared on a psf basis.";
    const note = `Matched ${comps.count} real transaction${comps.count === 1 ? "" : "s"} — ${tierLabel}. ${psfNote}`;

    return { value, status, note };
  }

  document.getElementById("addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("addStatus");
    statusEl.textContent = "Matching against real URA transactions...";

    const name = document.getElementById("inName").value;
    const area = document.getElementById("inArea").value;
    const sizeSqft = Number(document.getElementById("inSize").value) || null;
    const propertyType = document.getElementById("inPropertyType").value;
    const asking = Number(document.getElementById("inAsking").value) || 0;
    const district = PROWL_AREA_DISTRICT[area];

    let comps = null;
    try {
      comps = await ProwlComparables.findComparables({ name, sizeSqft, district, propertyType });
    } catch (err) {
      statusEl.textContent = "Comparables lookup failed (network?) — added with no evidence.";
    }

    const askingPsf = sizeSqft ? asking / sizeSqft : null;
    const { value, status, note } = deriveStatusAndValue(askingPsf, comps);

    prowlAddProperty({
      name, area, sizeSqft, propertyType,
      type: propertyType,
      bedrooms: Number(document.getElementById("inBedrooms").value) || 3,
      asking,
      url: document.getElementById("inUrl").value,
      value, status, note,
      compsLow: comps && comps.priceLow, compsHigh: comps && comps.priceHigh,
      psfLow: comps && comps.psfLow, psfHigh: comps && comps.psfHigh,
      confidence: comps ? comps.confidence.charAt(0) + comps.confidence.slice(1).toLowerCase() : "Low",
      rentalEconomics: "watch",
    });
    e.target.reset();
    statusEl.textContent = "";
    document.getElementById("addPanel").style.display = "none";
    render();
  });

  render();
})();
