"""
Build shared/data.js for The Property Prowl marketing site FROM the
already-analysed data in the sibling `property-prowl` project -- this
script never re-derives price/rent/liquidity numbers itself, it only
reads property-prowl's finished output (master_quarterly_signals.csv) and
reshapes it for the six-signal cards, "What Changed", and the historical
charts. That's the "shared analytics" link between the two projects: one
pipeline, two front ends.

Vacancy, Supply Pressure, and Financing have no real data source yet (URA
API key pending; financing/SORA was never sourced). Per user direction,
those three signal cards use ILLUSTRATIVE placeholder content lifted
directly from the product brief's own example text, clearly flagged
`"real": false` so the front end can badge them "Illustrative -- not live
data". Price Pressure, Rental Resilience, and Liquidity are fully real,
computed from the same master dataset as the first dashboard.

Data source: by default reads the sibling property-prowl project's local
CSV (for local dev, where both folders sit side by side). Set the
PROWL_DATA_URL env var to instead fetch property-prowl's published JSON
(e.g. https://dolphene.github.io/property-prowl/master_quarterly_signals.json)
-- this is what CI uses, since it avoids checking out two repos just to
read one file.
"""
import csv
import json
import os
import urllib.request
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent.parent / "property-prowl" / "data" / "processed"
OUT_PATH = Path(__file__).resolve().parent.parent / "shared" / "data.js"
DATA_URL = os.environ.get("PROWL_DATA_URL")

NUMERIC_SUFFIXES = ("_pct", "_pts", "_index")
NUMERIC_EXACT = {
    "price_all", "price_landed", "price_nonlanded", "price_ccr", "price_rcr", "price_ocr",
    "rent_all", "rent_landed", "rent_nonlanded", "rent_ccr", "rent_rcr", "rent_ocr",
    "txn_new_sale_completed", "txn_new_sale_uncompleted", "txn_new_sale_total",
    "txn_resale", "txn_subsale", "txn_total",
    "dev_sales_completed_stock", "dev_sales_new_ccr", "dev_sales_new_rcr", "dev_sales_new_ocr", "dev_sales_new_total",
}


def to_value(key, raw):
    if raw in ("", None):
        return None
    if key.endswith(NUMERIC_SUFFIXES) or key in NUMERIC_EXACT:
        try:
            return float(raw)
        except ValueError:
            return None
    return raw


def load_history():
    if DATA_URL:
        with urllib.request.urlopen(DATA_URL) as resp:
            rows = json.loads(resp.read())
    else:
        with (SRC_DIR / "master_quarterly_signals.csv").open(encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    return [{k: to_value(k, v) for k, v in row.items()} for row in rows]


def price_pressure(latest):
    yoy, trend, qoq = latest["price_all_yoy_pct"], latest["price_all_4q_trend_pct"], latest["price_all_qoq_pct"]
    if yoy is None:
        return {"tier": "neutral", "arrow": "→", "headline": "No data"}
    if yoy < -5 and (qoq or 0) <= 0:
        return {"tier": "critical", "arrow": "↓", "headline": "Falling"}
    if yoy < 0 and (qoq or 0) > 0:
        return {"tier": "good", "arrow": "↑", "headline": "Stabilising"}
    if yoy > 8:
        return {"tier": "serious", "arrow": "↑", "headline": "Elevated"}
    if trend is not None and trend < yoy / 3:
        return {"tier": "warning", "arrow": "↓", "headline": "Moderating"}
    return {"tier": "good", "arrow": "→", "headline": "Flat"}


def rental_resilience(latest):
    div = latest["price_rent_divergence_yoy_pts"]
    if div is None:
        return {"tier": "neutral", "arrow": "→", "headline": "No data"}
    if div <= -2:
        return {"tier": "good", "arrow": "↑", "headline": "Improving"}
    if div >= 4:
        return {"tier": "warning", "arrow": "↓", "headline": "Compressing"}
    return {"tier": "good", "arrow": "→", "headline": "Holding"}


def liquidity(latest):
    yoy = latest["txn_total_yoy_pct"]
    if yoy is None:
        return {"tier": "neutral", "arrow": "→", "headline": "No data"}
    if yoy < -15:
        return {"tier": "serious", "arrow": "↓", "headline": "Slowing"}
    if yoy > 30:
        return {"tier": "warning", "arrow": "↑", "headline": "Heating up"}
    return {"tier": "good", "arrow": "→", "headline": "Normalising"}


TRANSLATIONS = {
    "WATCH": {
        "headline": "Nothing urgent here. Keep stalking from a distance.",
        "body": "Prices, rents and liquidity are all behaving normally for this market. No confirmed pattern worth acting on yet.",
        "translation": "Not interesting yet. Keep an eye out, don't change your routine.",
    },
    "STALKING": {
        "headline": "Something's starting to shift. Worth closing the distance.",
        "body": "Price momentum is decelerating or has turned mildly negative. Nothing confirmed, but this is the kind of pattern that preceded real corrections before.",
        "translation": "Getting more interesting. Start paying closer attention.",
    },
    "GET_READY": {
        "headline": "The market is genuinely correcting. Do your homework now.",
        "body": "Prices are falling year-on-year and still actively declining quarter over quarter. No sign of a floor yet.",
        "translation": "Confirmed correction. Get your numbers and shortlist ready.",
    },
    "OPPORTUNITY": {
        "headline": "Prices are still falling, but buyers are already coming back.",
        "body": "This is the rare combination: a deep price correction alongside transaction volumes that have already turned up -- historically the signature of the trough, not the middle of the crash.",
        "translation": "This is the buying window. Do the work. Then pounce.",
    },
}

# Illustrative-only content for the three signals with no real data source yet.
# Lifted verbatim from the product brief's own example text (section 9),
# not invented -- flagged real: false throughout.
PLACEHOLDER_SIGNALS = {
    "vacancy": {"tier": "warning", "arrow": "↑", "headline": "Rising", "detail": "Private residential vacancy reached 6.4%.", "real": False},
    "supply_pressure": {"tier": "serious", "arrow": "↑", "headline": "Elevated", "detail": "Units under construction and GLS pipeline remain high relative to absorption.", "real": False},
    "financing": {"tier": "good", "arrow": "↓", "headline": "Easier", "detail": "SORA and mortgage rates have been trending down.", "real": False},
}


def what_changed(latest, prev):
    items = []
    if latest["price_all_qoq_pct"] is not None:
        direction = "rose" if latest["price_all_qoq_pct"] >= 0 else "fell"
        items.append({
            "title": "Prices " + ("moderating" if 0 <= latest["price_all_qoq_pct"] < 1 else ("slowing" if latest["price_all_qoq_pct"] < 0 else "rising")),
            "detail": f"Private residential prices {direction} {abs(latest['price_all_qoq_pct']):.1f}% QoQ in {latest['quarter']}.",
        })
    regions = [("CCR", latest["price_ccr_qoq_pct"]), ("RCR", latest["price_rcr_qoq_pct"]), ("OCR", latest["price_ocr_qoq_pct"])]
    regions = [r for r in regions if r[1] is not None]
    if regions:
        name, val = min(regions, key=lambda r: r[1])
        items.append({
            "title": f"{name} {'softer' if val < 0 else 'firmer'}",
            "detail": f"{name} non-landed prices {'fell' if val < 0 else 'rose'} {abs(val):.1f}% QoQ, the weakest of the three regions this quarter.",
        })
    if latest["txn_total_yoy_pct"] is not None:
        items.append({
            "title": "Liquidity " + ("cooling" if latest["txn_total_yoy_pct"] < 0 else "active"),
            "detail": f"Transaction volume is {'down' if latest['txn_total_yoy_pct'] < 0 else 'up'} {abs(latest['txn_total_yoy_pct']):.0f}% YoY in {latest['quarter']}.",
        })
    return items


def main():
    history = load_history()
    latest = history[-1]

    signals = {
        "price_pressure": {**price_pressure(latest), "real": True},
        "rental_resilience": {**rental_resilience(latest), "real": True},
        "liquidity": {**liquidity(latest), "real": True},
        **PLACEHOLDER_SIGNALS,
    }

    state = latest["prowl_signal"] or "WATCH"
    translation = TRANSLATIONS.get(state, TRANSLATIONS["WATCH"])

    site_data = {
        "generated_from": DATA_URL or "property-prowl/data/processed/master_quarterly_signals.csv (local)",
        "latest_quarter": latest["quarter"],
        "market_state": state,
        "translation": translation,
        "signals": signals,
        "what_changed": what_changed(latest, history[-2] if len(history) > 1 else None),
        "latest": latest,
        "history": history,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        f.write("const PROWL_SITE_DATA = ")
        json.dump(site_data, f, indent=None)
        f.write(";\n")

    # Plain JSON (no JS wrapper) published via GitHub Pages, for Lovable (or
    # anything else) to fetch directly at runtime -- already fully computed
    # (state, six signals, translation), so the consumer doesn't need to
    # reimplement any of the derivation logic above.
    docs_path = Path(__file__).resolve().parent.parent / "docs" / "site-data.json"
    docs_path.parent.mkdir(parents=True, exist_ok=True)
    with docs_path.open("w", encoding="utf-8") as f:
        json.dump(site_data, f, indent=None)

    print(f"Latest quarter: {latest['quarter']}  state: {state}")
    print(f"Wrote {OUT_PATH}")
    print(f"Wrote {docs_path}")


if __name__ == "__main__":
    main()
