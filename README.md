# MARKET DESK

A lightweight personal global financial command centre designed first for legacy iPad Safari.

## Stage 1
- Static HTML/CSS/JavaScript foundation
- NIFTY 50 default chart
- India / USA / Korea exchange panels
- Watchlist, gold/FX, commodities and market tape
- Search and pin an asset
- Day/night theme
- Local storage persistence
- Browser location permission detection
- Explicit DEMO DATA mode; no fabricated claim of live prices
- No framework, no external fonts, no WebGL, no heavy chart library

## Data architecture
The interface is intentionally separated from live data. Stage 2 can add a server-side market-data adapter and Vercel environment variables without exposing provider secrets to the iPad client.

## Legacy Safari target
Primary layout is landscape around 1024×768. The implementation avoids ES modules, canvas/WebGL dependencies and large client frameworks.

## Disclaimer
Demo figures are illustrative UI data only and are not real-time market quotes or investment advice.
