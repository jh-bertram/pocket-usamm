/* =====================================================================
   usamm-charts.js  —  template-fit SVG data-graphics for the USAMM
   state-outreach flyers.

   All generators are PURE: each takes a per-state facts object `d`
   (one entry of window.USAMM_STATES) plus an options object, and returns
   an SVG *string* with a viewBox and width/height:100% so it scales to
   whatever flyer slot it is dropped into. Palette + font match the flyer
   CSS :root (green/gold), NOT the legacy dodgerblue cards.

   Honesty (per USAMM_figures_methods.pdf):
     - all values are MODEL PROJECTIONS, mean of 1,000 networks, OUTGOING
       direction, cattle only;
     - "head" figures are ESTIMATES from shipment-size bin midpoints.
   Generators render only what the data supports; captions live alongside
   in the gallery / flyer (see gallery.html).
   ===================================================================== */
(function (root) {
  "use strict";

  const PAL = {
    inkD:   "#1c2b1a",
    greenD: "#2e4a2b",
    greenM: "#3b6b3a",
    greenS: "#eef3ea",
    gold:   "#d8b53f",
    amberBg:"#fdf6e3",
    surface:"#f5f5f0",
    line:   "#dcdcd4",
    muted:  "#5f6b5c",
    paper:  "#ffffff"
  };
  const FONT = '"Segoe UI",Helvetica,Arial,sans-serif';

  /* ----------------------------- helpers ----------------------------- */
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // species word for accessible titles (swine blocks carry d.species === "swine").
  const speciesWord = d => (d && d.species === "swine") ? "swine" : "cattle";
  const fmtInt = n => Math.round(n).toLocaleString("en-US");
  function fmtHead(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return Math.round(n / 1e3) + "K";
    return fmtInt(n);
  }
  function abbr(name) {
    const g = root.USAMM_GEO && root.USAMM_GEO[name];
    return g ? g.abbr : String(name).slice(0, 3).toUpperCase();
  }
  // wrap an inner SVG body in a sized, accessible <svg>
  function svg(vbW, vbH, body, title) {
    return (
      `<svg viewBox="0 0 ${vbW} ${vbH}" role="img" aria-label="${esc(title || "")}" ` +
      `preserveAspectRatio="xMidYMid meet" ` +
      `style="width:100%;height:100%;display:block;font-family:${FONT}" ` +
      `xmlns="http://www.w3.org/2000/svg">${title ? `<title>${esc(title)}</title>` : ""}${body}</svg>`
    );
  }
  const polar = (cx, cy, r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  // donut/pie arc path from startDeg to endDeg (clockwise)
  function arc(cx, cy, rOuter, rInner, startDeg, endDeg) {
    const [x0, y0] = polar(cx, cy, rOuter, endDeg);
    const [x1, y1] = polar(cx, cy, rOuter, startDeg);
    const [x2, y2] = polar(cx, cy, rInner, startDeg);
    const [x3, y3] = polar(cx, cy, rInner, endDeg);
    const large = (endDeg - startDeg) % 360 > 180 ? 1 : 0;
    return (
      `M ${x0.toFixed(2)} ${y0.toFixed(2)} ` +
      `A ${rOuter} ${rOuter} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
      `L ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
      `A ${rInner} ${rInner} 0 ${large} 1 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`
    );
  }

  /* =====================================================================
     1. SPOKE / FLOW NETWORK  ->  #fig_cattle
     Focal state on the left; ranked top-N out-of-state partners on the
     right. Spoke stroke-width ∝ share of out-of-state shipments; end
     marker area ∝ mean shipments/yr. Abstract (not geographic) so labels
     stay legible at 120–185px tall.
     ===================================================================== */
  function spokeNetwork(d, opts) {
    opts = opts || {};
    const size = opts.size || "M";        // S not supported; M default, L = hero
    const L = size === "L";
    // Wide-short canvas at M (fills the ~3:1 standard figure slot legibly);
    // taller, roomier canvas at L (hero). Geometry, node counts and fonts
    // are all tuned per size — not a uniform scale.
    // M now renders into a taller side-caption slot: use a less-wide, taller
    // canvas (and bumped fonts) so the focal node + partner column fill the
    // slot height legibly, rather than the old wide-short geometry.
    const W = L ? 360 : 272, H = L ? 232 : 158;
    const topN = opts.topN || (L ? 6 : 4);
    const fNode = L ? 12.5 : 12.5;
    const fSub  = L ? 9.5 : 9.5;
    const fName = L ? 14 : 13.5;
    const focalR = L ? 22 : 18;
    const fx = L ? 70 : 56, fy = H / 2;          // focal node
    const px = L ? 246 : 190;                     // partner node column x
    const top = L ? 26 : 18, bot = H - (L ? 34 : 22);
    const subDy = L ? 36 : 30;                     // focal caption offset

    const all = (d.partner_states || []).slice();
    const shown = all.slice(0, topN);
    const rest = all.slice(topN);
    const restShip = rest.reduce((a, p) => a + p.shipments, 0);
    const maxShip = Math.max(...shown.map(p => p.shipments), 1);
    const maxPct = Math.max(...shown.map(p => p.pct_of_outstate), 1);
    const n = shown.length;
    const rScale = s => (L ? 5 : 4) + (L ? 15 : 8.5) * Math.sqrt(s / maxShip);
    const wScale = p => (L ? 1.2 : 1) + (L ? 7 : 4.5) * (p / maxPct);

    let spokes = "", nodes = "";
    shown.forEach((p, i) => {
      const y = n === 1 ? fy : top + (bot - top) * i / (n - 1);
      const r = rScale(p.shipments);
      const midx = (fx + px) / 2;
      // gentle quadratic spoke
      spokes +=
        `<path d="M ${fx + focalR} ${fy} Q ${midx} ${(fy + y) / 2} ${px - r} ${y}" ` +
        `fill="none" stroke="${PAL.greenM}" stroke-opacity="0.55" ` +
        `stroke-width="${wScale(p.pct_of_outstate).toFixed(2)}" stroke-linecap="round"/>`;
      nodes +=
        `<circle cx="${px}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${PAL.gold}" ` +
        `stroke="${PAL.greenD}" stroke-width="1.1"/>` +
        `<text x="${px + r + 7}" y="${(y - 1).toFixed(1)}" font-size="${fNode}" font-weight="700" ` +
        `fill="${PAL.greenD}" dominant-baseline="middle">${esc(abbr(p.state))}</text>` +
        `<text x="${px + r + 7}" y="${(y + (L ? 11 : 10)).toFixed(1)}" font-size="${fSub}" ` +
        `fill="${PAL.muted}" dominant-baseline="middle">${fmtInt(p.shipments)}/yr</text>`;
    });

    // "+N more" footnote if partners truncated
    let more = "";
    if (rest.length) {
      more =
        `<text x="${px}" y="${H - (L ? 8 : 3)}" font-size="${L ? 9 : 8}" fill="${PAL.muted}" ` +
        `text-anchor="middle">+${rest.length} more · ${fmtInt(restShip)}/yr</text>`;
    }

    const focal =
      `<circle cx="${fx}" cy="${fy}" r="${focalR}" fill="${PAL.greenD}"/>` +
      `<text x="${fx}" y="${fy - 1}" font-size="${fName}" font-weight="700" fill="#fff" ` +
      `text-anchor="middle" dominant-baseline="middle">${esc(abbr(d.state))}</text>` +
      `<text x="${fx}" y="${fy + subDy}" font-size="${L ? 9.5 : 8.5}" fill="${PAL.muted}" text-anchor="middle">` +
      `${d.leaving_pct}% leave state</text>`;

    return svg(W, H, spokes + focal + nodes + more,
      `${d.state} top out-of-state ${speciesWord(d)} shipment destinations`);
  }

  /* =====================================================================
     2. IN-STATE vs LEAVING DONUT  ->  stat companion / inline
     ===================================================================== */
  function donutInStateLeaving(d, opts) {
    opts = opts || {};
    const size = opts.size || "M";
    const stay = d.instate_pct, leave = d.leaving_pct;
    const split = stay / (stay + leave) * 360;

    // S* — compact "stat-tile hybrid": a small ring on the left, big % on the
    // right, in a wide short box that drops cleanly into a ~40px stat slot.
    if (size === "S") {
      const W = 168, H = 56, cx = 28, cy = H / 2, rO = 22, rI = 13;
      const body =
        `<path d="${arc(cx, cy, rO, rI, 0, split)}" fill="${PAL.greenM}"/>` +
        `<path d="${arc(cx, cy, rO, rI, split, 360)}" fill="${PAL.gold}"/>` +
        `<text x="58" y="25" font-size="22" font-weight="700" fill="${PAL.greenD}">${stay}%</text>` +
        `<text x="58" y="40" font-size="10" fill="${PAL.muted}">stay in-state</text>` +
        `<text x="58" y="51" font-size="8" fill="${PAL.muted}">${leave}% leave</text>`;
      return svg(W, H, body, `${d.state}: ${stay}% of ${speciesWord(d)} shipments stay in-state`);
    }

    // M: ring on the LEFT, big % + labels to the RIGHT of it, so the
    // percentage never overlaps the dark donut (legibility fix).
    const W = 250, H = 150, cx = 66, cy = H / 2, rO = 56, rI = 35, tx = 132;
    const body =
      `<path d="${arc(cx, cy, rO, rI, 0, split)}" fill="${PAL.greenM}"/>` +
      `<path d="${arc(cx, cy, rO, rI, split, 360)}" fill="${PAL.gold}"/>` +
      `<text x="${tx}" y="${cy - 8}" font-size="40" font-weight="700" fill="${PAL.greenD}">${stay}%</text>` +
      `<text x="${tx + 2}" y="${cy + 13}" font-size="12.5" fill="${PAL.muted}">stay in-state</text>` +
      `<text x="${tx + 2}" y="${cy + 31}" font-size="11.5" fill="${PAL.muted}">${leave}% leave the state</text>`;
    return svg(W, H, body, `${d.state}: ${stay}% of ${speciesWord(d)} shipments stay in-state`);
  }

  /* =====================================================================
     3. WAFFLE / PICTOGRAM  ->  % to feedlots (dest_premises)
     100-cell grid, filled cells = round(pct).
     ===================================================================== */
  function waffle(d, opts) {
    opts = opts || {};
    const pct = opts.pct != null ? opts.pct : d.feedlot_pct;
    const label = opts.label || "to feedlots";
    const cols = 10, rows = 10, gap = 3, cell = 13;
    const pad = 4;
    const gridW = cols * cell + (cols - 1) * gap;
    const W = gridW + pad * 2;
    const H = rows * cell + (rows - 1) * gap + pad * 2 + 22;
    const filled = Math.round(pct);
    let cells = "";
    for (let i = 0; i < rows * cols; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      // fill from bottom-left upward, row-major
      const idx = (rows - 1 - r) * cols + c;
      const on = idx < filled;
      const x = pad + c * (cell + gap), y = pad + r * (cell + gap);
      cells +=
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" ` +
        `fill="${on ? PAL.gold : PAL.greenS}" stroke="${on ? "#b9962f" : PAL.line}" stroke-width="0.8"/>`;
    }
    const cap =
      `<text x="${W / 2}" y="${H - 6}" font-size="12" text-anchor="middle" fill="${PAL.greenD}">` +
      `<tspan font-weight="700">${pct}%</tspan> ${esc(label)}</text>`;
    return svg(W, H, cells + cap, `${d.state}: ${pct}% of cattle shipments ${label}`);
  }

  /* =====================================================================
     4. SEASONALITY MINI-BAR  ->  repurposed #fig_trend slot
     4 quarters; peak quarter highlighted gold.
     ===================================================================== */
  function seasonBars(d, opts) {
    opts = opts || {};
    const size = opts.size || "M";
    const L = size === "L";
    // M slots now place the caption in a side column (usamm-review.js), so the
    // figure gets the full slot HEIGHT. Use a less-wide, taller M canvas (and a
    // larger font) so the bars fill that space and the labels stay legible —
    // instead of the old wide-short canvas tuned for a caption-below slot.
    const showPct = L;                  // pct labels only when there's room
    const W = L ? 340 : 252, H = L ? 168 : 150;
    const fPct = L ? 10.5 : 12.5, fLab = L ? 10 : 11.5;
    const padL = 8, padR = 8, padT = L ? 16 : 18, padB = L ? 26 : 28;
    const qs = d.quarters || [];
    const labels = ["Winter", "Spring", "Summer", "Fall"];
    const maxPct = Math.max(...qs.map(q => q.pct), 1);
    const peak = qs.reduce((m, q, i) => (q.pct > qs[m].pct ? i : m), 0);
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const bw = plotW / qs.length * 0.6;
    let bars = "";
    qs.forEach((q, i) => {
      const cx = padL + plotW * (i + 0.5) / qs.length;
      const h = plotH * q.pct / maxPct;
      const y = padT + plotH - h;
      const fill = i === peak ? PAL.gold : PAL.greenM;
      bars +=
        `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" ` +
        `rx="2" fill="${fill}"/>` +
        ((showPct || i === peak)
          ? `<text x="${cx.toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="${fPct}" font-weight="700" ` +
            `fill="${PAL.greenD}" text-anchor="middle">${q.pct}%</text>`
          : "") +
        `<text x="${cx.toFixed(1)}" y="${H - (L ? 10 : 11)}" font-size="${fLab}" fill="${PAL.muted}" ` +
        `text-anchor="middle">${labels[i]}</text>`;
    });
    const base = `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="${PAL.line}" stroke-width="1"/>`;
    return svg(W, H, base + bars, `${d.state}: ${speciesWord(d)} shipments by season (peak ${labels[peak]})`);
  }

  /* =====================================================================
     5. SHIPMENT-SIZE SPARKBAR  ->  alt #fig_trend / inline
     7 volume bins; x = head/shipment, y = share.
     ===================================================================== */
  function sizeSparkbar(d, opts) {
    opts = opts || {};
    // M-only. Taller, less-wide canvas (caption now sits beside the figure, so
    // the bars get the full slot height); fonts bumped to stay legible.
    const W = 300, H = 150;
    const padL = 8, padR = 8, padT = 16, padB = 32;
    const bins = d.volume_bins || [];
    const xlabels = ["1–4", "5–9", "10–19", "20–49", "50–99", "100–249", "250+"];
    const maxPct = Math.max(...bins.map(b => b.pct), 1);
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const bw = plotW / bins.length * 0.66;
    let bars = "";
    bins.forEach((b, i) => {
      const cx = padL + plotW * (i + 0.5) / bins.length;
      const h = plotH * b.pct / maxPct;
      const y = padT + plotH - h;
      bars +=
        `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" ` +
        `rx="1.5" fill="${PAL.greenM}"/>` +
        `<text x="${cx.toFixed(1)}" y="${(y - 3).toFixed(1)}" font-size="10.5" fill="${PAL.muted}" ` +
        `text-anchor="middle">${b.pct}</text>` +
        `<text x="${cx.toFixed(1)}" y="${H - 16}" font-size="9.5" fill="${PAL.muted}" ` +
        `text-anchor="middle">${xlabels[i]}</text>`;
    });
    const axis =
      `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="${PAL.line}"/>` +
      `<text x="${W / 2}" y="${H - 3}" font-size="9.5" fill="${PAL.muted}" text-anchor="middle">head per shipment (% of shipments)</text>`;
    return svg(W, H, axis + bars, `${d.state}: distribution of cattle shipment sizes`);
  }

  /* =====================================================================
     6. PROPORTIONAL-SYMBOL US MAP  ->  #fig_map
     Real US positions (schematic centroids). Focal state highlighted;
     partner states as gold circles ∝ mean shipments/yr; faint spokes.
     NOTE: this is a partner-STATE map. A true within-state COUNTY
     choropleth needs the model shapefiles (regenerate via R) — see brief.
     ===================================================================== */
  function geoMap(d, opts) {
    opts = opts || {};
    const size = opts.size || "M";
    const W = 360, H = 232;
    const pad = 16;
    const capH = 16;                         // bottom strip reserved for the caption
    const fLab = size === "L" ? 9.5 : 8.5;   // partner abbr label font
    const GEO = root.USAMM_GEO || {};
    const focalGeo = GEO[d.state];
    const topN = opts.topN || (size === "L" ? 8 : 6);
    const shown = (d.partner_states || []).slice(0, topN).filter(p => GEO[p.state]);

    // Auto-fit projection: frame the focal state + shown partners so the markers
    // FILL the panel, centred, with a uniform (cos-lat-corrected) scale so the
    // circles stay round and the layout still reads US-shaped. Replaces the old
    // fixed continental box that left the markers as a tiny off-centre cluster.
    const geoPts = [];
    if (focalGeo) geoPts.push([focalGeo.lon, focalGeo.lat]);
    shown.forEach(p => { const g = GEO[p.state]; if (g) geoPts.push([g.lon, g.lat]); });
    const n = geoPts.length || 1;
    const cLon = geoPts.reduce((a, p) => a + p[0], 0) / n;
    const cLat = geoPts.reduce((a, p) => a + p[1], 0) / n;
    const cosC = Math.cos(cLat * Math.PI / 180) || 1;
    const gx = lon => (lon - cLon) * cosC;   // centred, longitude-corrected
    const gy = lat => (cLat - lat);          // centred, y grows downward
    let halfX = Math.max(...geoPts.map(p => Math.abs(gx(p[0]))), 0);
    let halfY = Math.max(...geoPts.map(p => Math.abs(gy(p[1]))), 0);
    halfX = Math.max(halfX, 4.5 * cosC); halfY = Math.max(halfY, 3.0);  // don't over-zoom
    const innerW = W - 2 * pad, innerH = H - 2 * pad - capH;
    const scale = Math.min(innerW / (2 * halfX * 1.28), innerH / (2 * halfY * 1.28));
    const ox = pad + innerW / 2, oy = pad + innerH / 2;
    const proj = (lon, lat) => [ox + gx(lon) * scale, oy + gy(lat) * scale];
    const maxShip = Math.max(...shown.map(p => p.shipments), 1);
    const rScale = s => 3.5 + 13 * Math.sqrt(s / maxShip);

    let spokes = "", marks = "", labels = "";
    let fxy = focalGeo ? proj(focalGeo.lon, focalGeo.lat) : [W / 2, H / 2];

    shown.forEach(p => {
      const g = GEO[p.state];
      const [x, y] = proj(g.lon, g.lat);
      const r = rScale(p.shipments);
      spokes +=
        `<line x1="${fxy[0].toFixed(1)}" y1="${fxy[1].toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" ` +
        `stroke="${PAL.greenM}" stroke-opacity="0.35" stroke-width="1"/>`;
      marks +=
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${PAL.gold}" ` +
        `fill-opacity="0.85" stroke="${PAL.greenD}" stroke-width="0.9"/>`;
      labels +=
        `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="${fLab}" font-weight="700" ` +
        `fill="${PAL.greenD}" text-anchor="middle">${esc(g.abbr)}</text>`;
    });

    // focal marker (green diamond-ish ring)
    const focal = focalGeo
      ? `<circle cx="${fxy[0].toFixed(1)}" cy="${fxy[1].toFixed(1)}" r="7" fill="${PAL.greenD}" stroke="#fff" stroke-width="1.5"/>` +
        `<text x="${fxy[0].toFixed(1)}" y="${(fxy[1] - 11).toFixed(1)}" font-size="9" font-weight="700" ` +
        `fill="${PAL.greenD}" text-anchor="middle">${esc(focalGeo.abbr)}</text>`
      : "";

    const cap =
      `<text x="${W / 2}" y="${H - 4}" font-size="9" fill="${PAL.muted}" text-anchor="middle">` +
      `circle area prop. to mean shipments/yr · top ${shown.length} destination states</text>`;
    // faint frame to read as a map panel
    const frame = `<rect x="1" y="1" width="${W - 2}" height="${H - 16}" rx="6" fill="${PAL.greenS}" fill-opacity="0.45" stroke="${PAL.line}"/>`;
    return svg(W, H, frame + spokes + marks + focal + labels + cap,
      `${d.state}: where ${speciesWord(d)} ship — top destination states`);
  }

  /* =====================================================================
     7. STAT-BOX GLYPH ICONS  (disease-relevance set)
     Tiny line icons to sit beside the 4 .stat boxes. 24x24, currentColor.
     names: 'ship' (out-shipments), 'reach' (states+counties),
            'hub' (busiest county), 'season' (peak season)
     ===================================================================== */
  function statIcon(name, opts) {
    opts = opts || {};
    const col = opts.color || PAL.greenM;
    const sw = 1.8;
    let body = "";
    if (name === "ship") {
      // truck
      body =
        `<path d="M3 7h10v8H3z" fill="none"/>` +
        `<path d="M13 10h4l3 3v2h-7z" fill="none"/>` +
        `<circle cx="7" cy="17" r="1.7"/><circle cx="16.5" cy="17" r="1.7"/>`;
    } else if (name === "reach") {
      // hub-and-spoke
      body =
        `<circle cx="12" cy="12" r="2.2"/>` +
        `<circle cx="4" cy="5" r="1.6"/><circle cx="20" cy="6" r="1.6"/>` +
        `<circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="18" r="1.6"/>` +
        `<path d="M12 12L4 5M12 12l8-6M12 12l-7 7M12 12l7 6" fill="none"/>`;
    } else if (name === "hub") {
      // map pin
      body =
        `<path d="M12 21c4-5 6-8 6-11a6 6 0 1 0-12 0c0 3 2 6 6 11z" fill="none"/>` +
        `<circle cx="12" cy="10" r="2.3"/>`;
    } else if (name === "season") {
      // calendar
      body =
        `<rect x="4" y="5" width="16" height="15" rx="2" fill="none"/>` +
        `<path d="M4 9h16M8 3v4M16 3v4" fill="none"/>` +
        `<rect x="7.5" y="12" width="3.2" height="3.2" rx="0.6" fill="${col}" stroke="none"/>`;
    } else if (name === "share") {
      // pie / share wedge
      body =
        `<circle cx="12" cy="12" r="8" fill="none"/>` +
        `<path d="M12 12V4 A8 8 0 0 1 19 15 Z" fill="${col}" stroke="none" opacity="0.85"/>` +
        `<path d="M12 12L12 4M12 12L19 15" fill="none"/>`;
    } else if (name === "partner") {
      // two linked nodes (out-partner)
      body =
        `<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/>` +
        `<path d="M10 12h4" fill="none"/>`;
    }
    return (
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${col}" ` +
      `stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ` +
      `xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`
    );
  }

  root.USAMMCharts = {
    PAL, FONT,
    fmtInt, fmtHead, abbr,
    spokeNetwork,
    donutInStateLeaving,
    waffle,
    seasonBars,
    sizeSparkbar,
    geoMap,
    statIcon
  };
})(window);
