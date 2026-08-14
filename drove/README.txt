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
             in_from_outstate_pct so in-state arrivals are never mislabeled
  ▶ year     emission cycles the four REAL quarterly shares (12s = 1 modeled yr)

HONESTY GATES (CAPS matrix in drove.js — single source)
  swine: no head anywhere, uniform dots; MT/NM/NY veiled (< 750/yr, as flyers)
  beef/dairy: no inbound facts → flow switch locked with reason + real static
  inbound county map offered via the lens; season control sinks in inbound
  (no inbound quarters); county-level flows never animated (facts are
  state-level — the lens shows the real county choropleths); nothing
  accumulates (inventory is not modeled).

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
