#!/usr/bin/env node
// Bakes the Atlas campus basemap from OpenStreetMap data into one small static JSON file.
//
//   node scripts/atlas-bake-basemap.mjs --cache /tmp/osm [--fetch]
//
// --fetch downloads the layers from the public Overpass API once (a build-time call, never at
// runtime) into --cache. Without it the script reads the cached files.
// The output has no runtime dependency: the app draws it itself, with no tile server and no key.
//
// Map data (c) OpenStreetMap contributors, ODbL 1.0. The baked file is a Produced Work of that
// database, so it carries the attribution and the licence name in its own `meta`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CARDINAL_FRAME, METRES_PER_DEG_LAT, UNITS_PER_METRE, metresPerDegLng } from '../src/features/atlas/lib/basemap-spec.ts';

const BASEMAP_BBOX = CARDINAL_FRAME.bbox;
const BASEMAP_ORIGIN = CARDINAL_FRAME.origin;
const METRES_PER_DEG_LNG = metresPerDegLng(BASEMAP_ORIGIN.lat);

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const cache = path.resolve(flag('--cache') ?? '/tmp/osm');
const outFile = path.resolve('public/maps/atlas/cardinal-basemap.json');
mkdirSync(cache, { recursive: true });
mkdirSync(path.dirname(outFile), { recursive: true });

const { south, west, north, east } = BASEMAP_BBOX;
const B = `(${south},${west},${north},${east})`;
const QUERIES = {
  roads: `way["highway"]${B};`,
  buildings: `way["building"]${B};`,
  water: `way["natural"="water"]${B};relation["natural"="water"]${B};way["waterway"~"river|stream|canal|drain"]${B};way["railway"="rail"]${B};`,
  green: `way["leisure"~"park|garden|pitch|golf_course|track|stadium"]${B};way["landuse"~"grass|forest|meadow|recreation_ground"]${B};way["natural"~"wood|scrub|grassland"]${B};`,
};

async function fetchLayer(name) {
  const body = new URLSearchParams({ data: `[out:json][timeout:90];(${QUERIES[name]});out geom tags;` });
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'User-Agent': 'dawn-atlas-bake/1.0 (https://github.com/Artometrics/dawn)', 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (response.ok) {
      writeFileSync(path.join(cache, `${name}.json`), await response.text());
      return;
    }
    console.warn(`overpass ${name}: ${response.status}, retry ${attempt}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 8000));
  }
  throw new Error(`overpass ${name} failed`);
}

if (args.includes('--fetch')) for (const name of Object.keys(QUERIES)) await fetchLayer(name);

const load = (name) => {
  const file = path.join(cache, `${name}.json`);
  if (!existsSync(file)) throw new Error(`missing ${file}; run with --fetch`);
  return JSON.parse(readFileSync(file, 'utf8'));
};
const layers = Object.fromEntries(Object.keys(QUERIES).map((name) => [name, load(name)]));

const M_LAT = METRES_PER_DEG_LAT;
const M_LNG = METRES_PER_DEG_LNG;
const toXY = (p) => [(p.lon - BASEMAP_ORIGIN.lon) * M_LNG, (BASEMAP_ORIGIN.lat - p.lat) * M_LAT];
const box = (() => {
  const a = toXY({ lat: south, lon: west });
  const b = toXY({ lat: north, lon: east });
  return { x0: a[0], x1: b[0], y0: b[1], y1: a[1] };
})();

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let far = -1;
    let farD = tolerance;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = points[i];
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const inside = (x, y, pad = 0) => x >= box.x0 - pad && x <= box.x1 + pad && y >= box.y0 - pad && y <= box.y1 + pad;

/** Splits a line into the runs that stay inside the box so a long road does not carry its far end. */
function clipLine(points) {
  const runs = [];
  let run = [];
  for (let i = 0; i < points.length; i += 1) {
    const here = points[i];
    const ok = inside(here[0], here[1], 40);
    if (ok) {
      if (!run.length && i > 0) run.push(points[i - 1]);
      run.push(here);
    } else if (run.length) {
      run.push(here);
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length >= 2);
}

/** Flat, delta-coded integers: x0, y0, then dx, dy pairs. Half-metre units. */
function encode(points) {
  const flat = [];
  let px = 0;
  let py = 0;
  points.forEach(([x, y], i) => {
    const ix = Math.round(x * UNITS_PER_METRE);
    const iy = Math.round(y * UNITS_PER_METRE);
    flat.push(i === 0 ? ix : ix - px, i === 0 ? iy : iy - py);
    px = ix;
    py = iy;
  });
  return flat;
}

const area = (pts) => {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
};

const geomOf = (el) => (el.geometry ?? []).map(toXY);
const isClosed = (el) => {
  const g = el.geometry ?? [];
  return g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
};
const anyInside = (pts) => pts.some(([x, y]) => inside(x, y));

const ROAD_CLASS = {
  motorway: 'major', motorway_link: 'major', trunk: 'major', trunk_link: 'major',
  primary: 'major', primary_link: 'major', secondary: 'major', secondary_link: 'major',
  tertiary: 'major', tertiary_link: 'major',
  residential: 'minor', unclassified: 'minor', living_street: 'minor', service: 'minor', road: 'minor',
  footway: 'path', path: 'path', pedestrian: 'path', cycleway: 'path', steps: 'path', track: 'path', bridleway: 'path', corridor: 'path',
};

const out = {
  meta: {
    title: 'Stanford campus basemap, baked from OpenStreetMap for Dawn Atlas',
    attribution: '\u00a9 OpenStreetMap contributors',
    licence: 'Open Database Licence (ODbL) 1.0',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    copyrightUrl: 'https://www.openstreetmap.org/copyright',
    osmBaseTimestamp: layers.roads.osm3s?.timestamp_osm_base ?? null,
    source: 'Overpass API, one build-time query per layer (scripts/atlas-bake-basemap.mjs)',
    bbox: BASEMAP_BBOX,
    origin: BASEMAP_ORIGIN,
    unitsPerMetre: UNITS_PER_METRE,
    encoding: 'Each polyline or polygon is [x0, y0, dx, dy, dx, dy, ...] in half-metre units east and south of the origin.',
    simplified: 'Douglas-Peucker at 0.8 m (buildings 0.5 m). Footprints under 40 m2 are dropped.',
  },
  green: [],
  water: [],
  waterways: [],
  rail: [],
  buildings: [],
  roads: { major: [], minor: [], path: [] },
  labels: [],
};

for (const el of layers.green.elements) {
  const pts = geomOf(el);
  if (pts.length < 4 || !anyInside(pts) || area(pts) < 150) continue;
  out.green.push(encode(simplify(pts, 1.5)));
}

for (const el of layers.water.elements) {
  if (el.tags?.railway === 'rail') {
    for (const run of clipLine(geomOf(el))) out.rail.push(encode(simplify(run, 1)));
  } else if (el.tags?.waterway) {
    for (const run of clipLine(geomOf(el))) out.waterways.push(encode(simplify(run, 1)));
  } else if (el.type === 'relation') {
    for (const member of el.members ?? []) {
      if (member.role !== 'outer' || !member.geometry) continue;
      const pts = member.geometry.map(toXY);
      if (anyInside(pts) && pts.length > 3) out.water.push(encode(simplify(pts, 1)));
    }
  } else {
    const pts = geomOf(el);
    if (pts.length > 3 && anyInside(pts)) out.water.push(encode(simplify(pts, 1)));
  }
}

for (const el of layers.buildings.elements) {
  if (!isClosed(el)) continue;
  const pts = geomOf(el);
  if (!anyInside(pts) || area(pts) < 40) continue;
  out.buildings.push(encode(simplify(pts, 0.5)));
}

const named = new Map();
for (const el of layers.roads.elements) {
  const tags = el.tags ?? {};
  const cls = ROAD_CLASS[tags.highway];
  if (!cls) continue;
  if (tags.service === 'parking_aisle' || tags.service === 'driveway' || tags.service === 'drive-through') continue;
  if (tags.area === 'yes') continue;
  const runs = clipLine(geomOf(el));
  for (const run of runs) {
    const line = simplify(run, 0.8);
    out.roads[cls].push(encode(line));
    if (tags.name && cls !== 'path' && line.length >= 2) {
      let length = 0;
      for (let i = 1; i < line.length; i += 1) length += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      const best = named.get(tags.name);
      if (length > 60 && (!best || length > best.length)) named.set(tags.name, { length, line, cls });
    }
  }
}

for (const [text, { line, length, cls }] of named) {
  let walked = 0;
  for (let i = 1; i < line.length; i += 1) {
    const seg = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    if (walked + seg >= length / 2) {
      const t = (length / 2 - walked) / seg;
      const x = line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t;
      const y = line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t;
      let angle = Math.atan2(line[i][1] - line[i - 1][1], line[i][0] - line[i - 1][0]);
      if (angle > Math.PI / 2) angle -= Math.PI;
      if (angle < -Math.PI / 2) angle += Math.PI;
      if (inside(x, y)) {
        out.labels.push({ text, x: Math.round(x * UNITS_PER_METRE), y: Math.round(y * UNITS_PER_METRE), angle: Math.round(angle * 100) / 100, major: cls === 'major', length: Math.round(length) });
      }
      break;
    }
    walked += seg;
  }
}
out.labels.sort((a, b) => b.length - a.length);

writeFileSync(outFile, JSON.stringify(out));
const kb = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
console.log(`wrote ${path.relative('.', outFile)} (${kb} KB): ${out.buildings.length} buildings, ${out.roads.major.length}/${out.roads.minor.length}/${out.roads.path.length} roads, ${out.water.length} water, ${out.green.length} green, ${out.labels.length} labels`);
