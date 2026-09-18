// Shared client-side "watchlist" store, used by both index.html (Your
// Prowl summary) and properties.html (full stalking interface). This is a
// prototype data store only: localStorage is per-browser, not a real
// backend -- a Lovable build would replace this with a real database.
// Property status/value/rental-economics fields below are illustrative
// (no real comparables engine exists yet -- see README).

const PROWL_PROPERTIES_KEY = "prowl_properties_v1";

const DEMO_PROPERTIES = [
  {
    id: "demo-1", name: "The Poiz Residences", area: "Potong Pasir", type: "Condo", bedrooms: 3,
    asking: 2080000, compsLow: 1960000, compsHigh: 2030000, rental: 7200, rentalContracts: 4,
    status: "GET_READY", value: "above", rentalEconomics: "working", confidence: "Medium",
    note: "Asking price has moved closer to comparable value. 4 recent rental contracts support the rental estimate.",
    lastChange: "Asking price reduced from $2.12M to $2.08M",
    demo: true,
  },
  {
    id: "demo-2", name: "The Gazania", area: "Toa Payoh", type: "Condo", bedrooms: 2,
    asking: 1580000, compsLow: 1520000, compsHigh: 1560000, rental: 4800, rentalContracts: 2,
    status: "WATCH", value: "fair", rentalEconomics: "watch", confidence: "Low",
    note: "Fairly priced against comps. Rental sample is thin — treat the estimate with caution.",
    lastChange: "Added to Prowl",
    demo: true,
  },
  {
    id: "demo-3", name: "Sant Ritz", area: "Potong Pasir", type: "Condo", bedrooms: 3,
    asking: 1720000, compsLow: 1680000, compsHigh: 1750000, rental: 5600, rentalContracts: 5,
    status: "OPPORTUNITY", value: "below", rentalEconomics: "strong", confidence: "High",
    note: "Asking sits below the comparable range, and recent rental contracts confirm strong yield support.",
    lastChange: "New comparable transaction recorded at $1.70M",
    demo: true,
  },
];

function prowlLoadProperties() {
  try {
    const raw = localStorage.getItem(PROWL_PROPERTIES_KEY);
    if (!raw) {
      localStorage.setItem(PROWL_PROPERTIES_KEY, JSON.stringify(DEMO_PROPERTIES));
      return DEMO_PROPERTIES.slice();
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEMO_PROPERTIES.slice();
  }
}

function prowlSaveProperties(list) {
  try {
    localStorage.setItem(PROWL_PROPERTIES_KEY, JSON.stringify(list));
  } catch (e) { /* localStorage unavailable -- fail silently, prototype only */ }
}

function prowlAddProperty(entry) {
  const list = prowlLoadProperties();
  list.unshift(Object.assign({
    id: "user-" + Date.now(),
    status: "WATCH", value: "fair", rentalEconomics: "watch", confidence: "Low",
    note: "Just added — no comparable evidence gathered yet.",
    lastChange: "Added to Prowl",
    demo: false,
  }, entry));
  prowlSaveProperties(list);
  return list;
}

function prowlCounts(list) {
  list = list || prowlLoadProperties();
  return {
    total: list.length,
    get_ready: list.filter((p) => p.status === "GET_READY").length,
    opportunity: list.filter((p) => p.status === "OPPORTUNITY").length,
  };
}
