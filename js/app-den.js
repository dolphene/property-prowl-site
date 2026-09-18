(function () {
  document.getElementById("btnEnter").addEventListener("click", () => {
    document.getElementById("gate").style.display = "none";
    document.getElementById("denContent").style.display = "block";
    renderDynamic();
  });

  function renderDynamic() {
    // Why We Haven't Bought Yet -- grounded in the real current market state.
    const d = typeof PROWL_SITE_DATA !== "undefined" ? PROWL_SITE_DATA : null;
    if (d) {
      document.getElementById("whyNotYet").textContent =
        `Market is currently ${d.market_state.replace("_", " ")} — ${d.translation.body}`;
    }

    // thesis (localStorage)
    const thesisEl = document.getElementById("thesisText");
    thesisEl.value = localStorage.getItem("prowl_den_thesis") || "";
    document.getElementById("btnSaveThesis").addEventListener("click", () => {
      try { localStorage.setItem("prowl_den_thesis", thesisEl.value); } catch (e) {}
    });

    renderJournal();
    document.getElementById("btnAddJournal").addEventListener("click", () => {
      const text = document.getElementById("journalEntry").value.trim();
      if (!text) return;
      const list = loadJournal();
      list.unshift({ date: new Date().toISOString().slice(0, 10), text });
      saveJournal(list);
      document.getElementById("journalEntry").value = "";
      renderJournal();
    });
  }

  function loadJournal() {
    try { return JSON.parse(localStorage.getItem("prowl_den_journal") || "[]"); } catch (e) { return []; }
  }
  function saveJournal(list) {
    try { localStorage.setItem("prowl_den_journal", JSON.stringify(list)); } catch (e) {}
  }
  function renderJournal() {
    const list = loadJournal();
    document.getElementById("journalList").innerHTML = list.length
      ? list.map((e) => `<div class="wc-card" style="margin-bottom:8px;"><div class="title">${e.date}</div><div class="detail">${e.text}</div></div>`).join("")
      : `<p class="desc">No entries yet.</p>`;
  }
})();
