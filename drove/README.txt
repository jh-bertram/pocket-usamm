DROVE — the USAMM flyers, un-frozen (motion app, 2026-08-13/14)
===============================================================

Touch-first companion to mobile/ (Pocket USAMM): one living network graphic —
canvas ribbons + particle streams over real state outlines — that morphs
between MAP (geographic) and RANK (list) layouts. No screen ever changes;
every control morphs the same structure.

FILES
  drove/index.html   shell + all CSS + About sheet + first-run framing
  drove/drove.js     the engine (~1000 lines: springs, particles, CAPS gates)
  ../figure-generation/visuals/state-outlines.js   AUTO-GENERATED state rings
      (regenerate: R-4.2.3 Rscript figure-generation/generate_state_outlines.R
       — reads state.shp.simp from the gitignored Non-networkData RData)

RUN: serve the repo root (launch entry usamm-mobile :8102) → /drove/

FLOW DETAIL (2026-08-14, generate_flow_detail.R → visuals/flow-detail.js):
  per state-pair REAL quarterly means (all 4 commodities, both directions)
  + across-network spread (m/sd/p10/p90, cattle 1000 nets / swine 250).
  Powers: per-partner quarterly emission (season dial + year cycle — the old
  "per-partner seasonality not reported" caveat is RETIRED), inbound season
  unlock (aggregated pair quarters), probe-chip Q1–Q4 bars + middle-80% range,
  and stream STEADINESS (emission regularity ∝ across-network consistency,
  cv clamped ≤1 so rates stay mean-preserving). Halo stays at annual mean in
  quarter views (residual quarters not broken out — caption says so).
  Degrades gracefully to state-level uniform behavior if the file is absent.

ENCODINGS (all declared in the legend chip + About sheet)
  dot rate   ∝ shipments/yr via one global K ("1 dot ≈ K shipments/yr";
             the frame governor may raise K but always updates the legend)
  ribbon     width ∝ sqrt(shipments/yr); partners <1% keep ribbon, emit no dots
  dot size   (cattle family, outbound bins) ∝ log typical head/shipment
  dot color  cattle OUTBOUND samples the state's real beef/dairy split;
             swine = gold; inbound cattle = single color (combined-commodity)
  orbit ring 1 dot ≈ 1% in-state share (stay in-state / arrive from in-state)
  halo       residual beyond the 12 ranked partners — inbound residual uses
             in_from_outstate_pct so in-state arrivals are never mislabeled.
             Its particle stream is named THE DRIFT (halo label + About sheet;
             ranch term for animals wandering from the herd): same 1-dot≈K
             rate as every stream, rendered as a soft 20px mote at
             DRIFT_DIM=0.45 (v2 2026-08-14: the original 88px wash at 0.25
             read as meaningless noise — "it IS data", so it now reads as an
             attributable mote, softer than a ranked dot but unmistakably one)
  ▲▼ rail    playback speed 0.25×–3× (right center, log scale, magnetic 1×
             detent, keyboard-operable): scales DATA time only — proportions
             and 1-loop≈1-modeled-year unchanged; legend states the rate
             whenever ≠1× AND motion is on (a frozen static scene claims no
             rate); hidden in static mode; speed survives a motion round-trip
  ripple     dots near the finger/cursor shimmy in RENDER space only (pure
             theater, declared in About; route/timing/size/color untouched)
  ▶ year     emission cycles the four REAL quarterly shares (12s = 1 modeled yr)

HONESTY GATES (CAPS matrix in drove.js — single source)
  swine: no head anywhere, uniform dots; MT/NM/NY veiled (< 750/yr, as flyers)
  beef/dairy: no inbound facts → flow switch locked with reason + real static
  inbound county map offered via the lens; season control sinks in inbound
  (no inbound quarters); county-level flows never animated (facts are
  state-level — the lens shows the real county choropleths); nothing
  accumulates (inventory is not modeled).

MOBILE CHROME (2026-08-14 ticket round, ≤640px):
  shelf rides the VERY top; topbar (stats left / legend right) starts below
  it; the dock wraps so SEASON gets its own row above commodity; the legend
  collapses its encoding-detail tail (.lgx) behind a gold "▾ full key" tap —
  the live dot scale, governor note, "annual means, not live tracking" AND
  the floored-partners line (when active) NEVER collapse, and desktop always
  shows the full key. drove.js measures the chrome live (measureChrome):
  wsTop clears shelf+stat block, rankSafeTop clears the legend/about column
  so RANK row 1 is never hidden, and the RANK column sits at 0.56 width
  (vs 0.78; breakpoint shared with CSS via matchMedia) so row labels fit.
  Adversarial panel (4 lenses, 18 agents) on this round: 13 confirmed, all
  fixed — highlights: layoutScene re-measures AFTER the chrome pass and
  re-runs geometry once (scene changes no longer lay out against the
  PREVIOUS scene's chrome — worst case was gated→live on a phone); season/
  playYear/governor chrome rewrites glide the workspace via
  relayoutIfChromeMoved(); ws() slides up (never under the dock) when its
  200px floor engages on tiny screens; toast bottom is measured, not
  hardcoded; rank-span floor scales with row count (expanded key on short
  phones); interrupted re-rank staggers flush their gray queued flags;
  "▾ full key" is keyboard-operable (tabindex/Enter/Space/aria-expanded)
  with a 44px-class hit box and no longer yanks the shelf scroll;
  snapshot() gained legendVisible/legendExpanded so sweeps see what the
  USER sees (textContent includes display:none text — a sweep blind spot).

ROUND 3 (2026-08-14 evening, user tickets): season+commodity now share a
  right-aligned column in the dock on phones (#dockRight — display:contents
  on desktop so its flex line is untouched; on phones season sits directly
  above commodity, flush right, in plane with the layout dial); drift
  sprite/dim retuned (above); drift caption clamps into the viewport in RANK
  (was off-screen left of the hub); playback-speed rail + pointer ripple
  (above); TRANSITION PASS — no crossfades in movement, pan/zoom only: the
  MAP underlay now ZOOMS into the focal badge during the RANK morph (per-
  vertex blend of map projection and badge frame, shared with the flow-hover
  pulse via morphProj so they never disagree mid-scrub; was an alpha fade +
  separate fading badge). Non-focal rings ALSO dim with the dial —
  0.14×(1−t), gone at RANK rest — because the badge scale ≈ the map scale
  for large focal states, so geometry alone provably cannot evict them
  (round-3 panel measured the full CONUS surviving the cull at Texas badge
  scale); the dim rides the morph t, not a timed fade, so the transition
  still reads as pan/zoom. State/direction travel hard-flushes
  motes+fadingMotes (frozen dots no longer hang in screen space mid-pan;
  category swaps keep the ~0.9s freeze-and-fade grace, which runs on REAL
  time at every playback speed), dead .fadeable class removed. Steadiness
  sputter + year cycle ride DATA time so they follow playback speed.

ROUND 3 PANEL (4 lenses, 14 agents): 10 confirmed, 0 refuted — all fixed:
  static-mode legend no longer claims "N× playback" (gated on motion; the
  rate survives a motion round-trip and the disclosure reappears with it);
  freeze-fade on real time (was 3.6s at 0.25×); ripple wobble phase baked
  per-mote at emission (array-index churn made it flicker, not shimmy);
  non-focal rings dial-dim (above); flow-hover pulse uses the shared
  blended projector (was detached duplicate rings mid-scrub); desktop RANK
  column caps at box.w−175 so row labels clear the speed rail at 641–850px;
  degenerate DC outline dropped (R guard + regenerated state-outlines.js +
  a defensive NaN-bbox skip in OUTLINE_BOX).

VERIFIED (2026-08-14): 120-combo sweep 0 errors ×4 rounds; inbound halo
residual hand-checked (NE swine = 587/yr); 61 fps @ ~300 motes; reduced-motion
static scene; rAF pauses when hidden. Adversarially reviewed (4-lens panel,
28 agents): 22 confirmed findings ALL fixed — highlights: county lens now
obeys the sparse-swine gate (was a veil bypass) and follows scene changes;
links reconcile by name so motes survive category morphs (303/316) and flush
on state changes (0 ghosts); governor K-floor sticks and is always disclosed;
static mode uses an unstepped, disclosed density incl. the quarter share;
inbound dots are uniform (no outbound-bin provenance); ebb timers cancel
cleanly; knob survives pointercancel; long-press has slop cancellation;
workspace bounds are measured, not hardcoded; 44px-class tap targets.
