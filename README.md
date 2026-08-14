# Pocket USAMM & DROVE

Two companion apps for modeled livestock movement from the
**U.S. Animal Movement Model (USAMM)**, developed at Colorado State University.

- **[`mobile/`](mobile/) — Pocket USAMM**: a mobile-first reference card app
  (best on a phone)
- **[`drove/`](drove/) — DROVE**: the same projections as a living, touchable
  animated network — particle flows over real state geography, morphing
  layouts, per-partner seasonality, and the model's own uncertainty animated
  as stream steadiness (best on a larger screen)

## What it shows

Predicted county-to-county livestock shipments for 15 states — cattle, beef,
dairy, and swine — as networks, county heat maps, seasonality, and key stats.

**Every number is a model projection**, not a USDA/NASS survey count:

- Cattle / beef / dairy values are the mean of 1,000 modeled networks (Cattle USAMM v3)
- Swine values are the mean of 250 modeled networks (Swine USAMM), reported as
  shipments only — no head estimate
- "Head" values (cattle family only) are estimates from shipment-size-bin midpoints
- Inventory (how many animals reside in a state) is not modeled and never shown

The app's **About the model** screen carries the full honesty statement.

## Structure

```
mobile/                      the app (single HTML file, no build step)
figure-generation/
├── visuals/                 baked facts (states-data.js) + pure-SVG chart generators
└── output/**/maps_svg/      county choropleth SVGs (lazy-loaded by the app)
```

Static site — no server-side code, no analytics, no external requests.
