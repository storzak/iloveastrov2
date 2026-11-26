# iloveastro (IOAA sky practice)
Static site (no build step): `index.html`, `style.css`, `app.js`.

## Host on GitHub Pages
1. Create a repository and upload these files to the root.
2. Settings > Pages > Deploy from a branch > `main` / root.
3. Open `https://<username>.github.io/<repo>/`.

If you update a deployed copy and still see an old design, hard-refresh (Ctrl+Shift+R).
The header shows "Ready (v8)" when the latest script is loaded.

## Data
Constellation boundaries (IAU, J2000), stars (to mag 6) and constellation lines come from
[dieghernan/celestial_data](https://github.com/dieghernan/celestial_data) (derived from d3-celestial, BSD-3-Clause),
loaded from jsDelivr at runtime. To be self-contained, download `constellations.bounds.min.geojson`,
`stars.6.min.geojson` and `constellations.lines.min.geojson` from that repo's `data/` folder into a `data/` folder
next to `index.html`; the site tries `data/` first.

## Constellation lines (Skyguessr)
The line patterns are the Sky & Telescope ones used on the IAU charts: Stellarium's `modern_st` sky culture
(`constellationship.fab`, pairs of Hipparcos numbers, fetched from GitHub at a fixed Stellarium commit) joined to the star
positions above. A few pattern stars are fainter than magnitude 6; for those the site also loads `stars.8.min.geojson`.
To work offline, put `constellationship.fab` (and optionally `stars.8.min.geojson`) in `data/`.
If the pattern file cannot be loaded or matched, the standard d3-celestial lines are used and the header says "fallback".

## IAU charts (Skyrace)
Skyrace shows the official IAU / Sky & Telescope constellation charts (CC BY 4.0) from Wikimedia Commons,
using file names of the form `<Constellation name> IAU.svg` (e.g. `Sagittarius IAU.svg`; Serpens uses
`Serpens Caput IAU.svg` and `Serpens Cauda IAU.svg`). If a chart fails to load, the page links to its Commons file page.
The file-name logic is the `chart()` function in `app.js`.

## Notes
- Saves: 3 slots in the browser's localStorage. Select a slot once; the whole site (both games, open tab, overlays, settings, field of view) is then autosaved to it and reopened on every visit. Slots can be exported to and imported from a `.json` file (also a way to move saves between browsers).
- Answers must be the full constellation name (no 3-letter abbreviations).
- Neighbours are computed from shared boundary vertices; Serpens is treated as one constellation.
- Skyrace "at least N moves away" means the shortest route has at least N moves.
