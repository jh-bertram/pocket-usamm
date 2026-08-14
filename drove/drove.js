/* =========================================================================
   DROVE — the USAMM flyers, un-frozen.
   One living network graphic; every control morphs it, nothing ever cuts.

   Honesty architecture (do not scatter checks — CAPS is the single gate):
   - flows = ANNUAL MEAN modeled shipments (1,000 nets cattle family / 250 swine),
     never live tracking (framing overlay + persistent legend chip say so);
   - dot rate ∝ shipments/yr through ONE global constant K (faucet); the
     governor may bump K under load but always updates the on-screen legend;
   - swine: shipments only (no head, uniform dot size), sparse states veiled;
   - inbound: real in_partner_states arrays (cattle+swine only) — beef/dairy
     inbound animation is locked with a stated reason, never faked;
   - season: state-total share applied uniformly, caption says so; locked
     (sunk) in inbound because no inbound quarters exist;
   - inventory: nothing accumulates, nodes pulse and decay only.
   ========================================================================= */
(function () {
"use strict";
if (!window.USAMM_STATES || !window.USAMM_GEO) {
  document.body.innerHTML = '<div style="padding:40px;font-family:system-ui;color:#cfe0c6">' +
    "<h2>DROVE</h2><p>Model data didn’t load — keep drove/ next to figure-generation/.</p></div>";
  return;
}

/* ---------------- constants ---------------- */
var GEO = window.USAMM_GEO;
var CAPS = {
  cattle: { data: window.USAMM_STATES, nets: 1000, head: true,  bins: true,  inArr: true,  gold: false, word: "cattle",       folder: "",       infix: "" },
  beef:   { data: window.USAMM_BEEF,   nets: 1000, head: true,  bins: true,  inArr: false, gold: false, word: "beef cattle",  folder: "beef/",  infix: "_beef" },
  dairy:  { data: window.USAMM_DAIRY,  nets: 1000, head: true,  bins: true,  inArr: false, gold: false, word: "dairy cattle", folder: "dairy/", infix: "_dairy" },
  swine:  { data: window.USAMM_SWINE,  nets: 250,  head: false, bins: false, inArr: true,  gold: true,  word: "swine",        folder: "swine/", infix: "_swine" }
};
var CATS = ["cattle", "beef", "dairy", "swine"];
var SWINE_MIN = 750;                       /* mirrors the flyers */
var MAPS_ROOT = "../figure-generation/output/";
var STATE_LIST = Object.keys(CAPS.cattle.data).sort();

var HUE = {
  cattle: { body: "#6fa05e", core: "#cfe8c0", ribbon: "111,160,94" },
  beef:   { body: "#4c7a44", core: "#b9d3a8", ribbon: "76,122,68" },
  dairy:  { body: "#5e9c7a", core: "#c3e3d3", ribbon: "94,156,122" },
  swine:  { body: "#d8b53f", core: "#f4e3a1", ribbon: "216,181,63" }
};

var TRAVEL_S = 3.0;                        /* one dot journey ≈ 1 modeled year */
var CAP_SOFT = 330, CAP_HARD = 450;
var K_STEPS = [10, 25, 50, 100];
var FLOOR_PCT = 1;                         /* <1% of out-of-state: ribbon only */

var fmtInt = function (n) { return Math.round(n).toLocaleString("en-US"); };
function fmtHead(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return fmtInt(n);
}
var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

/* ---------------- app state ---------------- */
var S = {
  state: store("drove:last") || "Texas",
  cat: "cattle",
  dir: "out",                              /* out | in */
  layout: 0,                               /* 0 = MAP, 1 = RANK (knob scrub blends) */
  quarter: 0,                              /* 0 = annual, 1..4 */
  K: 25, autoK: 25,                        /* user faucet K; autoK = effective (≥K) */
  lens: false, lensDir: null, playYear: false,
  motion: !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),
  settled: false
};
if (STATE_LIST.indexOf(S.state) < 0) S.state = "Texas";
if (store("drove:motion") === "off") S.motion = false;

/* ---------------- data adapter (all honesty gating flows from here) ------ */
function block() { return CAPS[S.cat].data ? CAPS[S.cat].data[S.state] : null; }
function sparseSwine(cat, st) {
  if (cat !== "swine") return false;
  var d = CAPS.swine.data && CAPS.swine.data[st];
  return !d || (typeof d.total_shipments_yr === "number" && d.total_shipments_yr < SWINE_MIN);
}
/* resolve the current scene's dataset; returns {gated, reason} when nothing may render */
function resolve() {
  var caps = CAPS[S.cat], d = block();
  if (!d) return { gated: true, reason: "no data" };
  if (sparseSwine(S.cat, S.state)) return { gated: true, reason: "sparse-swine" };
  if (S.dir === "in" && !caps.inArr) return { gated: true, reason: "no-inbound" };
  var partners = (S.dir === "in" ? d.in_partner_states : d.partner_states) || [];
  var total = S.dir === "in" ? d.in_total_shipments_yr : d.total_shipments_yr;
  /* in_total_shipments_yr INCLUDES in-state arrivals (dCountyId filter) — the
     cross-state inbound pool is in_total x in_from_outstate_pct, so the halo
     residual never absorbs in-state movement (that's the orbit ring's job) */
  var crossTotal = S.dir === "in"
    ? total * (d.in_from_outstate_pct != null ? d.in_from_outstate_pct : 100) / 100
    : total * (d.leaving_pct || 0) / 100;
  var listed = partners.reduce(function (a, p) { return a + p.shipments; }, 0);
  var residual = Math.max(0, Math.round(crossTotal - listed));
  return { gated: false, d: d, caps: caps, partners: partners, total: total,
           crossTotal: crossTotal, residual: residual };
}
/* ---- per-PARTNER seasonality + across-network spread (USAMM_FLOWX,
   generated 2026-08-14 by generate_flow_detail.R over the raw nets).
   When a pair is present, quarter rates come from the pair's own real
   quarterly breakdown; otherwise the state-level share is the declared
   fallback. Absent the file entirely, everything degrades to the old
   uniform behavior. */
var FX = window.USAMM_FLOWX || null;
var inQShares = null;                      /* aggregate inbound quarter shares (computed per scene) */
function fxEntry(name) {
  if (!FX || !FX[S.cat]) return null;
  return FX[S.cat][S.dir === "out" ? S.state + "|" + name : name + "|" + S.state] || null;
}
function stateQMult(qi) {                  /* state-aggregate multiplier for quarter qi */
  if (S.dir === "out") {
    var d = block();
    return d && d.quarters && d.quarters[qi - 1] ? (d.quarters[qi - 1].pct || 25) / 25 : 1;
  }
  return inQShares ? inQShares[qi - 1] * 4 : 1;
}
function quarterShare(l, qi) {             /* per-link multiplier for quarter qi */
  var e = l.fxe;
  if (e && e.qsum > 0) return 4 * e.q[qi - 1] / e.qsum;
  return stateQMult(qi);
}
/* the ▶ year cycle STEPS through the four real values — the 0.6s boundary
   crossfade is a visual transition, never a fabricated data value */
function playPhase() {
  var ph = yearPhase * 4;
  var qi = Math.floor(ph) % 4, into = ph - Math.floor(ph), EDGE = 0.2;
  return { cur: qi + 1, prev: ((qi + 3) % 4) + 1, f: into < EDGE ? (function (x) { return x * x * (3 - 2 * x); })(into / EDGE) : 1 };
}
function linkMult(l) {
  if (S.playYear && S.dir === "out") {
    var p = playPhase();
    return quarterShare(l, p.prev) * (1 - p.f) + quarterShare(l, p.cur) * p.f;
  }
  if (S.quarter === 0) return 1;
  return quarterShare(l, S.quarter);
}
function seasonMult() {                    /* state-aggregate view (K sizing, static density) */
  if (S.playYear && S.dir === "out") {
    var p = playPhase();
    return stateQMult(p.prev) * (1 - p.f) + stateQMult(p.cur) * p.f;
  }
  if (S.quarter === 0) return 1;
  return stateQMult(S.quarter);
}
var yearPhase = 0, lastPlayQ = -1;

/* ---------------- shared critically-damped spring ---------------- */
function Spring(v, stiff, damp) { this.v = v; this.t = v; this.vel = 0; this.k = stiff || 90; this.c = damp || 2 * Math.sqrt(stiff || 90); }
Spring.prototype.step = function (dt) {
  var a = this.k * (this.t - this.v) - this.c * this.vel;
  this.vel += a * dt; this.v += this.vel * dt;
  if (Math.abs(this.t - this.v) < 0.05 && Math.abs(this.vel) < 0.05) { this.v = this.t; this.vel = 0; }
  return this.v;
};
Spring.prototype.snap = function () { this.v = this.t; this.vel = 0; };

/* ---------------- canvases ---------------- */
var ribCv = document.getElementById("ribbons"), moteCv = document.getElementById("motes");
var ribCx = ribCv.getContext("2d"), moteCx = moteCv.getContext("2d");
var W = 0, H = 0, DPR = 1, DPR_CAP = 2;
function sizeCanvases() {
  W = innerWidth; H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, DPR_CAP);
  [ribCv, moteCv].forEach(function (cv) {
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.getContext("2d").setTransform(DPR, 0, 0, DPR, 0, 0);
  });
  outlineDirty = true;
}
/* live resize only re-sizes canvases; the relayout is debounced and non-snap
   so springs glide to the re-projected targets instead of teleporting */
var resizeT = 0;
addEventListener("resize", function () {
  sizeCanvases();
  clearTimeout(resizeT);
  resizeT = setTimeout(function () { layoutScene(false); if (!S.motion) staticRender(); }, 150);
});
function resize() {           /* boot path: size + snap-layout in one step */
  sizeCanvases();
  layoutScene(true);
  if (!S.motion) staticRender();
}

/* workspace = stage minus chrome */
function ws() {
  var h = Math.max(200, H - wsTop - wsBot);
  return { x: 26, y: wsTop, w: W - 52, h: h };
}

/* ---------------- scene model ---------------- */
var nodes = {};   /* name -> {sx,sy(Springs), r, glow, hub, alpha} */
var links = [];   /* {name, ship(Spring displayed), pct, pctOut, floored, lut, width} */
var haloR = 0, orbitDots = [], sceneInfo = null;
var OUTLINES = window.USAMM_OUTLINES || {};
var mapProj = null;                        /* saved by layoutScene for the outline underlay */
var outlineCv = document.createElement("canvas"), outlineDirty = true;
var haloRS = new Spring(200, 40);          /* halo radius glides, never snaps */
var pulseT0 = -1e9;                        /* flow-switch hover: partner outlines pulse */
/* THE CAMERA: extent changes PAN (Ken Burns) instead of fading — the pan
   spring leads and the zoom spring settles just behind it */
var camLon = new Spring(-98.5, 22), camLat = new Spring(39.5, 22), camSc = new Spring(6, 14);
var camSettled = true;
var hubGeoRef = null, sceneRankHub = null; /* per-scene geo for per-frame retargeting */
function buildProj() {
  var box = ws();
  var cosC = Math.cos(camLat.v * Math.PI / 180) || 1;
  var ox = box.x + box.w / 2, oy = box.y + box.h / 2, sc = camSc.v;
  mapProj = function (lon, lat) { return [ox + (lon - camLon.v) * cosC * sc, oy + (camLat.v - lat) * sc]; };
}

function nodeAt(name, x, y, r, hub) {
  var n = nodes[name];
  if (!n) {
    n = nodes[name] = { sx: new Spring(x, 70), sy: new Spring(y, 70), r: r, glow: 0, hub: hub, alpha: 0, gone: false };
    if (!S.motion) { n.sx.snap(); n.sy.snap(); }
  }
  n.sx.t = x; n.sy.t = y; n.r = r; n.hub = hub; n.gone = false;
  return n;
}

/* layout targets — blends MAP (0) and RANK (1) by S.layout.
   Links are RECONCILED by partner name (never blindly recreated): emission
   accumulators and in-flight motes survive geometry-only rebuilds (knob
   scrub, resize) and category morphs; motes are flushed only when the
   state or direction actually changes (their anchors would be wrong). */
var linkByName = {}, sceneKey = "", rankStagger = null;
function layoutScene(snap) {
  var newKey = S.state + "|" + S.dir;
  var newCatKey = newKey + "|" + S.cat;
  var anchorsChanged = newKey !== sceneKey; /* state/dir changed → flush motes */
  var sceneChanged = newCatKey !== layoutScene._ck;
  sceneKey = newKey; layoutScene._ck = newCatKey;
  measureChrome();
  var R = resolve(); sceneInfo = R;
  document.getElementById("veil").classList.toggle("on", !!R.gated);
  Object.keys(nodes).forEach(function (k) { nodes[k].gone = true; });
  if (anchorsChanged) {
    motes.length = 0; haloAcc = 0;
    if (moteCx) moteCx.clearRect(0, 0, W, H);
  }
  orbitTargetN = 0;                        /* re-set below for live scenes */
  if (R.gated) {
    /* sweep BEFORE returning so stale nodes fade instead of leaking */
    Object.keys(nodes).forEach(function (k) { if (nodes[k].gone) nodes[k].alphaT = 0; });
    links = []; linkByName = {}; motes.length = 0; haloAcc = 0;
    orbitDots.length = 0;
    if (moteCx) moteCx.clearRect(0, 0, W, H);
    focusLink = null;
    updateChrome(); rebuildLabels(); if (!S.motion) staticRender(); return;
  }

  var box = ws();
  var partners = R.partners;
  var maxShip = Math.max.apply(null, partners.map(function (p) { return p.shipments; }).concat([1]));

  /* MAP camera TARGET: auto-fit over hub + partners; the camera springs pan
     and zoom there (Ken Burns) rather than cutting or fading */
  var hubGeo = GEO[S.state];
  var geoList = [[S.state, hubGeo]].concat(partners.map(function (p) { return [p.state, GEO[p.state]]; }))
    .filter(function (e) { return e[1]; });
  var tLon = 0, tLat = 0;
  geoList.forEach(function (e) { tLon += e[1].lon; tLat += e[1].lat; });
  tLon /= geoList.length; tLat /= geoList.length;
  var tCos = Math.cos(tLat * Math.PI / 180) || 1;
  var hx = 0, hy = 0;
  geoList.forEach(function (e) {
    hx = Math.max(hx, Math.abs((e[1].lon - tLon) * tCos));
    hy = Math.max(hy, Math.abs(tLat - e[1].lat));
  });
  hx = Math.max(hx, 4.5 * tCos); hy = Math.max(hy, 3);
  camLon.t = tLon; camLat.t = tLat;
  camSc.t = Math.min(box.w / (2 * hx * 1.22), box.h / (2 * hy * 1.22));
  if (snap || !S.motion) { camLon.snap(); camLat.snap(); camSc.snap(); camSettled = true; }
  else camSettled = false;
  buildProj();
  var mapPos = function (g) { return mapProj(g.lon, g.lat); };
  outlineDirty = true;
  hubGeoRef = hubGeo;

  /* RANK positions */
  var rankHub = [box.x + box.w * 0.22, box.y + box.h * 0.5];
  var rankX = box.x + box.w * 0.78;
  var rankY = function (i, n) { return box.y + box.h * (n === 1 ? 0.5 : 0.08 + 0.84 * i / (n - 1)); };
  sceneRankHub = rankHub;

  var t = S.layout;                        /* 0..1 blend */
  var mix = function (a, b) { return [a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t]; };

  var hubMap = hubGeo ? mapPos(hubGeo) : [ox, oy];
  var hubP = mix(hubMap, rankHub);
  var hub = nodeAt(S.state, hubP[0], hubP[1], 13, true);
  hub.alphaT = 1;

  var newMap = {};
  links = [];
  partners.forEach(function (p, i) {
    var g = GEO[p.state]; if (!g) return;
    var mp = mapPos(g), rp = [rankX, rankY(i, partners.length)];
    var pos = mix(mp, rp);
    /* kept for per-frame retargeting under the moving camera */
    var geoRef = g, rankRef = rp;
    var r = 4 + 9 * Math.sqrt(p.shipments / maxShip);
    var n = nodeAt(p.state, pos[0], pos[1], r, false);
    n.alphaT = 1;
    var l = linkByName[p.state];
    if (l) {
      /* reuse: in-flight motes stay valid, acc keeps accruing, and the disp
         spring animates old magnitude → new (the category-morph width lerp) */
      l.node = n; l.hub = hub; l.ship = p.shipments; l.disp.t = p.shipments;
      l.pct = p.pct_of_total; l.pctOut = p.pct_of_outstate;
      l.floored = (p.pct_of_outstate != null && p.pct_of_outstate < FLOOR_PCT);
      l.width = 1 + 5 * Math.sqrt(p.shipments / maxShip);
    } else {
      l = { name: p.state, node: n, hub: hub,
        ship: p.shipments, pct: p.pct_of_total, pctOut: p.pct_of_outstate,
        floored: (p.pct_of_outstate != null && p.pct_of_outstate < FLOOR_PCT),
        disp: new Spring(p.shipments, 40), width: 1 + 5 * Math.sqrt(p.shipments / maxShip), acc: 0 };
    }
    /* per-pair flow detail: real quarterly breakdown + across-network spread */
    l.fxe = fxEntry(p.state);
    if (l.fxe && l.fxe.qsum == null) l.fxe.qsum = l.fxe.q[0] + l.fxe.q[1] + l.fxe.q[2] + l.fxe.q[3];
    /* steadiness: emission regularity ∝ across-network consistency; cv clamped
       to 1 so the long-run mean rate stays exactly ∝ the modeled mean */
    l.cv = (l.fxe && l.fxe.m > 0 && l.fxe.sd != null) ? Math.min(1, l.fxe.sd / l.fxe.m) : 0;
    l.burstW = 1.5 + (i % 5) * 0.35; l.burstP = i * 2.1;
    l.geo = geoRef; l.rankPos = rankRef;
    if (!S.motion || anchorsChanged) l.disp.snap();
    links.push(l); newMap[p.state] = l;
  });
  /* aggregate inbound quarter shares from the pairs (no state-level inbound
     quarter fact exists) — powers the season control + bars for inbound */
  inQShares = null;
  if (S.dir === "in") {
    var qt = [0, 0, 0, 0], qn = 0;
    links.forEach(function (l) {
      if (l.fxe) { for (var qi = 0; qi < 4; qi++) qt[qi] += l.fxe.q[qi]; qn++; }
    });
    var qtot = qt[0] + qt[1] + qt[2] + qt[3];
    if (qn > 0 && qtot > 0) inQShares = qt.map(function (v) { return v / qtot; });
  }
  /* drop motes riding links that no longer exist */
  for (var mi = motes.length - 1; mi >= 0; mi--) {
    if (motes[mi].l && newMap[motes[mi].l.name] !== motes[mi].l) motes.splice(mi, 1);
  }
  linkByName = newMap;
  /* re-bind the focused link by name; hide the tag if its partner is gone */
  if (focusLink) { focusLink = newMap[focusLink.name] || null; if (!focusLink) hideTag(); }

  /* halo ring radius: beyond farthest partner — sprung so extent changes glide */
  var far = 60;
  links.forEach(function (l) {
    far = Math.max(far, Math.hypot(l.node.sx.t - hub.sx.t, l.node.sy.t - hub.sy.t));
  });
  haloRS.t = Math.min(far + 55, Math.max(box.w, box.h) * 0.62);
  if (snap || !S.motion) haloRS.snap();
  haloR = haloRS.v;

  /* orbit ring: 1 dot ≈ 1% of the total that is in-state movement
     (outbound: instate_pct staying; inbound: 100 − in_from_outstate_pct arriving from in-state).
     The dots are PERSISTENT — on changes they realign, fade in/out, and the
     spin decelerates through zero to reverse (see stepOrbit). */
  var orbitPct = S.dir === "out"
    ? (typeof R.d.instate_pct === "number" ? R.d.instate_pct : 0)
    : (typeof R.d.in_from_outstate_pct === "number" ? 100 - R.d.in_from_outstate_pct : 0);
  orbitTargetN = Math.max(0, Math.round(orbitPct));
  if (!S.motion) syncOrbitInstant();

  if (snap || !S.motion) Object.keys(nodes).forEach(function (k) { nodes[k].sx.snap(); nodes[k].sy.snap(); });
  Object.keys(nodes).forEach(function (k) { if (nodes[k].gone) { nodes[k].alphaT = 0; } });
  /* RANK re-rank choreography: on a scene change in the list view, each row
     holds, dims for a beat, pulses ("considering its new rank"), then glides
     to its slot — sequenced top to bottom. Pure theater; targets are the same. */
  rankStagger = null;
  if (S.motion && !snap && sceneChanged && S.layout >= 0.5 && links.length) {
    rankStagger = links.map(function (l, i) {
      var it = { n: l.node, tx: l.node.sx.t, ty: l.node.sy.t,
                 at: perfNow / 1000 + 0.25 + i * 0.14, dimmed: false, done: false };
      l.node.sx.t = l.node.sx.v; l.node.sy.t = l.node.sy.v;   /* hold in place */
      l.node.queued = true;                /* abbr goes gray until this row sorts */
      return it;
    });
  }
  if (sceneChanged) {                       /* knob scrub / resize skip the expensive chrome pass */
    autoKUpdate(); updateChrome(); rebuildLabels();
  }
  S.settled = false; settleTimer = 0;
  if (!S.motion) staticRender();
}
/* cached chrome bounds — ws() runs per-link per-frame, never measure there */
var wsTop = 182, wsBot = 205;
function measureChrome() {
  try {
    var sh = document.getElementById("shelf").getBoundingClientRect();
    var dk = document.getElementById("dock").getBoundingClientRect();
    wsTop = Math.max(140, sh.bottom + 8);
    wsBot = Math.max(150, H - dk.top + 6);
  } catch (e) {}
}

/* bezier LUT per link, computed each frame from live node positions */
function linkLUT(l) {
  var x0 = l.hub.sx.v, y0 = l.hub.sy.v, x1 = l.node.sx.v, y1 = l.node.sy.v;
  var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  /* bow away from workspace center for de-tangling */
  var box = ws(), cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  var side = ((mx - cx) * -dy + (my - cy) * dx) >= 0 ? 1 : -1;
  var off = 0.16 * len * side;
  var px = mx + (-dy / len) * off, py = my + (dx / len) * off;
  var pts = [];
  for (var i = 0; i <= 16; i++) {
    var u = i / 16, v = 1 - u;
    pts.push([v * v * x0 + 2 * v * u * px + u * u * x1, v * v * y0 + 2 * v * u * py + u * u * y1]);
  }
  return pts;
}

/* ---------------- particles ---------------- */
var sprites = {};
function sprite(body, core, r) {
  var key = body + core + r;
  if (sprites[key]) return sprites[key];
  var s = Math.ceil(r * 4.5), cv = document.createElement("canvas");
  cv.width = cv.height = s;
  var cx = cv.getContext("2d");
  var g = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, core); g.addColorStop(0.3, body + "cc"); g.addColorStop(1, body + "00");
  cx.fillStyle = g; cx.fillRect(0, 0, s, s);
  return (sprites[key] = cv);
}
/* halo motes are deliberately NOT dots: a wide, faint breath of light that
   reads as ambient in/out flow rather than an attributable stream */
function haloSprite(body) {
  var key = "halo" + body;
  if (sprites[key]) return sprites[key];
  /* half the brightness, twice the diffusion — pure ambience, never a dot */
  var s = 88, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  var cx = cv.getContext("2d");
  var g = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, body + "17"); g.addColorStop(0.5, body + "0b"); g.addColorStop(1, body + "00");
  cx.fillStyle = g; cx.fillRect(0, 0, s, s);
  return (sprites[key] = cv);
}
var motes = [];   /* {l(link) or halo/orbit, u, dur, r, core, body, dirIn} */

function binRadius(cat, d) {
  if (!CAPS[cat].bins || !d.volume_bins || !d.volume_bins.length) return 1.3;
  var r = Math.random() * 100, acc = 0;
  for (var i = 0; i < d.volume_bins.length; i++) {
    acc += d.volume_bins[i].pct;
    if (r <= acc) return 0.9 + 1.6 * Math.min(1, Math.log2(Math.max(2, d.volume_bins[i].mid_head) / 2) / Math.log2(175 / 2));
  }
  return 1.3;
}
function spawnRate(ship) { return (ship / S.autoK) / TRAVEL_S; }

function emit(dt) {
  /* the flow keeps running under an open county lens — the scene never sleeps */
  if (!sceneInfo || sceneInfo.gated) return;
  var hue = HUE[S.cat], d = sceneInfo.d;
  /* Cattle OUTBOUND dots sample the state's real beef/dairy commodity split
     (inbound is combined-commodity in the model — stays one color). */
  var tint = (S.cat === "cattle" && S.dir === "out" && typeof d.beef_pct === "number");
  var pick = function () {
    if (!tint) return hue;
    return Math.random() * 100 < d.beef_pct ? HUE.beef : HUE.dairy;
  };
  links.forEach(function (l) {
    if (l.floored) return;
    /* per-partner quarter rate × steadiness burst (mean-preserving, cv ≤ 1) */
    var burst = l.cv ? Math.max(0, 1 + l.cv * Math.sin(perfNow / 1000 * l.burstW + l.burstP)) : 1;
    l.acc += spawnRate(l.disp.v) * linkMult(l) * burst * dt;
    while (l.acc >= 1 && motes.length < CAP_HARD) {
      l.acc -= 1;
      var h = pick();
      /* inbound dots are UNIFORM — volume_bins are outbound-direction only,
         and DROVE never substitutes wrong-direction provenance */
      motes.push({ l: l, u: 0, dur: TRAVEL_S * (0.85 + Math.random() * 0.3),
        r: S.dir === "in" ? 1.3 : binRadius(S.cat, d), core: h.core, body: h.body, dirIn: S.dir === "in" });
      /* birth-color rule: core/body are fixed at emission and never re-tinted */
    }
    if (l.acc > 3) l.acc = 3;
  });
  /* residual halo stream */
  if (sceneInfo.residual > 0) {
    haloAcc += spawnRate(sceneInfo.residual) * dt;
    while (haloAcc >= 1 && motes.length < CAP_HARD) {
      haloAcc -= 1;
      motes.push({ halo: true, a: (motes.length * 2.399963) % (Math.PI * 2), u: 0,
        dur: TRAVEL_S * (0.85 + Math.random() * 0.3), r: 1.1, core: hue.core, body: hue.body, dirIn: S.dir === "in" });
    }
    if (haloAcc > 3) haloAcc = 3;
  }
}
var haloAcc = 0;

function stepMotes(dt) {
  for (var j = fadingMotes.length - 1; j >= 0; j--) {
    fadingMotes[j].a -= dt / 0.9;          /* frozen dots fade over ~0.9s */
    if (fadingMotes[j].a <= 0) fadingMotes.splice(j, 1);
  }
  var hub = nodes[S.state];
  for (var i = motes.length - 1; i >= 0; i--) {
    var m = motes[i];
    m.u += dt / m.dur;
    if (m.u >= 1) {
      if (m.l && !m.dirIn) m.l.node.glow = Math.min(1, m.l.node.glow + 0.35);
      if (m.dirIn && hub) hub.glow = Math.min(1, hub.glow + 0.12);
      motes.splice(i, 1);
    }
  }
}
function drawMotes() {
  moteCx.globalCompositeOperation = "destination-out";
  moteCx.fillStyle = "rgba(0,0,0," + trailAlpha + ")";
  moteCx.fillRect(0, 0, W, H);
  moteCx.globalCompositeOperation = "lighter";
  /* frozen dots from the previous setting, fading in place under the new flow */
  for (var fi = 0; fi < fadingMotes.length; fi++) {
    var fm = fadingMotes[fi];
    var fsp = fm.halo ? haloSprite(fm.body) : sprite(fm.body, fm.core, fm.r);
    moteCx.globalAlpha = Math.max(0, fm.a);
    moteCx.drawImage(fsp, fm.x - fsp.width / 2, fm.y - fsp.height / 2);
  }
  moteCx.globalAlpha = 1;
  var hub = nodes[S.state]; if (!hub) { moteCx.globalCompositeOperation = "source-over"; return; }
  for (var i = 0; i < motes.length; i++) {
    var m = motes[i], x, y;
    var u = m.dirIn ? 1 - m.u : m.u;      /* birth-color + reversed traversal for inbound */
    if (m.halo) {
      var hx2 = hub.sx.v + Math.cos(m.a) * haloR * u, hy2 = hub.sy.v + Math.sin(m.a) * haloR * u;
      x = hx2; y = hy2;
    } else {
      var lut = m.l.lut; if (!lut) continue;    /* reconciled links carry this frame's LUT */
      var f = u * 16, i0 = Math.floor(f), fr = f - i0;
      var p0 = lut[Math.min(16, i0)], p1 = lut[Math.min(16, i0 + 1)];
      x = p0[0] + (p1[0] - p0[0]) * fr; y = p0[1] + (p1[1] - p0[1]) * fr;
    }
    var sp = m.halo ? haloSprite(m.body) : sprite(m.body, m.core, m.r);
    moteCx.drawImage(sp, x - sp.width / 2, y - sp.height / 2);
  }
  /* orbit ring — each dot ≈ 1% of the in-state share (persistent, fading) */
  if (orbitDots.length) {
    var oR = hub.r * 2.9;
    var sp2 = sprite(HUE[S.cat].body, HUE[S.cat].body, 1.1);
    for (var j = 0; j < orbitDots.length; j++) {
      var o = orbitDots[j];
      var a = o.aOff + orbitPhase;
      var x2 = hub.sx.v + Math.cos(a) * oR * o.w, y2 = hub.sy.v + Math.sin(a) * oR * o.w;
      moteCx.globalAlpha = Math.max(0, Math.min(1, o.alpha));
      moteCx.drawImage(sp2, x2 - sp2.width / 2, y2 - sp2.height / 2);
    }
    moteCx.globalAlpha = 1;
  }
  moteCx.globalCompositeOperation = "source-over";
}
var orbitPhase = 0, trailAlpha = 0.22;
var orbitTargetN = 0;
var orbitVel = new Spring(Math.PI * 2 / 12, 6);   /* soft: reversals decelerate through zero */
function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function syncOrbitInstant() {
  orbitDots.length = 0;
  for (var i = 0; i < orbitTargetN; i++)
    orbitDots.push({ aOff: i / Math.max(1, orbitTargetN) * Math.PI * 2, w: 0.9 + (i % 7) * 0.04, alpha: 1, alphaT: 1 });
}
function stepOrbit(dt) {
  /* spin target flips sign by direction; the spring carries the deceleration */
  orbitVel.t = (S.dir === "in" ? -1 : 1) * Math.PI * 2 / 12;
  orbitPhase += orbitVel.step(dt) * dt;
  /* reconcile population: excess dots fade out, newcomers fade in */
  var live = 0;
  for (var i = 0; i < orbitDots.length; i++) if (orbitDots[i].alphaT > 0) live++;
  if (live < orbitTargetN) {
    for (var k = live; k < orbitTargetN; k++)
      orbitDots.push({ aOff: k / orbitTargetN * Math.PI * 2, w: 0.9 + (k % 7) * 0.04, alpha: 0, alphaT: 1 });
  } else if (live > orbitTargetN) {
    var kept = 0;
    for (var j = 0; j < orbitDots.length; j++)
      if (orbitDots[j].alphaT > 0 && ++kept > orbitTargetN) orbitDots[j].alphaT = 0;
  }
  /* realign the survivors to even spacing */
  var liveDots = orbitDots.filter(function (d) { return d.alphaT > 0; });
  liveDots.forEach(function (d, k) {
    var ta = k / Math.max(1, liveDots.length) * Math.PI * 2;
    d.aOff += angDiff(ta, d.aOff) * Math.min(1, dt * 2.2);
  });
  for (var m2 = orbitDots.length - 1; m2 >= 0; m2--) {
    var d2 = orbitDots[m2];
    d2.alpha += (d2.alphaT - d2.alpha) * Math.min(1, dt * 3);
    if (d2.alphaT === 0 && d2.alpha < 0.03) orbitDots.splice(m2, 1);
  }
}

/* state-outline underlay: cached offscreen, blitted with the MAP↔RANK blend.
   Schematic connectors + real outlines — the outlines come from the same
   state.shp.simp geometry as the flyer county maps. */
function paintOutlines(ctx, alphaMult) {
  if (!mapProj) return;
  var rgb = HUE[S.cat].ribbon;
  Object.keys(OUTLINES).forEach(function (st) {
    var ring = OUTLINES[st], focal = st === S.state;
    ctx.beginPath();
    for (var i = 0; i < ring.length; i++) {
      var p = mapProj(ring[i][0], ring[i][1]);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.closePath();
    if (focal) { ctx.fillStyle = "rgba(" + rgb + "," + (0.07 * alphaMult).toFixed(3) + ")"; ctx.fill(); }
    ctx.strokeStyle = "rgba(" + rgb + "," + ((focal ? 0.5 : 0.14) * alphaMult).toFixed(3) + ")";
    ctx.lineWidth = focal ? 1.4 : 1;
    ctx.stroke();
  });
}
function renderOutlineCache() {
  outlineCv.width = Math.round(W * DPR); outlineCv.height = Math.round(H * DPR);
  var oc = outlineCv.getContext("2d");
  oc.setTransform(DPR, 0, 0, DPR, 0, 0);
  paintOutlines(oc, 1);
  outlineDirty = false;
}
/* focal-state outline drawn small around the hub while in RANK */
function drawFocalBadge(hub, alpha) {
  var ring = OUTLINES[S.state]; if (!ring || alpha <= 0.02) return;
  var minLon = 1e9, maxLon = -1e9, minLat = 1e9, maxLat = -1e9;
  for (var i = 0; i < ring.length; i++) {
    minLon = Math.min(minLon, ring[i][0]); maxLon = Math.max(maxLon, ring[i][0]);
    minLat = Math.min(minLat, ring[i][1]); maxLat = Math.max(maxLat, ring[i][1]);
  }
  var cosB = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
  var spanX = (maxLon - minLon) * cosB, spanY = maxLat - minLat;
  var sc = (W > 700 ? 220 : 110) / Math.max(spanX, spanY);   /* ~2x on desktop */
  var cx0 = (minLon + maxLon) / 2, cy0 = (minLat + maxLat) / 2;
  ribCx.beginPath();
  for (var j = 0; j < ring.length; j++) {
    var x = hub.sx.v + (ring[j][0] - cx0) * cosB * sc;
    var y = hub.sy.v + (cy0 - ring[j][1]) * sc;
    j ? ribCx.lineTo(x, y) : ribCx.moveTo(x, y);
  }
  ribCx.closePath();
  ribCx.strokeStyle = "rgba(" + HUE[S.cat].ribbon + "," + (0.35 * alpha) + ")";
  ribCx.lineWidth = 1.2;
  ribCx.stroke();
}

/* ---------------- ribbons (also the reduced-motion scene) ---------------- */
function drawRibbons(staticMode) {
  ribCx.clearRect(0, 0, W, H);
  if (!sceneInfo || sceneInfo.gated) return;
  var hub = nodes[S.state]; if (!hub) return;
  var rgb = HUE[S.cat].ribbon;
  var _staticK = staticMode ? staticK() : 0;
  /* cache each link's LUT for this frame — drawMotes reuses it */
  links.forEach(function (l) { l.lut = linkLUT(l); });

  /* MAP underlay fades out as the knob dials to RANK; the focal badge fades in.
     While the camera is in flight the outlines draw LIVE under it (the pan);
     once settled they come from the cache. */
  if (S.layout < 0.98) {
    var base = 1 - S.layout;
    if (!camSettled) {
      paintOutlines(ribCx, base);
    } else {
      if (outlineDirty) renderOutlineCache();
      ribCx.globalAlpha = base;
      ribCx.drawImage(outlineCv, 0, 0, W, H);
      ribCx.globalAlpha = 1;
    }
    /* flow-switch hover: this direction's partners pulse gently brighter */
    var pdt = (perfNow - pulseT0) / 1000;
    if (pdt < 1.8 && mapProj) {
      var env = Math.sin(Math.min(1, pdt / 1.8) * Math.PI);
      var wave = 0.5 + 0.5 * Math.sin(pdt * Math.PI * 3.33);
      var pa = 0.35 * env * wave * base;
      if (pa > 0.01) {
        links.forEach(function (l) {
          var ring = OUTLINES[l.name]; if (!ring) return;
          ribCx.beginPath();
          for (var i = 0; i < ring.length; i++) {
            var p = mapProj(ring[i][0], ring[i][1]);
            i ? ribCx.lineTo(p[0], p[1]) : ribCx.moveTo(p[0], p[1]);
          }
          ribCx.closePath();
          ribCx.strokeStyle = "rgba(" + rgb + "," + pa.toFixed(3) + ")";
          ribCx.lineWidth = 1.6;
          ribCx.stroke();
        });
      }
    }
  }
  if (S.layout > 0.5) drawFocalBadge(hub, (S.layout - 0.5) * 2);

  /* halo ring */
  if (sceneInfo.residual > 0) {
    ribCx.beginPath();
    ribCx.setLineDash([2, 7]);
    ribCx.arc(hub.sx.v, hub.sy.v, haloR, 0, Math.PI * 2);
    ribCx.strokeStyle = "rgba(" + rgb + ",0.22)"; ribCx.lineWidth = 1.5; ribCx.stroke();
    ribCx.setLineDash([]);
  }
  links.forEach(function (l) {
    var lut = l.lut;
    ribCx.beginPath();
    ribCx.moveTo(lut[0][0], lut[0][1]);
    for (var i = 1; i <= 16; i++) ribCx.lineTo(lut[i][0], lut[i][1]);
    var focusDim = focusLink && focusLink !== l ? 0.35 : 1;
    ribCx.strokeStyle = "rgba(" + rgb + "," + (0.20 * focusDim + (focusLink === l ? 0.25 : 0)) + ")";
    ribCx.lineWidth = l.width * (l.disp.v / (l.ship || 1));
    ribCx.lineCap = "round";
    ribCx.stroke();
    /* arrowhead at the receiving end (partner for out, hub for in) */
    var tip = S.dir === "in" ? lut[0] : lut[16], prev = S.dir === "in" ? lut[1] : lut[15];
    var ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    ribCx.beginPath();
    ribCx.moveTo(tip[0], tip[1]);
    ribCx.lineTo(tip[0] - Math.cos(ang - 0.5) * 8, tip[1] - Math.sin(ang - 0.5) * 8);
    ribCx.lineTo(tip[0] - Math.cos(ang + 0.5) * 8, tip[1] - Math.sin(ang + 0.5) * 8);
    ribCx.closePath();
    ribCx.fillStyle = "rgba(" + rgb + "," + 0.5 * focusDim + ")";
    ribCx.fill();
    /* reduced-motion dotted density: dots along the bed ∝ shipments/staticK —
       same encoding frozen, incl. the active quarter share, cap-free by construction */
    if (staticMode && !l.floored) {
      var nD = Math.min(60, Math.max(1, Math.round(l.ship * linkMult(l) / _staticK)));
      ribCx.fillStyle = HUE[S.cat].body;
      for (var k = 1; k <= nD; k++) {
        var f = k / (nD + 1) * 16, i0 = Math.floor(f), fr = f - i0;
        var p0 = lut[i0], p1 = lut[Math.min(16, i0 + 1)];
        ribCx.beginPath();
        ribCx.arc(p0[0] + (p1[0] - p0[0]) * fr, p0[1] + (p1[1] - p0[1]) * fr, 1.6, 0, Math.PI * 2);
        ribCx.fill();
      }
    }
  });

  /* nodes (alpha respects the re-rank dim + fade-in) */
  links.forEach(function (l) {
    var n = l.node, g = Math.max(0, n.glow);
    ribCx.beginPath();
    ribCx.arc(n.sx.v, n.sy.v, n.r + g * 3, 0, Math.PI * 2);
    ribCx.fillStyle = "rgba(" + rgb + "," + ((0.55 + g * 0.4) * Math.max(0.15, n.alpha)).toFixed(3) + ")";
    ribCx.fill();
  });

  /* hub: double ring, inner arc length = instate_pct; breathing halo is DECORATIVE */
  var breathe = S.motion && !staticMode ? 1 + 0.06 * Math.sin(perfNow / 4800 * Math.PI * 2) : 1;
  ribCx.beginPath();
  ribCx.arc(hub.sx.v, hub.sy.v, hub.r * 1.9 * breathe, 0, Math.PI * 2);
  ribCx.strokeStyle = "rgba(" + rgb + ",0.25)"; ribCx.lineWidth = 1.5; ribCx.stroke();
  var arcPct = S.dir === "out"
    ? (sceneInfo.d && typeof sceneInfo.d.instate_pct === "number" ? sceneInfo.d.instate_pct : null)
    : (sceneInfo.d && typeof sceneInfo.d.in_from_outstate_pct === "number" ? 100 - sceneInfo.d.in_from_outstate_pct : null);
  if (arcPct != null) {
    ribCx.beginPath();
    ribCx.arc(hub.sx.v, hub.sy.v, hub.r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arcPct / 100);
    ribCx.strokeStyle = HUE[S.cat].body; ribCx.lineWidth = 3; ribCx.lineCap = "round"; ribCx.stroke();
  }
  ribCx.beginPath();
  ribCx.arc(hub.sx.v, hub.sy.v, hub.r + hub.glow * 2.5, 0, Math.PI * 2);
  ribCx.fillStyle = HUE[S.cat].body; ribCx.fill();
  ribCx.beginPath();
  ribCx.arc(hub.sx.v, hub.sy.v, hub.r * 0.45, 0, Math.PI * 2);
  ribCx.fillStyle = HUE[S.cat].core; ribCx.fill();
  /* static orbit arc in reduced motion */
  if (staticMode && orbitDots.length) {
    ribCx.beginPath();
    ribCx.arc(hub.sx.v, hub.sy.v, hub.r * 2.9, 0, Math.PI * 2 * orbitDots.length / 100);
    ribCx.strokeStyle = "rgba(" + rgb + ",0.5)"; ribCx.lineWidth = 4; ribCx.stroke();
  }
}

/* ---------------- labels ---------------- */
var labelHost = document.getElementById("labels"), labelEls = {};
/* label verb: outbound partners RECEIVE from the focal state, inbound
   partners SEND to it — "Pennsylvania sends 1,574/yr". With a quarter
   selected, the pair's own real quarterly number is shown when baked. */
function linkSub(l) {
  var verb = S.dir === "in" ? "sends" : "receives";
  if (S.quarter > 0 && l.fxe) {
    return verb + " " + fmtInt(l.fxe.q[S.quarter - 1]) + "/yr in Q" + S.quarter;
  }
  return verb + " " + fmtInt(l.ship) + "/yr";
}
function rebuildLabels() {
  labelHost.innerHTML = ""; labelEls = {};
  if (!sceneInfo || sceneInfo.gated) return;
  var mk = function (name, hub, sub, rank) {
    var el = document.createElement("div");
    el.className = "nl" + (hub ? " hub" : "");
    el.innerHTML = (rank ? '<span class="rk">' + rank + "</span>" : "") +
      '<span class="ab">' + esc(GEO[name] ? GEO[name].abbr : name) + "</span>" +
      '<span class="full">' + esc(name) + (sub ? " " + sub : "") + "</span>";
    labelHost.appendChild(el); labelEls[name] = el;
  };
  mk(S.state, true, null, 0);
  links.forEach(function (l, i) { mk(l.name, false, linkSub(l), i + 1); });
  if (sceneInfo.residual > 0) {
    var el = document.createElement("div");
    el.className = "nl"; el.id = "haloLabel";
    el.innerHTML = '<span class="full" style="opacity:1">other states (combined) ' +
      (S.dir === "in" ? "send " : "receive ") + fmtInt(sceneInfo.residual) + "/yr</span>";
    labelHost.appendChild(el); labelEls["__halo"] = el;
  }
}
function placeLabels() {
  var hub = nodes[S.state];
  var rank = S.layout >= 0.5;             /* RANK reads as a LIST: labels beside nodes */
  labelHost.classList.toggle("rank", rank);
  Object.keys(labelEls).forEach(function (name) {
    var el = labelEls[name];
    if (name === "__halo") {
      if (hub) el.style.transform = "translate3d(" + hub.sx.v + "px," + Math.min(H - 225, hub.sy.v + haloR + 10) + "px,0) translate(-50%,-50%)";
      return;
    }
    var n = nodes[name]; if (!n) return;
    if (n.hub) {
      el.style.transform = "translate3d(" + n.sx.v + "px," + (n.sy.v - n.r - 16) + "px,0) translate(-50%,-100%)";
    } else if (rank) {
      /* beside the node — the label belongs unambiguously to its own row */
      el.style.transform = "translate3d(" + (n.sx.v + n.r + 12) + "px," + n.sy.v + "px,0) translateY(-50%)";
    } else {
      el.style.transform = "translate3d(" + n.sx.v + "px," + (n.sy.v + n.r + 13) + "px,0) translate(-50%,0)";
    }
    el.classList.toggle("settled", S.settled);
    el.classList.toggle("queued", !!n.queued);
    el.classList.toggle("dim", !!(focusLink && (!nodes[name] || (focusLink.name !== name && !n.hub))));
    if (!n.hub) el.style.opacity = (0.3 + 0.7 * Math.max(0, Math.min(1, n.alpha))).toFixed(2);
  });
  /* the tag chip rides its node through morphs instead of detaching */
  var chip = document.getElementById("tagChip");
  if (focusLink && chip.classList.contains("on")) {
    var fn = focusLink.node;
    chip.style.left = Math.max(125, Math.min(W - 125, fn.sx.v)) + "px";
    var above = fn.sy.v - fn.r > 260;
    chip.classList.toggle("below", !above);
    chip.style.top = (fn.sy.v + (above ? -fn.r : fn.r)) + "px";
  }
}

/* ---------------- chrome text (captions/legend/stats) ---------------- */
function updateChrome() {
  var nameEl = document.getElementById("stateName"), cap = document.getElementById("capChip");
  var legend = document.getElementById("legendChip"), chips = document.getElementById("statChips");
  nameEl.textContent = S.state;
  document.title = S.state + " · DROVE";
  var caps = CAPS[S.cat];
  var dirWord = S.dir === "in" ? "inbound" : "outgoing";
  var hasFx = links.some(function (l) { return !!l.fxe; });
  var fallbackNote = hasFx && links.some(function (l) { return !l.fxe; })
    ? " · state-level rates for unlisted pairs" : "";
  var seasonSuffix = "";
  if (S.dir === "out" && S.playYear) {
    var d0c = block(), qi = Math.floor(yearPhase * 4);
    var ql = d0c && d0c.quarters && d0c.quarters[qi] ? d0c.quarters[qi].label : "Q" + (qi + 1);
    seasonSuffix = ' · <span class="warn">cycling the modeled year — now ' + esc(ql) +
      (hasFx ? " (per-partner quarterly rates" + fallbackNote + ")" : " (quarterly shares of the state total)") + "</span>";
  } else if (S.quarter > 0) {
    seasonSuffix = hasFx
      ? ' · <span class="warn">Q' + S.quarter + " · per-partner quarterly rates · halo at annual mean" + fallbackNote + "</span>"
      : ' · <span class="warn">Q' + S.quarter + " share applied to state total — per-partner seasonality not reported</span>";
  }
  cap.innerHTML = "Interstate " + esc(caps.word) + " flows · model projection · " + dirWord + seasonSuffix;

  var R = sceneInfo || resolve();
  if (R.gated) {
    var vt = document.getElementById("veilText");
    if (R.reason === "sparse-swine") {
      var sd = CAPS.swine.data[S.state];
      vt.textContent = " USAMM projects " + (sd ? fmtInt(sd.total_shipments_yr) : "very few") +
        " modeled outgoing swine shipments/yr for " + S.state +
        " — below the " + fmtInt(SWINE_MIN) + "/yr reporting threshold, so all swine views are suppressed (matching the printed flyers).";
      cap.innerHTML = "Swine · model projection · suppressed below threshold";
    } else if (R.reason === "no-inbound") {
      vt.textContent = " Inbound facts were not generated for " + caps.word +
        " — only cattle and swine have inbound partner data. The county lens offers the real static inbound county map.";
      cap.innerHTML = "Inbound " + esc(caps.word) + " · not generated";
      document.getElementById("veil").querySelector("b").textContent = "Inbound not generated for " + caps.word;
    }
    if (R.reason === "sparse-swine") document.getElementById("veil").querySelector("b").textContent = "Minimal modeled swine movement";
    legend.innerHTML = "—";
    chips.innerHTML = "";
    updateSeasonBars();
    return;
  }

  var flooredN = links.filter(function (l) { return l.floored; }).length;
  var shownK = S.motion ? S.autoK : staticK();   /* static mode discloses its own density */
  legend.innerHTML = "<b>1 dot ≈ " + fmtInt(shownK) + " shipments/yr</b> · 1 loop ≈ 1 modeled year" +
    (shownK !== S.K ? ' · <span style="color:#d8b53f">auto-adjusted for density</span>' : "") +
    "<br>annual means, not live tracking" +
    (S.dir === "out" ? " · orbit dot ≈ 1% staying in-state" : " · orbit dot ≈ 1% arriving from in-state") +
    (S.cat === "cattle" && S.dir === "out" && R.d && typeof R.d.beef_pct === "number"
      ? "<br>dot color = commodity mix: " + R.d.beef_pct + "% beef · " + R.d.dairy_pct + "% dairy" : "") +
    (FX && (S.cat === "cattle" || S.cat === "swine") && links.some(function (l) { return l.cv > 0; })
      ? "<br>stream steadiness ∝ across-network consistency (" +
        fmtInt(S.cat === "swine" ? FX.nets.swine : FX.nets.cattle) + " nets)" : "") +
    (flooredN ? "<br>streams shown for partners ≥" + FLOOR_PCT + "% · all " + links.length + " ribbons drawn" : "");

  updateSeasonBars();
  var d = R.d, h = "";
  h += '<span class="schip"><b>' + fmtInt(R.total) + "</b> shipments/yr</span>";
  if (S.dir === "out") {
    if (caps.head && typeof d.est_head_yr === "number") h += '<span class="schip">≈<b>' + fmtHead(d.est_head_yr) + "</b> est. head/yr</span>";
    h += '<span class="schip"><b>' + d.instate_pct + "%</b> stay in-state</span>";
    h += '<span class="schip"><b>' + d.reach_states + "</b> states reached</span>";
  } else {
    if (typeof d.in_from_outstate_pct === "number")
      h += '<span class="schip"><b>' + d.in_from_outstate_pct + "%</b> from out-of-state</span>";
    h += '<span class="schip"><b>' + d.in_reach_states + "</b> source states</span>";
    h += '<span class="schip"><b>' + fmtInt(d.in_reach_counties) + "</b> origin counties</span>";
  }
  chips.innerHTML = h;
}

/* ---------------- frame loop + governor ---------------- */
var perfNow = 0, lastT = 0, slowFrames = 0, degradeStep = 0, settleTimer = 0, rafId = null;
function frame(t) {
  rafId = requestAnimationFrame(frame);
  if (!lastT) lastT = t;
  var dt = Math.min(0.05, (t - lastT) / 1000); lastT = t; perfNow = t;

  /* governor ladder: 60 consecutive >22ms frames → degrade + always update legend */
  if (dt > 0.022) { if (++slowFrames >= 60) { degrade(); slowFrames = 0; } } else slowFrames = 0;

  var moving = 0;
  Object.keys(nodes).forEach(function (k) {
    var n = nodes[k];
    n.sx.step(dt); n.sy.step(dt);
    n.alpha += ((n.alphaT || 0) - n.alpha) * Math.min(1, dt * 6);
    n.glow = Math.max(0, n.glow - dt * 1.6);
    moving += Math.abs(n.sx.vel) + Math.abs(n.sy.vel);
    if (n.gone && n.alpha < 0.02) delete nodes[k];
  });
  links.forEach(function (l) { l.disp.step(dt); });
  if (moving < 2) { settleTimer += dt; if (settleTimer > 0.4 && !S.settled) { S.settled = true; placeLabels(); } }
  else { settleTimer = 0; if (S.settled) { S.settled = false; } }

  /* orbit: clockwise = outgoing, counter-clockwise = inbound; on a flip the
     dots decelerate through zero, realign, and spin the other way */
  stepOrbit(dt);
  haloR = haloRS.step(dt);
  /* THE CAMERA: pan/zoom springs; while moving, the projection and every
     MAP-blended node target track it each frame */
  if (!camSettled) {
    camLon.step(dt); camLat.step(dt); camSc.step(dt);
    buildProj();
    outlineDirty = true;
    if (camLon.v === camLon.t && camLat.v === camLat.t && camSc.v === camSc.t) camSettled = true;
    if (S.layout < 0.999 && !rankStagger && sceneInfo && !sceneInfo.gated) {
      var hubN = nodes[S.state];
      if (hubN && hubGeoRef && sceneRankHub) {
        var hp = mapProj(hubGeoRef.lon, hubGeoRef.lat);
        hubN.sx.t = hp[0] * (1 - S.layout) + sceneRankHub[0] * S.layout;
        hubN.sy.t = hp[1] * (1 - S.layout) + sceneRankHub[1] * S.layout;
      }
      links.forEach(function (l) {
        if (!l.geo || !l.rankPos) return;
        var mp2 = mapProj(l.geo.lon, l.geo.lat);
        l.node.sx.t = mp2[0] * (1 - S.layout) + l.rankPos[0] * S.layout;
        l.node.sy.t = mp2[1] * (1 - S.layout) + l.rankPos[1] * S.layout;
      });
    }
  }
  /* drive the RANK re-rank sequence */
  if (rankStagger) {
    var nowS = t / 1000, allDone = true;
    rankStagger.forEach(function (it) {
      if (!it.dimmed && nowS > it.at - 0.16) { it.n.alphaT = 0.4; it.dimmed = true; }
      if (!it.done && nowS > it.at) {
        it.n.glow = Math.max(it.n.glow, 0.95);           /* the "considering" pulse */
        it.n.sx.t = it.tx; it.n.sy.t = it.ty;
        it.n.alphaT = 1; it.n.queued = false;            /* abbr snaps back to white */
        it.done = true;
      }
      if (!it.done) allDone = false;
    });
    if (allDone) rankStagger = null;
  }
  if (S.playYear && S.dir === "out") {
    yearPhase = (yearPhase + dt / 12) % 1;
    var qi = Math.floor(yearPhase * 4);
    if (qi !== lastPlayQ) { lastPlayQ = qi; updateChrome(); }
  }
  emit(dt);
  stepMotes(dt);

  drawRibbons(false);
  if (++clearCounter > 300) { moteCx.clearRect(0, 0, W, H); clearCounter = 0; }
  drawMotes();
  placeLabels();
}
var clearCounter = 0;
var govK = 0;                              /* persistent governor floor — survives relayouts */
function degrade() {
  degradeStep++;
  if (degradeStep === 1 && DPR_CAP > 1.5) { DPR_CAP = 1.5; sizeCanvases(); }
  else if (degradeStep === 2) trailAlpha = 0.3;
  else {
    var i = K_STEPS.indexOf(S.autoK);
    if (i >= 0 && i < K_STEPS.length - 1) { govK = K_STEPS[i + 1]; S.autoK = govK; updateChrome(); }
  }
}
function autoKUpdate() {
  /* keep expected in-flight ≤ CAP_SOFT at the WORST season multiplier;
     never below the user's chosen K, never below the governor's floor */
  var R = sceneInfo; if (!R || R.gated) return;
  var emitting = links.filter(function (l) { return !l.floored; })
    .reduce(function (a, l) { return a + l.ship; }, 0) + (R.residual || 0);
  var sm = 1;
  if (S.dir === "out") {
    var d = R.d;
    if (S.playYear && d.quarters) sm = Math.max.apply(null, d.quarters.map(function (q) { return q.pct; })) / 25;
    else sm = seasonMult();
  }
  var k = S.K, i = K_STEPS.indexOf(k);
  while (emitting * sm / k > CAP_SOFT && i < K_STEPS.length - 1) k = K_STEPS[++i];
  S.autoK = Math.max(k, govK);
}
/* static-mode density: unstepped so the biggest ribbon's 60-dot cap is honest */
function staticK() {
  var maxShip = 1;
  links.forEach(function (l) { if (!l.floored) maxShip = Math.max(maxShip, l.ship * linkMult(l)); });
  return Math.max(S.autoK, Math.ceil(maxShip / 60));
}
function startLoop() { if (rafId == null && S.motion) { lastT = 0; rafId = requestAnimationFrame(frame); } }
function stopLoop() { if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; } }
document.addEventListener("visibilitychange", function () { document.hidden ? stopLoop() : startLoop(); });

function staticRender() {
  stopLoop();
  haloRS.snap(); haloR = haloRS.v;
  camLon.snap(); camLat.snap(); camSc.snap(); camSettled = true; buildProj();
  outlineDirty = true;
  syncOrbitInstant();
  motes.length = 0; fadingMotes.length = 0;
  moteCx.clearRect(0, 0, W, H);
  Object.keys(nodes).forEach(function (k) { nodes[k].sx.snap(); nodes[k].sy.snap(); nodes[k].alpha = nodes[k].alphaT || 0; });
  links.forEach(function (l) { l.disp.snap(); });
  S.settled = true;
  drawRibbons(true);
  placeLabels();
}

/* ---------------- morph choreography ---------------- */
/* Setting changes freeze the current dots in place and fade them out while
   the new selection's emission ignites — one grace mechanism for state,
   direction, commodity and season changes (replaces the old "ebb"). */
var fadingMotes = [];
function freezeMotes() {
  if (!motes.length || !S.motion) { motes.length = 0; haloAcc = 0; return; }
  var hub = nodes[S.state];
  for (var i = 0; i < motes.length && fadingMotes.length < 500; i++) {
    var m = motes[i], x, y;
    var u = m.dirIn ? 1 - m.u : m.u;
    if (m.halo) {
      if (!hub) continue;
      x = hub.sx.v + Math.cos(m.a) * haloR * u;
      y = hub.sy.v + Math.sin(m.a) * haloR * u;
    } else {
      var lut = m.l.lut || linkLUT(m.l);
      var f = u * 16, i0 = Math.floor(f), fr = f - i0;
      var p0 = lut[Math.min(16, i0)], p1 = lut[Math.min(16, i0 + 1)];
      x = p0[0] + (p1[0] - p0[0]) * fr; y = p0[1] + (p1[1] - p0[1]) * fr;
    }
    fadingMotes.push({ x: x, y: y, halo: m.halo, body: m.body, core: m.core, r: m.r, a: 1 });
  }
  motes.length = 0; haloAcc = 0;
}

function go(state, cat, dir, opts) {
  opts = opts || {};
  var changed = state !== S.state || cat !== S.cat || dir !== S.dir;
  if (changed && !opts.instant) freezeMotes();
  S.state = state; S.cat = cat; S.dir = dir;
  if (dir === "in") S.playYear = false;   /* no inbound quarters exist */
  store("drove:last", state);
  focusLink = null; hideTag();
  layoutScene(!S.motion || opts.snap);
  syncControls();
  /* a lens open across a scene change follows the CURRENT direction —
     never a stale one — and closes for suppressed scenes */
  if (S.lens) {
    if (sparseSwine(S.cat, S.state)) closeLens();
    else openLens();
  }
  if (S.motion) startLoop(); else staticRender();
}

/* ---------------- controls ---------------- */
function syncControls() {
  /* shelf */
  var shelf = document.getElementById("shelf");
  Array.prototype.forEach.call(shelf.children, function (c) {
    var on = c.getAttribute("data-st") === S.state;
    c.classList.toggle("on", on);
    c.classList.toggle("gold", on && S.cat === "swine");
    if (on) c.scrollIntoView({ inline: "center", block: "nearest", behavior: S.motion ? "smooth" : "auto" });
  });
  /* knob */
  document.getElementById("knob").style.setProperty("--rot", (-40 + S.layout * 80) + "deg");
  document.querySelector(".d-map").classList.toggle("on", S.layout < 0.5);
  document.querySelector(".d-rank").classList.toggle("on", S.layout >= 0.5);
  /* flow switch */
  var flow = document.getElementById("flow"), capsNow = CAPS[S.cat];
  flow.classList.toggle("locked", !capsNow.inArr);
  flow.querySelector(".cap").style.setProperty("--x", S.dir === "in" ? "40px" : "0px");
  flow.querySelector(".cap").textContent = S.dir === "in" ? "IN" : "OUT";
  /* cats */
  var cats = document.getElementById("cats");
  cats.classList.toggle("gold", S.cat === "swine");
  var ci = CATS.indexOf(S.cat);
  cats.querySelector(".pill").style.transform = "translateX(" + ci * 100 + "%)";
  Array.prototype.forEach.call(cats.querySelectorAll("button"), function (b) {
    var c = b.getAttribute("data-cat");
    b.classList.toggle("on", c === S.cat);
    b.classList.toggle("na", c === "swine" && sparseSwine("swine", S.state));
  });
  /* season: active in inbound too when the per-pair quarter data covers it;
     sunk with a stated reason only where no quarter data exists */
  var season = document.getElementById("season");
  season.classList.toggle("sunk", S.dir === "in" && !inQShares);
  season.classList.toggle("gold", S.cat === "swine");
  Array.prototype.forEach.call(season.querySelectorAll("button[data-q]"), function (b) {
    b.classList.toggle("on", !S.playYear && +b.getAttribute("data-q") === S.quarter);
  });
  var pb = document.getElementById("playYear");
  pb.textContent = S.playYear ? "❚❚" : "▶";
  pb.classList.toggle("on", !!S.playYear);
  document.getElementById("lensBtn").classList.toggle("on", S.lens);
}

function toast(html, ms) {
  var t = document.getElementById("toast");
  t.innerHTML = html; t.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { t.classList.remove("on"); }, ms || 3200);
}

/* shelf */
(function () {
  var shelf = document.getElementById("shelf");
  STATE_LIST.forEach(function (st) {
    var c = document.createElement("button");
    c.className = "chip"; c.setAttribute("data-st", st); c.textContent = st;
    c.addEventListener("click", function () { go(st, S.cat, S.dir); });
    shelf.appendChild(c);
  });
})();

/* layout knob: drag scrubs the blend; release snaps to nearest detent */
(function () {
  var knob = document.getElementById("knob"), dragging = false, startA = 0, startL = 0;
  function angleOf(e, el) {
    var r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }
  knob.addEventListener("pointerdown", function (e) {
    dragging = true; startA = angleOf(e, knob); startL = S.layout;
    knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var da = angleOf(e, knob) - startA;
    da = Math.atan2(Math.sin(da), Math.cos(da));   /* unwrap ±π so crossing 12 o'clock never jumps */
    S.layout = Math.max(0, Math.min(1, startL + da / (80 * Math.PI / 180)));
    layoutScene(false); syncControls();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    S.layout = S.layout < 0.5 ? 0 : 1;
    layoutScene(false); syncControls();
    if (navigator.vibrate) navigator.vibrate(6);
  }
  /* an interrupted drag (incoming call, browser gesture) must never leave
     the scene wedged mid-morph */
  knob.addEventListener("pointerup", endDrag);
  knob.addEventListener("pointercancel", endDrag);
  knob.addEventListener("lostpointercapture", endDrag);
})();

/* flow switch */
document.getElementById("flow").addEventListener("click", function () {
  var caps = CAPS[S.cat];
  if (!caps.inArr) {
    toast("Inbound facts were not generated for " + caps.word +
      " — DROVE never substitutes other data. <a href='#' id='toastLens'>View the real inbound county map</a>", 5200);
    var a = document.getElementById("toastLens");
    if (a) a.addEventListener("click", function (ev) { ev.preventDefault(); openLens("in"); });
    return;
  }
  if (S.dir === "out" && S.quarter !== 0) { S.quarter = 0; }   /* seasons don't exist inbound */
  go(S.state, S.cat, S.dir === "out" ? "in" : "out");
});

/* commodity capsule */
document.getElementById("cats").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-cat]"); if (!b) return;
  var cat = b.getAttribute("data-cat");
  var dir = S.dir;
  if (dir === "in" && !CAPS[cat].inArr) {
    dir = "out";
    toast("Inbound isn’t generated for " + CAPS[cat].word + " — switched to outgoing.");
  }
  go(S.state, cat, dir);
});

/* season */
document.getElementById("season").addEventListener("click", function (e) {
  if (S.dir === "in" && !inQShares) {
    var n = document.getElementById("seasonNote");
    n.textContent = "No quarterly breakdown exists for this inbound view.";
    n.classList.add("on");
    clearTimeout(this._nt); this._nt = setTimeout(function () { n.classList.remove("on"); }, 2600);
    return;
  }
  if (S.dir === "in" && e.target.closest("#playYear")) {
    toast("The year cycle runs on the outgoing view.");
    return;
  }
  if (e.target.closest("#playYear")) {
    if (!S.motion) { toast("The year cycle needs motion — enable it in About."); return; }
    freezeMotes();                         /* old rhythm fades, the year cycle ignites fresh */
    S.playYear = !S.playYear;
    if (S.playYear) { S.quarter = 0; yearPhase = 0; lastPlayQ = -1; }
    autoKUpdate(); updateChrome(); syncControls();
    return;
  }
  var b = e.target.closest("button[data-q]"); if (!b) return;
  var q = +b.getAttribute("data-q");
  if (q !== S.quarter || S.playYear) freezeMotes();
  S.playYear = false;
  S.quarter = q;
  autoKUpdate();                           /* peak quarters can push in-flight over the cap */
  updateChrome(); syncControls();
  rebuildLabels();                         /* labels show the pair's real quarterly number */
  if (!S.motion) staticRender();
});

/* density is fully automatic now (autoK + governor); the legend chip keeps
   disclosing the live "1 dot ≈ N" so the encoding is never unstated */

/* the season box carries its own tiny histogram: real quarterly-share bars
   grow above the Q labels when the box is hovered (heights set here) */
function updateSeasonBars() {
  /* gated scenes (sparse swine, no-inbound) show no bars — same suppression.
     Outbound: state quarters fact. Inbound: aggregate of the per-pair data. */
  var gated = sceneInfo && sceneInfo.gated;
  var pcts = null, labels = ["winter (Jan-Mar)", "spring (Apr-Jun)", "summer (Jul-Sep)", "fall (Oct-Dec)"];
  if (!gated && S.dir === "out") {
    var d = block();
    if (d && d.quarters && d.quarters.length === 4) {
      pcts = d.quarters.map(function (q) { return q.pct; });
      labels = d.quarters.map(function (q) { return q.label; });
    }
  } else if (!gated && S.dir === "in" && inQShares) {
    pcts = inQShares.map(function (v) { return Math.round(v * 1000) / 10; });
  }
  var maxP = pcts ? (Math.max.apply(null, pcts) || 1) : 1;
  var peakQ = pcts ? pcts.indexOf(maxP) + 1 : 0;
  Array.prototype.forEach.call(document.querySelectorAll('#season button[data-q]'), function (b) {
    var q = +b.getAttribute("data-q");
    var bar = b.querySelector(".qbar");
    if (!bar || q === 0) { if (b.hasAttribute("data-q") && q === 0) b.title = "annual mean"; return; }
    bar.style.setProperty("--bh", (pcts ? Math.max(3, 30 * pcts[q - 1] / maxP) : 0) + "px");
    bar.classList.toggle("hot", !S.playYear && S.quarter === q);
    bar.classList.toggle("peak", q === peakQ);           /* solid line marks the peak quarter */
    b.title = pcts ? labels[q - 1] + " · " + pcts[q - 1] + "% of the modeled year" : "";
  });
}

/* hover the direction switch → this direction's partner outlines pulse */
(function () {
  var flow = document.getElementById("flow");
  flow.addEventListener("mouseenter", function () {
    if (!S.motion || !sceneInfo || sceneInfo.gated) return;
    pulseT0 = perfNow;
  });
})();

/* ---------------- county lens ---------------- */
function lensSrc(dir) {
  var c = CAPS[S.cat];
  return MAPS_ROOT + c.folder + "maps_svg/USAMM_" + S.state.replace(/\s+/g, "") + c.infix + "_" + dir + "_instate.svg";
}
function openLens(dirOverride) {
  /* the ONE gate for every lens entry point (button, long-press, toast, go()):
     sparse-swine states suppress ALL swine views incl. the county map —
     matching the flyers and Pocket USAMM's deep-link gate. beef/dairy
     inbound (cat !== "swine") passes through untouched. */
  if (sparseSwine(S.cat, S.state)) {
    toast("USAMM projects fewer than " + fmtInt(SWINE_MIN) + " modeled swine shipments/yr for " +
      esc(S.state) + " — all swine views, including the county map, are suppressed (matching the printed flyers).");
    return;
  }
  var dir = dirOverride || S.dir;
  var wasOpen = S.lens;
  S.lens = true; S.lensDir = dir;
  var img = document.getElementById("lensImg"), load = document.getElementById("lensLoad");
  var cap = document.getElementById("lensCap");
  var src = lensSrc(dir);
  if (wasOpen && img.getAttribute("src") === src) { syncControls(); return; }
  if (wasOpen && img.getAttribute("src")) {
    /* already showing a map: preload the new one and crossfade — no skeleton flash */
    img.style.opacity = "0.35";
    var pre = new Image();
    pre.onload = function () { img.src = src; img.style.opacity = "1"; };
    pre.onerror = function () { load.style.display = "flex"; load.textContent = "County map unavailable"; img.style.opacity = "0"; };
    pre.src = src;
  } else {
    load.style.display = "flex"; load.textContent = "loading county map…"; img.style.opacity = "0";
    img.onload = function () { load.style.display = "none"; img.style.opacity = "1"; };
    img.onerror = function () { load.textContent = "County map unavailable"; };
    img.src = src;
  }
  img.alt = S.state + " county-level " + CAPS[S.cat].word + " map (USAMM model projection)";
  document.getElementById("lensTitle").textContent =
    S.state + " — " + CAPS[S.cat].word + ", county view";
  cap.textContent = dir === "in"
    ? "Expected county-level shipment destinations · model projection · inbound"
    : "Expected county-level shipment origins · model projection · outgoing";
  document.getElementById("lensLayer").classList.add("on");
  syncControls();
}
function closeLens() {
  S.lens = false; S.lensDir = null;
  document.getElementById("lensLayer").classList.remove("on");
  syncControls();
}
document.getElementById("lensX").addEventListener("click", closeLens);
document.getElementById("lensBtn").addEventListener("click", function () {
  S.lens ? closeLens() : openLens();
});

/* long-press anywhere on the stage = lens peek (slop-cancelled, single-pointer,
   never hijacks a lens that's already open) */
var suppressStageClick = false;
(function () {
  var timer = null, peeking = false, pid = null, x0 = 0, y0 = 0;
  var stage = document.getElementById("stage");
  stage.addEventListener("pointerdown", function (e) {
    if (pid !== null || S.lens) return;
    if (e.target.closest("#dock") || e.target.closest(".sheet") ||
        e.target.closest("#shelf") || e.target.closest("#topbar")) return;
    pid = e.pointerId; x0 = e.clientX; y0 = e.clientY;
    timer = setTimeout(function () { peeking = true; openLens(); }, 500);
  });
  stage.addEventListener("pointermove", function (e) {
    if (e.pointerId === pid && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) {
      clearTimeout(timer);                 /* it's a drag/scroll, not a press */
    }
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
    stage.addEventListener(ev, function (e) {
      if (pid !== null && e.pointerId !== pid) return;
      clearTimeout(timer); pid = null;
      if (peeking) {
        peeking = false; closeLens();
        suppressStageClick = true;         /* eat the synthetic click that follows */
        setTimeout(function () { suppressStageClick = false; }, 400);
      }
    });
  });
})();

/* ---------------- tap-to-tag + travel ---------------- */
var focusLink = null, lastTap = 0, lastTapName = null;
function hideTag() { document.getElementById("tagChip").classList.remove("on"); focusLink = null; }
document.getElementById("stage").addEventListener("click", function (e) {
  if (suppressStageClick) { suppressStageClick = false; return; }
  if (e.target.closest("#dock") || e.target.closest("#topbar") || e.target.closest("#shelf")) return;
  if (S.lens) { if (!e.target.closest("#lensLayer")) closeLens(); return; }
  if (!sceneInfo || sceneInfo.gated) return;
  var x = e.clientX, y = e.clientY, best = null, bestD = 24;
  /* nodes first */
  links.forEach(function (l) {
    var d = Math.hypot(l.node.sx.v - x, l.node.sy.v - y);
    if (d < bestD + l.node.r) { best = l; bestD = d; }
  });
  if (!best) {
    /* then ribbon beds */
    bestD = 18;
    links.forEach(function (l) {
      var lut = linkLUT(l);
      for (var i = 0; i <= 16; i++) {
        var d = Math.hypot(lut[i][0] - x, lut[i][1] - y);
        if (d < bestD) { best = l; bestD = d; }
      }
    });
  }
  var now = Date.now();
  if (best && now - lastTap < 350 && lastTapName === best.name && STATE_LIST.indexOf(best.name) >= 0) {
    /* double-tap travel */
    hideTag();
    go(best.name, S.cat, S.dir);
    lastTap = 0;
    return;
  }
  lastTap = now; lastTapName = best ? best.name : null;
  var chip = document.getElementById("tagChip");
  if (!best) { hideTag(); return; }
  focusLink = best;
  /* the probe is the receipt: exact numbers + quarter ticks + network spread */
  var extra = "";
  var e = best.fxe;
  if (e) {
    var maxq = Math.max.apply(null, e.q.concat([1]));
    var bars = "";
    for (var qi = 0; qi < 4; qi++) {
      var bh = Math.max(1.5, 11 * e.q[qi] / maxq);
      bars += '<rect x="' + (qi * 11) + '" y="' + (12 - bh) + '" width="8" height="' + bh +
        '" rx="1" fill="' + (qi === e.q.indexOf(maxq) ? "#d8b53f" : "#5e8557") + '"/>';
    }
    extra += '<br><svg width="42" height="12" viewBox="0 0 42 12" style="vertical-align:middle">' + bars +
      '</svg> <span style="color:#8ba382;font-size:10.5px">Q1–Q4 share</span>';
    if (e.p10 != null && FX && FX.nets) {
      var nn = S.cat === "swine" ? FX.nets.swine : FX.nets.cattle;
      extra += '<br><span style="color:#8ba382;font-size:10.5px">middle 80% of ' + fmtInt(nn) +
        " networks: " + fmtInt(e.p10) + "–" + fmtInt(e.p90) + "/yr</span>";
    }
  }
  chip.innerHTML = "<b>" + esc(best.name) + "</b> — " + fmtInt(best.ship) + " shipments/yr" +
    (best.pct != null ? " · " + best.pct + "% of total" : "") +
    (best.pctOut != null ? " · " + best.pctOut + "% of " + (S.dir === "in" ? "inbound" : "out-of-state") : "") +
    "<br><span style='color:#8ba382'>model projection · " + (S.dir === "in" ? "inbound" : "outgoing") + "</span>" +
    extra +
    (STATE_LIST.indexOf(best.name) >= 0 ? "<br><span style='color:#d8b53f'>double-tap to travel</span>" : "");
  /* clamp into the viewport and flip below the node when near the chrome */
  chip.style.left = Math.max(125, Math.min(W - 125, best.node.sx.v)) + "px";
  var above = best.node.sy.v - best.node.r > 260;
  chip.classList.toggle("below", !above);
  chip.style.top = (best.node.sy.v + (above ? -best.node.r : best.node.r)) + "px";
  chip.classList.add("on");
  if (!S.motion) staticRender();
});

/* ---------------- about sheet + framing + motion toggle ---------------- */
var aboutSheet = document.getElementById("aboutSheet");
document.getElementById("aboutBtn").addEventListener("click", function () { aboutSheet.classList.add("open"); aboutSheet.focus(); });
document.getElementById("aboutX").addEventListener("click", function () { aboutSheet.classList.remove("open"); });
addEventListener("keydown", function (e) { if (e.key === "Escape") { aboutSheet.classList.remove("open"); if (S.lens) closeLens(); } });

var motionBtn = document.getElementById("motionBtn");
function syncMotionBtn() { motionBtn.textContent = S.motion ? "ON" : "OFF"; motionBtn.classList.toggle("on", S.motion); }
motionBtn.addEventListener("click", function () {
  S.motion = !S.motion;
  if (!S.motion) S.playYear = false;       /* the frozen scene shows the selected whole quarter */
  store("drove:motion", S.motion ? "on" : "off");
  syncMotionBtn(); syncControls();
  if (S.motion) { layoutScene(true); startLoop(); } else { updateChrome(); staticRender(); }
});

var framing = document.getElementById("framing");
if (!store("drove:framed")) framing.classList.add("on");
document.getElementById("framingGo").addEventListener("click", function () {
  framing.classList.remove("on");
  store("drove:framed", "1");
});

/* ---------------- test hook ---------------- */
window.DROVE = {
  go: function (st, cat, dir) { go(st, cat, dir, { instant: true, snap: true }); },
  resolve: resolve,
  snapshot: function () {
    return {
      state: S.state, cat: S.cat, dir: S.dir, gated: !!(sceneInfo && sceneInfo.gated),
      reason: sceneInfo && sceneInfo.reason, links: links.length,
      caption: document.getElementById("capChip").textContent,
      legend: document.getElementById("legendChip").textContent,
      veil: document.getElementById("veil").classList.contains("on"),
      residual: sceneInfo && sceneInfo.residual, autoK: S.autoK, motes: motes.length
    };
  },
  STATES: STATE_LIST, CAPS: CAPS
};

/* ---------------- boot ---------------- */
syncMotionBtn();
resize();
go(S.state, S.cat, S.dir, { instant: true, snap: true });
})();
