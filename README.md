# IOAA Sky Practice
Static site (no build step): `index.html`, `style.css`, `app.js`.

## Host on GitHub Pages
1. Create a repository and upload these files to the root.
2. Settings > Pages > Deploy from a branch > `main` / root.
3. Open `https://<username>.github.io/<repo>/`.

## Data
Constellation boundaries (IAU, J2000), stars (to mag 6) and constellation lines come from
[dieghernan/celestial_data](https://github.com/dieghernan/celestial_data) (derived from d3-celestial, BSD-3-Clause).
The site loads them from jsDelivr at runtime. To make it self-contained, download
`constellations.bounds.min.geojson`, `stars.6.min.geojson` and `constellations.lines.min.geojson`
from that repo's `data/` folder into a `data/` folder next to `index.html`; the site tries `data/` first.

## Notes
- Saves (3 slots) use the browser's localStorage, so they stay on the device and browser you used.
- Neighbours are computed from shared boundary vertices; Serpens is treated as one constellation.
- Skyrace "at least N moves away" means the shortest route has at least N moves.

If you update an already-deployed copy and still see the old design, hard-refresh (Ctrl+Shift+R). The header shows "Ready (v3)" when the latest script is loaded.
