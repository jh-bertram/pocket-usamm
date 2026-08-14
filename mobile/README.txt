Pocket USAMM — mobile-first web app (fun side project, 2026-08-13)
==================================================================

One-file, no-build, mobile-first reference app for the USAMM flyer data:
15 states x {cattle, beef, dairy, swine} x {outgoing, inbound}, county map
sheets, and a full "About the model" honesty screen.

WHAT IT READS (nothing is duplicated — keep this folder next to figure-generation/):
  ../figure-generation/visuals/state-geo.js
  ../figure-generation/visuals/states-data.js      (baked facts, all 4 categories)
  ../figure-generation/visuals/usamm-charts.js     (pure-SVG chart generators)
  ../figure-generation/output/**/maps_svg/*.svg    (county choropleths, lazy-loaded)

RUN
  Windows:  py -3 -m http.server 8102        (from the repo root)
  macOS:    python3 -m http.server 8102
  then open http://localhost:8102/mobile/    (on a phone: http://<your-LAN-IP>:8102/mobile/)
  A .claude/launch.json entry "usamm-mobile" exists for the preview pane.
  Plain file:// also works (no fetch anywhere), same as the flyers.

ROUTES (shareable/bookmarkable)
  #/                         state picker
  #/Texas/cattle/out         state card (category: cattle|beef|dairy|swine; dir: out|in)
  #/Texas/cattle/out/map/instate|national|inbound   county-map bottom sheet
  #/about                    full honesty statement

HONESTY GATING (mirrors the flyers — enforced by the CAPS matrix in index.html)
  - swine: shipments only, NO head estimate anywhere (decision A1)
  - sparse swine states (MT/NM/NY, < 750 modeled shipments/yr): all swine views
    suppressed with the "minimal modeled swine movement" note — including map
    deep links (the router strips /map for gated routes)
  - beef/dairy inbound: county map only, stat tiles honestly say "not generated"
  - inventory: not modeled, never shown
  - captions follow the flyer spec: <first phrase> · model projection · <direction>

VERIFIED (2026-08-13): 120/120 state x category x direction renders, no swine
head leak, correct minimal/inbound notes, all 180 map paths exist, 0 console
errors on a 375px viewport, dark mode (charts/maps stay on light wells),
prefers-reduced-motion honored. 15 findings from a 4-lens adversarial review
applied (router hardening, sheet a11y/focus, iOS scroll lock, download abort,
history hygiene, honesty label fixes).
