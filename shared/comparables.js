// Property comparables engine -- Tier 1-4 cascade per the brief (section
// 12), running against real URA caveat-level transactions.
//
// Real data limitation, not an oversight: URA's transaction data has no
// bedroom count field, only floor area. The brief's Tier 1/2 criteria call
// for "same bedroom" -- since that field doesn't exist, size similarity
// (±10/15/20% tolerance bands, per the brief's own guidance) substitutes
// for it throughout. Floor range is available but used as a secondary
// note, not a hard filter, also per the brief.
//
// Data source: property-prowl's published transactions_flat.json (district
// + recency filtered to the default watchlist, ~17k rows / 6MB -- see that
// repo's flatten_transactions.py for why, and its README for the full-
// Singapore version). Loaded once and cached in module scope.

const ProwlComparables = (function () {
  const DATA_URL = "https://dolphene.github.io/property-prowl/transactions_flat.json";
  let cache = null; // { rows, latestDate }

  function monthsBetween(a, b) {
    // 'YYYY-MM' strings
    const [ay, am] = a.split("-").map(Number);
    const [by, bm] = b.split("-").map(Number);
    return (by - ay) * 12 + (bm - am);
  }

  async function load() {
    if (cache) return cache;
    const resp = await fetch(DATA_URL);
    const rows = await resp.json();
    const latestDate = rows.reduce((max, r) => (r.contractDate > max ? r.contractDate : max), "0000-00");
    cache = { rows, latestDate };
    return cache;
  }

  function sizeMatch(txArea, targetArea, tolerancePct) {
    if (!targetArea) return true;
    return Math.abs(txArea - targetArea) / targetArea <= tolerancePct;
  }

  function stats(matches) {
    const psfs = matches.map((m) => m.psf).sort((a, b) => a - b);
    const prices = matches.map((m) => m.price).sort((a, b) => a - b);
    const mid = (arr) => arr[Math.floor(arr.length / 2)];
    return {
      count: matches.length,
      psfLow: psfs[0], psfHigh: psfs[psfs.length - 1], psfMedian: mid(psfs),
      priceLow: prices[0], priceHigh: prices[prices.length - 1], priceMedian: mid(prices),
    };
  }

  // target: { name, sizeSqft, district, propertyType }
  async function findComparables(target) {
    const { rows, latestDate } = await load();
    const normName = (s) => (s || "").toUpperCase().trim();
    const targetName = normName(target.name);
    const recentEnough = (r, months) => monthsBetween(r.contractDate, latestDate) <= months;

    // Tier 1: same development, size +-10%, within 12 months
    let matches = rows.filter((r) =>
      normName(r.project) === targetName &&
      sizeMatch(r.area_sqft, target.sizeSqft, 0.10) &&
      recentEnough(r, 12)
    );
    if (matches.length >= 3) {
      return { tier: 1, confidence: "HIGH", ...stats(matches), matches };
    }

    // Tier 2: same development, size +-15%, within 24 months
    matches = rows.filter((r) =>
      normName(r.project) === targetName &&
      sizeMatch(r.area_sqft, target.sizeSqft, 0.15) &&
      recentEnough(r, 24)
    );
    if (matches.length >= 3) {
      return { tier: 2, confidence: "MEDIUM", ...stats(matches), matches };
    }
    if (matches.length >= 1) {
      return { tier: 2, confidence: "LOW", ...stats(matches), matches };
    }

    // Tier 3: nearby development (same district), same property type, size +-20%, within 24 months
    matches = rows.filter((r) =>
      r.district === target.district &&
      (!target.propertyType || r.propertyType === target.propertyType) &&
      sizeMatch(r.area_sqft, target.sizeSqft, 0.20) &&
      recentEnough(r, 24)
    );
    if (matches.length >= 3) {
      return { tier: 3, confidence: "LOW", ...stats(matches), matches };
    }

    // Tier 4: broader district, whatever's in the (already recency-filtered) dataset
    matches = rows.filter((r) => r.district === target.district);
    if (matches.length > 0) {
      return { tier: 4, confidence: "LOW", ...stats(matches), matches };
    }

    return { tier: null, confidence: "NONE", count: 0, matches: [] };
  }

  return { findComparables, load };
})();
