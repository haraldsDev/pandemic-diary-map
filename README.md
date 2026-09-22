# Pandemic Diaries — Geolocation Timeline

Interactive map of place mentions in Latvian pandemic diaries (2020–2021). The repository root forwards to the map: four views, a timeline you can run and pause, and a click on any point for the place, date, and a short text snippet.

## Open the map

**[Open the interactive map](https://haraldsdev.github.io/pandemic-diary-map/)**

The root `index.html` forwards to `map/`. GitHub Pages stays on branch `main`, folder `/`.

To run the same page on your own machine:

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

A local static server is the reliable way to open the page. Leaflet itself is loaded from the unpkg CDN, so the browser needs a network connection.

## What you can do

The page opens in Mode 3. The mode list is in the left panel. Modes 1 and 2 stay available; choosing one of them keeps that view until you pick another or reload the page.

| Mode | What it shows |
| --- | --- |
| Mode 1 – ALL diaries | Every diary on one timeline, from the shared start date. |
| Mode 2 – ONE diary | One diary: a short preview of its places, then day-by-day playback. |
| Mode 3 – ALL diaries UPDATED | All diaries, with earlier mentions kept on the map in a cumulative colour scale. Pausing hides the current-day points and leaves that cumulative view. |
| Mode 4 – ONE diary UPDATED | One diary, with the same playback idea as Mode 2. |

The bar along the bottom is the time control: play, pause, step backward and forward, and drag the date. Click a point to read the place name, date, and snippet. The **i** button opens a short description of the dataset.

## What is in this folder

- `index.html` — forwards the repository root to the map.
- `map/` — the visualization: `index.html`, `js/`, `css/`, `data/`, `leaflet_files/`.
- `annotation-process/` — the present/referenced annotation, numbered in reading order. Start at `annotation-process/README.md`. The map does not load this folder.

## Corpus and contributors

The PanDi corpus is based on the collection [“Pandemic Diaries 2020–2021”](https://garamantas.lv/en/collection/1415829) of the [Archives of Latvian Folklore](https://lulfmi.lv/latviesu-folkloras-kratuve) at the [Institute of Literature, Folklore and Art](https://lulfmi.lv/), [University of Latvia](https://www.lu.lv/).

Initiation, building, and coordination of the collection: Sanita Reinsone and Ilze Ļaksa-Timinska.

Data preparation and corpus creation: Sanita Reinsone, Ilze Ļaksa-Timinska, and Justīne Jaudzema.

Also involved in processing, research, and annotation: Haralds Matulis, Elvīra Žvarte, Ilze Ļaksa-Timinska, and Viesturs Vēveris.

Contributors of the materials: 238 authors of pandemic diaries, who submitted 2,333 entries to the collection.

The initiative was started in March 2020 by the [Autobiography Collection](https://autobiografijas.lv/) of the Archives of Latvian Folklore together with the online journal [Punctum](https://www.punctummagazine.lv/).

Support named on the garamantas.lv collection page: the [Latvian Council of Science](https://www.lzp.gov.lv/) project “Sevis dokumentēšana: inovatīvi modeļi autobiogrāfiskā naratīva interpretācijā un izpratnē” (lzp-2018/1-0073), and budget sub-programme 05.04.00 “Krišjāņa Barona Dainu skapis” of the [Ministry of Education and Science of the Republic of Latvia](https://www.izm.gov.lv/).

Corpus deposit in [CLARIN-LV](https://www.clarin.lv/en-us/): S. Reinsone, I. Ļaksa-Timinska, J. Jaudzema, *Pandemic Diaries (PanDi)*, 2022, http://hdl.handle.net/20.500.12574/48.

Institutions and partners:

- [Institute of Literature, Folklore and Art, University of Latvia](https://lulfmi.lv/)
- [Digital Humanities Centre, University of Latvia](https://www.hzf.lu.lv/lv/par-mums/centri/digitalo-humanitaro-zinatnu-centrs/)
- [Institute of Mathematics and Computer Science, University of Latvia](https://www.lumii.lv/) / [CLARIN-LV](https://www.clarin.lv/en-us/)
- online journal [Punctum](https://www.punctummagazine.lv/)
- [Latvian Council of Science](https://www.lzp.gov.lv/)

## Data included with the map

Each point carries a place name, coordinates, date, diary id, archive label, and a short excerpt from the diary entry. Those excerpts are what the popup shows. They can contain personal names that appear in the diaries. The public copy does not include the private source tables, local file paths, or the internal diary-matching diagnostics used while the data was prepared.

Counts shown in the info panel: about 4900 place mentions, 238 diaries, 771 unique places. The event file loaded by the page contains 3598 mapped points.

## Third-party libraries

- [Leaflet](https://leafletjs.com/) 1.3.4 (BSD 2-Clause), loaded from unpkg.
- [Leaflet.TimeDimension](https://github.com/socib/Leaflet.TimeDimension) 1.1.1 (MIT), vendored in `map/leaflet_files/leaflet-timedimension/`. Play/pause icons use Glyphicons Halflings from Bootstrap 3 (MIT).
- [iso8601-js-period](https://github.com/nezasa/iso8601-js-period) (Apache 2.0), file `map/leaflet_files/iso8601-js-period-master/iso8601.js`.
- [Leaflet.EasyButton](https://github.com/CliffCloud/Leaflet.EasyButton).
- [Leaflet.Coordinates](https://github.com/MrMufflon/Leaflet.Coordinates).
- Map tiles: OpenStreetMap contributors.

## Korpuss un līdzstrādnieki

PanDi korpusa pamatā ir [LU](https://www.lu.lv/) [Literatūras, folkloras un mākslas institūta](https://lulfmi.lv/) [Latviešu folkloras krātuves](https://lulfmi.lv/latviesu-folkloras-kratuve) kolekcija [“Pandēmijas dienasgrāmatas 2020–2021”](https://garamantas.lv/lv/collection/1415829).

Kolekcijas iniciēšana, veidošana un koordinēšana: Sanita Reinsone un Ilze Ļaksa-Timinska.

Datu sagatavošana un korpusa izveide: Sanita Reinsone, Ilze Ļaksa-Timinska un Justīne Jaudzema.

Kolekcijas apstrādē, pētniecībā un anotēšanā iesaistījušies arī: Haralds Matulis, Elvīra Žvarte, Ilze Ļaksa-Timinska, Viesturs Vēveris.

Materiālu iesniedzēji: 238 pandēmijas dienasgrāmatu autori, kuri kolekcijai nodevuši 2333 ierakstus.

Iniciatīvu 2020. gada martā aizsāka Latviešu folkloras krātuves [Autobiogrāfiju krājums](https://autobiografijas.lv/) sadarbībā ar interneta žurnālu [Punctum](https://www.punctummagazine.lv/).

Kolekcijas lapā garamantas.lv norādītais atbalsts: [Latvijas Zinātnes padomes](https://www.lzp.gov.lv/) projekts “Sevis dokumentēšana: inovatīvi modeļi autobiogrāfiskā naratīva interpretācijā un izpratnē” (lzp-2018/1-0073) un [Latvijas Republikas Izglītības un zinātnes ministrijas](https://www.izm.gov.lv/) budžeta apakšprogramma 05.04.00 “Krišjāņa Barona Dainu skapis”.

Korpusa depozīts [CLARIN-LV](https://clarin.lv/lv/): S. Reinsone, I. Ļaksa-Timinska, J. Jaudzema, *Pandēmijas dienasgrāmatas (PanDi)*, 2022, http://hdl.handle.net/20.500.12574/48.

Institūcijas un sadarbības partneri:

- [LU Literatūras, folkloras un mākslas institūts](https://lulfmi.lv/)
- [LU Digitālo humanitāro zinātņu centrs](https://www.hzf.lu.lv/lv/par-mums/centri/digitalo-humanitaro-zinatnu-centrs/)
- [LU Matemātikas un informātikas institūts](https://www.lumii.lv/) / [CLARIN-LV](https://clarin.lv/lv/)
- interneta žurnāls [“Punctum”](https://www.punctummagazine.lv/)
- [Latvijas Zinātnes padome](https://www.lzp.gov.lv/)
