# The Property Prowl — marketing site (2nd build)

A second, separate static site implementing the full Property Prowl brand/UX brief (Market / Properties / Map / News / Trends / The Den), built to eventually go to Lovable as its own project — separate from `../property-prowl`, which is the plain data/calibration dashboard.

**Scope chosen (per user direction):** full V1 multi-page site, built now with the real data we have, and clearly-labeled illustrative placeholders everywhere we don't yet have a real data source. Ask before assuming placeholder content is real.

## Live, automated (as of 2026-09-18)

Both projects are on GitHub and refresh themselves automatically twice a week via GitHub Actions — no manual script-running needed anymore:

- **property-prowl**: https://github.com/dolphene/property-prowl (public) — fetches data.gov.sg, rebuilds the master dataset + signals, publishes `https://dolphene.github.io/property-prowl/master_quarterly_signals.json`. Runs Mon & Thu 22:00 UTC.
- **property-prowl-site**: https://github.com/dolphene/property-prowl-site (public, this repo) — fetches property-prowl's published JSON, computes market state / six signals / What Changed / translation, publishes `https://dolphene.github.io/property-prowl-site/site-data.json`. Runs Tue & Fri 02:00 UTC (a few hours after property-prowl).

Both can also be triggered manually: `gh workflow run refresh-data.yml -R dolphene/<repo>`.

### For Lovable

**Fetch `https://dolphene.github.io/property-prowl-site/site-data.json` client-side at runtime.** It's already fully computed — market_state, all six signals (with `real: true/false` flags), what_changed, translation, and the full 2006–2026 history for charts — so the Lovable app doesn't need to reimplement any of the derivation logic, just render this JSON. Re-fetch it on page load (or poll every few hours) to stay current; no auth/key needed, it's a public static file.

### Adding the URA key later

Once the AccessKey arrives (`https://www.ura.gov.sg/maps/api/reg.html`), add it once:

```
gh secret set URA_ACCESS_KEY -R dolphene/property-prowl
```

(pastes the value interactively, or pipe it in). The workflow already checks for this secret and will start pulling vacancy/pipeline data automatically on the next scheduled run — **but** `property-prowl/scripts/fetch_ura_api.py` still needs its `DATASET_ENDPOINTS` filled in first (the auth flow is implemented; the exact dataset URLs couldn't be verified without a real key — see that script's docstring for what to do once you can see the real API reference).

## How the two projects share data

They are NOT two copies of the same analysis. There is one pipeline:

```
data.gov.sg (URA)
  → property-prowl/scripts/*.py           (fetch, merge, calibrate, classify)
  → property-prowl's published JSON       (GitHub Pages, see above) <- single source of truth
  → scripts/build_site_data.py            (THIS project, reshapes it for the brand UI)
  → shared/data.js + docs/site-data.json  (local prototype + Pages-published, for Lovable)
```

`scripts/build_site_data.py` reads from `PROWL_DATA_URL` (used in CI, points at property-prowl's live JSON) if set, otherwise falls back to the local sibling-folder CSV (`../property-prowl/data/processed/master_quarterly_signals.csv`) for offline local dev. It never re-derives price/rent/liquidity numbers itself.

Because each site will eventually be uploaded to Lovable as an independent project, `shared/data.js` is a **generated, self-contained copy** — not a live cross-project reference. Re-generate it after any upstream pipeline change; don't hand-edit it.

## What's REAL data (from the URA pipeline)

- **Price Pressure** signal — live, from `price_all_yoy_pct` / `_qoq_pct` / `_4q_trend_pct`.
- **Rental Resilience** signal — live, from `price_rent_divergence_yoy_pts` (Non-Landed price vs rent pair).
- **Liquidity** signal — live, from `txn_total_yoy_pct`.
- **Market state** (WATCH / STALKING / GET_READY / OPPORTUNITY) — the same v3-renamed classifier from `property-prowl`, calibrated against 2008-09 GFC.
- **What Changed** cards on the Market page — computed from real QoQ deltas each time `build_site_data.py` runs.
- **Market Trend / Trends page charts** — the same 2006–2026 historical series as the first dashboard.
- **Map** — real Singapore coordinates for the 10 default watch areas (Leaflet + OpenStreetMap tiles, no API key). Marker fill reflects how many stalked properties are in that area.

## What's ILLUSTRATIVE placeholder (per user's explicit choice, not hidden)

- **Vacancy, Supply Pressure, Financing** signals — no data source exists yet (URA API key pending; SORA/financing data was never sourced). Their card text is lifted verbatim from the brief's own example copy and flagged `real: false` in `shared/data.js`; the UI shows an "Illustrative" badge on each.
- **All property cards** (comparables, rental evidence, yield, status, value position, confidence) — there is no comparables-matching engine or transaction-level property data (Bucket B, still pending the URA key). Three demo properties ship pre-seeded in the client-side store so the UI isn't empty; anything you add manually starts at Low confidence with a "no evidence gathered yet" note, honestly.
- **News digest** — five example stories written to match the brief's required 4-part format (What happened / Why it matters / Signal affected / What to watch next). Not a live feed.
- **Trends page vacancy/supply chart** — a labeled empty placeholder box, not a fake chart with invented numbers.

## What's NOT built at all (scope explicitly deferred, not silently skipped)

- **The Den's authentication is not real.** The gate is a single button with an explicit on-page warning that there is no auth behind it. Do not put real personal data behind it until real auth (Supabase Auth, Lovable's built-in auth, etc.) is wired up.
- **Property comparables tiering** (Tier 1–4, size/floor tolerance logic) — needs transaction-level data we don't have yet.
- **Landed / EC / New Launch special methodologies** (section 30) — not built; would need the same transaction-level data plus development-specific metadata.
- **Risk appetite toggle** (Conservative/Balanced/Opportunistic) — not built; would change property-level thresholds we don't compute yet.
- **Negotiation reference bands, rental-yield-at-different-prices table, two-horizon test, future-supply-nearby analysis** — all depend on the property comparables engine above.
- **Market Snapshots** in The Den — would need periodic archiving of market state over time; not built.
- **Map overlays** beyond area markers (developments, transactions, MRT, TOP dates, rental yield) — explicitly deferred per the brief's own "can initially be a lighter version" allowance.

## Local development

```
python -m http.server 8732     # from this folder
```

Then open `http://localhost:8732/index.html`. All pages are plain static HTML/CSS/JS — no build step, no framework, no dependency beyond Leaflet (CDN, map.html only).

## State naming (v3)

WATCH (calm default) → STALKING (momentum decelerating, early warning) → GET_READY (confirmed correction, still falling) → OPPORTUNITY (deep correction + liquidity turning). Full threshold reasoning lives in `../property-prowl/scripts/signal_thresholds.py`.
