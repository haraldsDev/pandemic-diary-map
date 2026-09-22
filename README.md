# Pandemic Diaries — Geolocation Timeline

Interactive map of place mentions in Latvian pandemic diaries (2020–2021). The page at the root of this repository is the map: four views, a timeline you can run and pause, and a click on any point for the place, date, and a short text snippet.

## Open the map

**[Open the interactive map](https://haraldsdev.github.io/pandemic-diary-map/)**

That address serves `index.html` from this repository, so the map is the first thing on the page. GitHub Pages has to be turned on once (branch `main`, folder `/`) before the link responds.

To run the same page on your own machine:

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

A local static server is the reliable way to open the page. Leaflet itself is loaded from the unpkg CDN, so the browser needs a network connection.

## What you can do

The mode list is in the left panel.

| Mode | What it shows |
| --- | --- |
| Mode 1 – ALL diaries | Every diary on one timeline, from the shared start date. |
| Mode 2 – ONE diary | One diary: a short preview of its places, then day-by-day playback. |
| Mode 3 – ALL diaries UPDATED | All diaries, with earlier mentions kept on the map in a cumulative colour scale. Pausing hides the current-day points and leaves that cumulative view. |
| Mode 4 – ONE diary UPDATED | One diary, with the same playback idea as Mode 2. |

The bar along the bottom is the time control: play, pause, step backward and forward, and drag the date. Click a point to read the place name, date, and snippet. The **i** button opens a short description of the dataset.

## What is in this folder

- `index.html` — the map page.
- `js/` — shared map shell and the four modes.
- `css/app.css` — page styles.
- `data/runtime_map_inputs/` — the files the page loads (events, daily counts, per-diary activity days).
- `data/labels_diary_mapping/diary_labels.js` — archive labels (`LFK Ak-166-…`) shown for each diary.
- `leaflet_files/` — the plugins the page actually uses.

Other project material (notes, further code, documentation) can sit in new folders next to these. Leave `index.html` at the repository root so the Pages site keeps opening the map.

## Data included with the map

Each point carries a place name, coordinates, date, diary id, archive label, and a short excerpt from the diary entry. Those excerpts are what the popup shows. They can contain personal names that appear in the diaries. The public copy does not include the private source tables, local file paths, or the internal diary-matching diagnostics used while the data was prepared.

Counts shown in the info panel: about 4900 place mentions, 238 diaries, 771 unique places. The event file loaded by the page contains 3598 mapped points.

## Third-party libraries

- [Leaflet](https://leafletjs.com/) 1.3.4 (BSD 2-Clause), loaded from unpkg.
- [Leaflet.TimeDimension](https://github.com/socib/Leaflet.TimeDimension) 1.1.1 (MIT), vendored in `leaflet_files/leaflet-timedimension/`. Play/pause icons use Glyphicons Halflings from Bootstrap 3 (MIT).
- [iso8601-js-period](https://github.com/nezasa/iso8601-js-period) (Apache 2.0), file `leaflet_files/iso8601-js-period-master/iso8601.js`.
- [Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton).
- [Leaflet.Coordinates](https://github.com/MrMufflon/Leaflet.Coordinates).
- Map tiles: OpenStreetMap contributors.
