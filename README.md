# Pocket USAMM

A mobile-first pocket reference for modeled livestock movement from the
**U.S. Animal Movement Model (USAMM)**, developed at Colorado State University.

**Open the app: [`mobile/`](mobile/)** (best on a phone)

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
