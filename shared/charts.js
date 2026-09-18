// Shared SVG line/bar chart renderer, adapted from the first Property
// Prowl dashboard so both projects render charts identically. Takes the
// dataset array explicitly rather than reading a global, so it can be
// reused across pages with different slices of PROWL_SITE_DATA.history.

const ProwlCharts = (function () {
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  const fmt = (n, d = 1) => (n === null || n === undefined || Number.isNaN(n)) ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtInt = (n) => (n === null || n === undefined) ? "—" : Math.round(n).toLocaleString();

  function svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, val]) => el.setAttribute(k, val));
    return el;
  }

  function yearTicks(data) {
    const ticks = [];
    data.forEach((d, i) => {
      const [year, q] = d.quarter.split("-Q");
      if (q === "1" && Number(year) % 2 === 0) ticks.push({ i, label: year });
    });
    return ticks;
  }

  function buildScales(seriesArrays, n, width, height, marginL, marginR, marginT, marginB) {
    const allVals = seriesArrays.flat().filter((x) => x !== null && x !== undefined);
    let min = Math.min(...allVals), max = Math.max(...allVals);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08;
    min -= pad; max += pad;
    const x = (i) => marginL + (i / (n - 1)) * (width - marginL - marginR);
    const y = (val) => (height - marginB) - ((val - min) / (max - min)) * (height - marginT - marginB);
    return { x, y, min, max };
  }

  function pathFor(arr, x, y) {
    let d = "", started = false;
    arr.forEach((val, i) => {
      if (val === null || val === undefined) { started = false; return; }
      d += (started ? "L" : "M") + x(i).toFixed(2) + "," + y(val).toFixed(2) + " ";
      started = true;
    });
    return d.trim();
  }

  function renderLineChart(container, data, seriesDefs, opts) {
    opts = opts || {};
    const tooltip = opts.tooltipEl || document.getElementById("tooltip");
    const width = 960, height = opts.height || 280;
    const marginL = 46, marginR = 10, marginT = 10, marginB = 26;
    const n = data.length;
    const seriesArrays = seriesDefs.map((s) => data.map((d) => d[s.key]));
    const { x, y, min, max } = buildScales(seriesArrays, n, width, height, marginL, marginR, marginT, marginB);

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": opts.ariaLabel || "" });

    for (let g = 0; g <= 4; g++) {
      const val = min + (g / 4) * (max - min);
      const gy = y(val);
      svg.appendChild(svgEl("line", { x1: marginL, x2: width - marginR, y1: gy.toFixed(2), y2: gy.toFixed(2), class: "gridline" }));
      const lbl = svgEl("text", { x: marginL - 8, y: (gy + 3).toFixed(2), "text-anchor": "end", class: "axis-label" });
      lbl.textContent = fmt(val, 0);
      svg.appendChild(lbl);
    }
    svg.appendChild(svgEl("line", { x1: marginL, x2: width - marginR, y1: (height - marginB).toFixed(2), y2: (height - marginB).toFixed(2), class: "baseline" }));
    yearTicks(data).forEach(({ i, label }) => {
      const lbl = svgEl("text", { x: x(i).toFixed(2), y: height - marginB + 16, "text-anchor": "middle", class: "axis-label" });
      lbl.textContent = label;
      svg.appendChild(lbl);
    });

    seriesDefs.forEach((s, si) => {
      svg.appendChild(svgEl("path", { d: pathFor(seriesArrays[si], x, y), fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    });

    const hoverLine = svgEl("line", { x1: 0, x2: 0, y1: marginT, y2: height - marginB, stroke: cssVar("--text-muted"), "stroke-width": 1, "stroke-dasharray": "3,3", opacity: 0 });
    svg.appendChild(hoverLine);
    const dots = seriesDefs.map((s) => {
      const c = svgEl("circle", { r: 3.5, fill: s.color, stroke: cssVar("--surface-1"), "stroke-width": 1.5, opacity: 0 });
      svg.appendChild(c);
      return c;
    });

    const overlay = svgEl("rect", { x: marginL, y: marginT, width: width - marginL - marginR, height: height - marginT - marginB, fill: "transparent", style: "pointer-events: all;" });
    svg.appendChild(overlay);

    overlay.addEventListener("mousemove", (e) => {
      const rect = container.querySelector("svg").getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * width;
      const i = Math.max(0, Math.min(n - 1, Math.round(((relX - marginL) / (width - marginL - marginR)) * (n - 1))));
      const px = x(i);
      hoverLine.setAttribute("x1", px); hoverLine.setAttribute("x2", px); hoverLine.setAttribute("opacity", 1);
      let rows = "";
      seriesDefs.forEach((s, si) => {
        const val = seriesArrays[si][i];
        dots[si].setAttribute("cx", px);
        dots[si].setAttribute("cy", val !== null && val !== undefined ? y(val) : -999);
        dots[si].setAttribute("opacity", val !== null && val !== undefined ? 1 : 0);
        rows += `<div class="row"><span><span class="swatch" style="background:${s.color}"></span>${s.label}</span><span>${fmt(val, opts.decimals ?? 1)}${opts.suffix || ""}</span></div>`;
      });
      if (tooltip) {
        tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">${data[i].quarter}</div>${rows}`;
        tooltip.style.left = e.clientX + "px";
        tooltip.style.top = e.clientY + "px";
        tooltip.classList.add("visible");
      }
    });
    overlay.addEventListener("mouseleave", () => {
      hoverLine.setAttribute("opacity", 0);
      dots.forEach((d) => d.setAttribute("opacity", 0));
      if (tooltip) tooltip.classList.remove("visible");
    });

    container.innerHTML = "";
    container.appendChild(svg);
  }

  function renderBarChart(container, data, key, opts) {
    opts = opts || {};
    const tooltip = opts.tooltipEl || document.getElementById("tooltip");
    const width = 960, height = opts.height || 220;
    const marginL = 46, marginR = 10, marginT = 10, marginB = 26;
    const n = data.length;
    const arr = data.map((d) => d[key]);
    const max = Math.max(...arr.filter((x) => x !== null));
    const y = (val) => (height - marginB) - (val / max) * (height - marginT - marginB);
    const bw = (width - marginL - marginR) / n;

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}` });
    for (let g = 0; g <= 3; g++) {
      const val = (g / 3) * max;
      const gy = y(val);
      svg.appendChild(svgEl("line", { x1: marginL, x2: width - marginR, y1: gy.toFixed(2), y2: gy.toFixed(2), class: "gridline" }));
      const lbl = svgEl("text", { x: marginL - 8, y: (gy + 3).toFixed(2), "text-anchor": "end", class: "axis-label" });
      lbl.textContent = fmtInt(val);
      svg.appendChild(lbl);
    }
    svg.appendChild(svgEl("line", { x1: marginL, x2: width - marginR, y1: (height - marginB).toFixed(2), y2: (height - marginB).toFixed(2), class: "baseline" }));
    yearTicks(data).forEach(({ i, label }) => {
      const lbl = svgEl("text", { x: (marginL + i * bw).toFixed(2), y: height - marginB + 16, "text-anchor": "middle", class: "axis-label" });
      lbl.textContent = label;
      svg.appendChild(lbl);
    });

    const bars = [];
    data.forEach((row, i) => {
      const val = arr[i] || 0;
      const bx = marginL + i * bw, by = y(val);
      const rect = svgEl("rect", { x: (bx + 0.4).toFixed(2), y: by.toFixed(2), width: Math.max(bw - 0.8, 0.5), height: (height - marginB - by).toFixed(2), fill: opts.color || cssVar("--series-1"), opacity: 0.85 });
      svg.appendChild(rect);
      bars.push(rect);
    });

    const overlay = svgEl("rect", { x: marginL, y: marginT, width: width - marginL - marginR, height: height - marginT - marginB, fill: "transparent", style: "pointer-events: all;" });
    svg.appendChild(overlay);
    overlay.addEventListener("mousemove", (e) => {
      const rect = container.querySelector("svg").getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * width;
      const i = Math.max(0, Math.min(n - 1, Math.floor((relX - marginL) / bw)));
      bars.forEach((b, bi) => b.setAttribute("opacity", bi === i ? 1 : 0.85));
      if (tooltip) {
        tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">${data[i].quarter}</div><div class="row"><span>${opts.label || "Value"}</span><span>${fmtInt(arr[i])}</span></div>`;
        tooltip.style.left = e.clientX + "px";
        tooltip.style.top = e.clientY + "px";
        tooltip.classList.add("visible");
      }
    });
    overlay.addEventListener("mouseleave", () => {
      bars.forEach((b) => b.setAttribute("opacity", 0.85));
      if (tooltip) tooltip.classList.remove("visible");
    });

    container.innerHTML = "";
    container.appendChild(svg);
  }

  return { renderLineChart, renderBarChart, fmt, fmtInt };
})();
