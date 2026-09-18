// Illustrative news digest -- ILLUSTRATIVE CONTENT, not a live news feed.
// A Lovable/production build would replace this with a real weekly digest
// pipeline. Structure follows the brief's four-part format exactly.

const PROWL_NEWS_ITEMS = [
  {
    date: "2026-09-15",
    headline: "August new private-home sales fell to 153 units as launches stayed quiet during the seasonal lull.",
    source: "URA / Business Times (illustrative)",
    category: "Property",
    what_happened: "Developers sold 153 new private homes in August, one of the lowest monthly totals this year, as few new projects launched.",
    why_it_matters: "Low new-sale volume during a launch lull isn't itself a warning sign, but it's worth watching whether resale and subsale volumes are also softening, which would point to weaker underlying demand rather than just a quiet launch calendar.",
    signal_affected: "Liquidity",
    what_to_watch_next: "Whether resale transaction volume (published twice-weekly) softens alongside new sale, or holds up on its own.",
  },
  {
    date: "2026-09-10",
    headline: "URA flags rising vacancy in completed private homes for the second straight quarter.",
    source: "URA quarterly release (illustrative)",
    category: "Supply",
    what_happened: "Vacancy in completed private residential units ticked up again, continuing a run of increases as newly completed projects add to available stock.",
    why_it_matters: "Rising vacancy alongside a large completion pipeline usually shows up in rents before it shows up in prices — worth watching whether landlords start cutting asking rents in the affected districts.",
    signal_affected: "Vacancy",
    what_to_watch_next: "Next quarter's rental index by region — if OCR/RCR rents soften while vacancy keeps rising, that's the pattern to watch.",
  },
  {
    date: "2026-09-03",
    headline: "MAS core inflation eases, keeping the door open for softer local interest rates.",
    source: "MAS release (illustrative)",
    category: "Rates & Financing",
    what_happened: "Singapore's core inflation reading came in below expectations, reducing near-term pressure on domestic interest rates.",
    why_it_matters: "Softer local rates typically flow through to mortgage pricing with a lag, easing financing conditions for buyers who are on the fence.",
    signal_affected: "Financing",
    what_to_watch_next: "SORA movements over the next 1-2 months and how quickly banks reprice mortgage packages.",
  },
  {
    date: "2026-08-27",
    headline: "Two new GLS sites released in the Rest of Central Region for the next launch cycle.",
    source: "URA GLS programme (illustrative)",
    category: "Supply",
    what_happened: "URA confirmed two additional Government Land Sale sites in RCR precincts, adding to the medium-term supply pipeline.",
    why_it_matters: "New GLS releases feed the pipeline 2-3 years out — they don't affect near-term prices, but they matter for anyone timing a purchase against future competing supply in the same area.",
    signal_affected: "Supply Pressure",
    what_to_watch_next: "Tender results (land price per square foot) when the sites close, as an early read on developer sentiment.",
  },
  {
    date: "2026-08-20",
    headline: "Singapore's Q2 GDP growth revised down slightly, but labour market stays resilient.",
    source: "MTI release (illustrative)",
    category: "Singapore Economy",
    what_happened: "Second-quarter GDP growth was revised marginally lower, though employment and wage data remained firm.",
    why_it_matters: "A resilient labour market is one of the reasons rental demand has held up even as prices soften — a weakening jobs picture would be a bigger signal than the GDP revision itself.",
    signal_affected: "Rental Resilience",
    what_to_watch_next: "Monthly labour market reports, particularly in sectors that drive expat and PMET rental demand.",
  },
];
