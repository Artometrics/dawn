// Pre-renders the public-domain Natural Earth 110m land outline to one SVG path.
// Source: `world-atlas` (ISC) which redistributes Natural Earth (public domain).
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoEquirectangular, geoPath } from 'd3-geo'

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-110m.json', import.meta.url)))
const land = feature(topo, topo.objects.land)
const W = 1000
const H = 500
const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2])
const d = geoPath(projection).digits ? geoPath(projection).digits(1)(land) : geoPath(projection)(land)
writeFileSync(
  new URL('../src/data/worldPath.json', import.meta.url),
  JSON.stringify({ width: W, height: H, source: 'Natural Earth 110m land via world-atlas', d }) + '\n',
)
console.log('world path bytes', d.length)
