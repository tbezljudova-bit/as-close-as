# As Close As

Tallinn is as close to Yerevan (≈ 2,547 km) as it is to Adana, Barcelona, Antalya, and Malatya.

As Close As is a small map for that kind of question. Pick a city, set a distance (or a second city), and it draws the true circle of places that far away. Cities on the ring light up. The rest stay dim. Choose one and it rises off the map, with the route from the origin drawn brighter than the others.

The flat map is the main view. A globe sits beside it, for when you want the same ring to look like a circle.

![Dark map of the Tallinn to Yerevan ring](docs/screenshots/dark-map.png)

![Barcelona rises off the ring](docs/screenshots/city-rise.png)

![The same ring on the globe](docs/screenshots/globe.png)

## Why a flat map fools you

Web Mercator is the usual web map. It keeps north up and angles locally true, and it stretches distances as you leave the equator. A real circle of equal distance, drawn on that map, becomes a tall oval. Greenland looks huge. A flight that feels "across Europe" on the screen may be the same length as one that looks much longer.

The ring in this app is not an oval drawn on the map. It is a set of points that are each the same great-circle distance from the origin. Mercator then stretches that ring. Switch to the globe and the same points sit on a circle.

## How the distance is worked out

The earth is treated as a sphere with radius 6,371 km. The distance between two cities is the great-circle distance (the haversine formula): the shortest path along the surface, not a straight line through the planet and not a ruler line on the map.

The ring is that path spun all the way around the origin. A city matches when its own great-circle distance is within the tolerance of the target distance. The default tolerance is ±3%, and you can widen or narrow it. The sentence, the list, and the lit markers all come from that same calculation. Nothing is hard-coded. Tallinn to Yerevan comes out to about 2,547 km, and 106 cities in this set fall inside ±3% of that.

Distances can be shown in kilometres or miles. Sorting is by population, or by how close a city sits to the exact radius.

## Run it locally

You need Node.js. No API key, and no server of your own. The city list and the coastlines are bundled with the app.

```bash
npm install
npm run dev
npm test
```

Open [http://localhost:43123](http://localhost:43123). The first view is Tallinn to Yerevan.

`npm run build` writes a static site to `dist/`. You can host those files anywhere that serves a folder.

`npm run prepare-data` rebuilds the city file from a GeoNames dump, if you want a different cutoff. The script expects `cities15000.txt` and `countryInfo.txt` from [GeoNames](https://www.geonames.org/).

## Data

City names, coordinates, and population are a trimmed subset of [GeoNames cities15000](https://www.geonames.org/), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The build keeps cities of 50,000 people or more, every national capital, and first-order administrative capitals of at least 20,000. Districts and localities (GeoNames feature codes PPLX and PPLL) are left out so a city is not listed twice. About 12,120 cities remain.

Coastlines and country shapes are Natural Earth, via [world-atlas](https://github.com/topojson/world-atlas) (public domain), drawn with [MapLibre GL JS](https://maplibre.org/).

## Roadmap

- A guessing game: how far is this city, really?
- Rings measured in flight time, not only kilometres.
- Personal places: home, a friend's city, a trip you are planning.

## License

MIT. Copyright (c) 2026 Tamara Bezljudova. See [LICENSE](LICENSE).
