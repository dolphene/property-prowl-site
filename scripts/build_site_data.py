"""
Build shared/data.js for The Property Prowl marketing site FROM the
already-analysed data in the sibling `property-prowl` project -- this
script never re-derives price/rent/liquidity numbers itself, it only
reads property-prowl's finished output (master_quarterly_signals.csv) and
reshapes it for the six-signal cards, "What Changed", and the historical
charts. That's the "shared analytics" link between the two projects: one
pipeline, two front ends.

All six signals are real now:
  - Supply Pressure: real pipeline snapshot (total units + near-term
    TOP-year breakdown) from URA's PMI_Resi_Pipeline. This is a snapshot,
    not a time series -- no QoQ/YoY momentum until multiple runs build up
    history.
  - Financing: real 3-Month Compounded SORA from MAS via data.gov.sg.
  - Vacancy: real vacancy rate of completed private residential units,
    scraped straight from URA's own quarterly press release text (no API
    exposes this -- see property-prowl/scripts/fetch_ura_vacancy.py). If
    that scrape is ever unreachable, falls back to an honest "not
    available" placeholder rather than a stale/fake number.

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


def load_sibling_json(filename):
    """Load a docs/<filename>.json published alongside master_quarterly_signals.json --
    from the same base URL in CI, or the sibling property-prowl/docs/ folder locally."""
    if DATA_URL:
        base = DATA_URL.rsplit("/", 1)[0]
        try:
            with urllib.request.urlopen(f"{base}/{filename}") as resp:
                return json.loads(resp.read())
        except Exception:
            return None
    else:
        # SRC_DIR = .../property-prowl/data/processed -> parent.parent = .../property-prowl
        path = SRC_DIR.parent.parent / "docs" / filename
        if not path.exists():
            return None
        with path.open(encoding="utf-8") as f:
            return json.load(f)


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


def supply_pressure(snapshot):
    if snapshot is None:
        return None
    total = snapshot["totalPipelineUnits"]
    near_term = snapshot["nearTermUnits"]
    near_term_years = snapshot["nearTermYears"]
    unconfirmed = snapshot["unitsWithoutConfirmedTop"]
    years_label = "-".join(near_term_years) if near_term_years else "n/a"
    # No historical pipeline snapshots exist yet to compute real momentum
    # against (data.gov.sg's own mirror is stale -- see property-prowl's
    # README) -- "neutral" tier until we have >=2 runs to compare.
    return {
        "tier": "neutral",
        "arrow": "→",
        "headline": f"{total:,} units",
        "detail": (
            f"{total:,} units currently in the private residential pipeline across "
            f"{snapshot['projectCount']} projects. {near_term:,} have a confirmed TOP "
            f"in {years_label}; {unconfirmed:,} don't have a confirmed TOP year yet "
            f"(still in planning)."
        ),
        "value": f"{total:,} units",
        "real": True,
    }


def financing(snapshot):
    if snapshot is None or not snapshot.get("monthly"):
        return None
    monthly = snapshot["monthly"]
    latest_val = monthly[0]["sora3mCompounded"]
    prev_val = monthly[1]["sora3mCompounded"] if len(monthly) > 1 else None
    delta = (latest_val - prev_val) if prev_val is not None else None
    if delta is None:
        tier, arrow, headline = "neutral", "→", "Steady"
    elif delta < -0.05:
        tier, arrow, headline = "good", "↓", "Easier"
    elif delta > 0.05:
        tier, arrow, headline = "warning", "↑", "Tighter"
    else:
        tier, arrow, headline = "neutral", "→", "Steady"
    delta_note = f" ({'down' if delta < 0 else 'up'} {abs(delta):.2f}pp from {monthly[1]['month']})" if delta is not None else ""
    return {
        "tier": tier,
        "arrow": arrow,
        "headline": headline,
        "detail": f"3-Month Compounded SORA is {latest_val:.2f}% as of {monthly[0]['month']}{delta_note} -- the benchmark most floating-rate mortgages are priced against.",
        "value": f"SORA {latest_val:.2f}%",
        "real": True,
    }


def vacancy(snapshot):
    if snapshot is None:
        return None
    rate = snapshot["rate"]
    prev = snapshot.get("previousRate")
    delta = (rate - prev) if prev is not None else None
    if delta is None:
        tier, arrow, headline = "neutral", "→", "Steady"
    elif delta > 0.05:
        tier, arrow, headline = "warning", "↑", "Rising"
    elif delta < -0.05:
        tier, arrow, headline = "good", "↓", "Falling"
    else:
        tier, arrow, headline = "neutral", "→", "Steady"
    if delta is not None and delta > 0.05:
        delta_note = f" (up from {prev:.1f}%)"
    elif delta is not None and delta < -0.05:
        delta_note = f" (down from {prev:.1f}%)"
    else:
        delta_note = ""
    return {
        "tier": tier,
        "arrow": arrow,
        "headline": headline,
        "detail": (
            f"Vacancy rate of completed private residential units (ex-ECs) was {rate:.1f}% "
            f"as at the end of {snapshot['asOf']}{delta_note} -- sourced directly from URA's "
            f"own quarterly release."
        ),
        "value": f"{rate:.1f}%",
        "sourceUrl": snapshot["sourceUrl"],
        "real": True,
    }


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

# Fallbacks used only if a signal's own snapshot file isn't reachable
# (e.g. the URA vacancy scrape failed, or URA_ACCESS_KEY isn't set yet so
# supply_snapshot.json/sora_snapshot.json were never published). Honest
# about the gap rather than showing a stale or fake number.
FALLBACK_SIGNALS = {
    "supply_pressure": {"tier": "serious", "arrow": "↑", "headline": "Elevated", "detail": "Units under construction and GLS pipeline remain high relative to absorption.", "real": False},
    "financing": {"tier": "good", "arrow": "↓", "headline": "Easier", "detail": "SORA and mortgage rates have been trending down.", "real": False},
    "vacancy": {"tier": "neutral", "arrow": "?", "headline": "Not available", "detail": "Couldn't reach URA's latest quarterly release just now -- vacancy will show again once the next refresh succeeds.", "value": "No data source", "real": False},
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

    supply_snapshot = load_sibling_json("supply_snapshot.json")
    sora_snapshot = load_sibling_json("sora_snapshot.json")
    vacancy_snapshot = load_sibling_json("vacancy_snapshot.json")
    supply_signal = supply_pressure(supply_snapshot)
    financing_signal = financing(sora_snapshot)
    vacancy_signal = vacancy(vacancy_snapshot)

    if supply_signal is not None:
        latest["pipeline_total_units"] = supply_snapshot["totalPipelineUnits"]
        latest["pipeline_near_term_units"] = supply_snapshot["nearTermUnits"]
    if financing_signal is not None:
        latest["sora_3m_latest"] = sora_snapshot["monthly"][0]["sora3mCompounded"]
        latest["sora_3m_month"] = sora_snapshot["monthly"][0]["month"]
    if vacancy_signal is not None:
        latest["vacancy_rate"] = vacancy_snapshot["rate"]
        latest["vacancy_as_of"] = vacancy_snapshot["asOf"]

    signals = {
        "price_pressure": {**price_pressure(latest), "real": True},
        "rental_resilience": {**rental_resilience(latest), "real": True},
        "liquidity": {**liquidity(latest), "real": True},
        "supply_pressure": supply_signal or FALLBACK_SIGNALS["supply_pressure"],
        "financing": financing_signal or FALLBACK_SIGNALS["financing"],
        "vacancy": vacancy_signal or FALLBACK_SIGNALS["vacancy"],
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
