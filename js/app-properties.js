(function () {
  const VALUE_LABEL = { below: "BELOW COMPS", fair: "FAIR", above: "ABOVE COMPS" };
  const RENTAL_LABEL = { weak: "WEAK", watch: "WATCH", working: "WORKING", strong: "STRONG" };

  function grossYield(p) {
    if (!p.rental || !p.asking) return null;
    return (p.rental * 12 / p.asking * 100);
  }

  function card(p) {
    const y = grossYield(p);
    return `
      <div class="property-card" data-status="${p.status}" data-type="${p.type || ""}" data-area="${p.area}" data-bedrooms="${p.bedrooms}" data-rental="${p.rentalEconomics}">
        <div class="dev-name">${p.name}</div>
        <div class="meta">${p.bedrooms}-bed · ${p.area}${p.type ? " · " + p.type : ""}</div>
        <div class="tag-row">
          <span class="tag status-${p.status.toLowerCase()}">${p.status.replace("_", " ")}</span>
          <span class="tag value-${p.value}">${VALUE_LABEL[p.value] || "FAIR"}</span>
        </div>
        <div class="price-row"><span>Asking</span><b>$${(p.asking / 1e6).toFixed(2)}M</b></div>
        ${p.compsLow ? `<div class="price-row"><span>Comparable range</span><b>$${(p.compsLow / 1e6).toFixed(2)}M–$${(p.compsHigh / 1e6).toFixed(2)}M</b></div>` : ""}
        ${p.rental ? `<div class="price-row"><span>Rental / yield</span><b>$${p.rental.toLocaleString()} · ${y.toFixed(1)}%</b></div>` : ""}
        <div class="tag-row"><span class="tag" style="background:var(--surface-2);color:var(--text-secondary);">RENTAL: ${RENTAL_LABEL[p.rentalEconomics] || "WATCH"}</span></div>
        <div class="note">${p.note}</div>
        <div class="confidence">Confidence: ${p.confidence}${p.demo ? " · Illustrative example" : ""}</div>
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
  document.getElementById("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    prowlAddProperty({
      name: document.getElementById("inName").value,
      area: document.getElementById("inArea").value,
      bedrooms: Number(document.getElementById("inBedrooms").value) || 3,
      asking: Number(document.getElementById("inAsking").value) || 0,
      url: document.getElementById("inUrl").value,
      type: "",
    });
    e.target.reset();
    document.getElementById("addPanel").style.display = "none";
    render();
  });

  render();
})();
