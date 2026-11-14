import worldPath from '../data/worldPath.json'

export const MAP_W: number = worldPath.width
export const MAP_H: number = worldPath.height
export const LAND_PATH: string = worldPath.d

/** Equirectangular projection onto the 1000 x 500 map. */
export function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * MAP_W, y: ((90 - lat) / 180) * MAP_H }
}

export function unproject(x: number, y: number): { lat: number; lng: number } {
  const lng = (x / MAP_W) * 360 - 180
  const lat = 90 - (y / MAP_H) * 180
  return { lat: Math.max(-90, Math.min(90, lat)), lng: Math.max(-180, Math.min(180, lng)) }
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface MapPin {
  label: string
  lat: number
  lng: number
  kind: 'birth' | 'movie' | 'book' | 'thing'
  title?: string
}

const PIN_COLOR: Record<MapPin['kind'], string> = { birth: '#d99a2b', movie: '#7b2d3a', book: '#3f7f73', thing: '#d9a7a0' }

/** A standalone SVG map with pins. Pure string so it works in pages, share view and tests. */
export function mapSvg(pins: MapPin[], opts: { dark?: boolean; id?: string } = {}): string {
  const sea = opts.dark ? '#173532' : '#e8dcc2'
  const land = opts.dark ? '#2a5a54' : '#f3ead9'
  const stroke = opts.dark ? '#d99a2b' : '#0f2321'
  const grid: string[] = []
  for (let lng = -150; lng <= 180; lng += 30) grid.push(`<path d="M${project(0, lng).x} 0V${MAP_H}" />`)
  for (let lat = -60; lat <= 60; lat += 30) grid.push(`<path d="M0 ${project(lat, 0).y}H${MAP_W}" />`)
  const dots = pins
    .map((p, i) => {
      const { x, y } = project(p.lat, p.lng)
      const r = p.kind === 'birth' ? 9 : 6.5
      const title = `${p.title ? p.title + ': ' : ''}${p.label}`.replace(/[<>&"]/g, '')
      const ring = p.kind === 'birth' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 7}" fill="none" stroke="${PIN_COLOR.birth}" stroke-width="1.5" opacity=".6"/>` : ''
      return `<g data-pin="${i}">${ring}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${PIN_COLOR[p.kind]}" stroke="${stroke}" stroke-width="1.6"><title>${title}</title></circle></g>`
    })
    .join('')
  return `<svg class="map" viewBox="0 20 ${MAP_W} 400" role="img" aria-label="World map with ${pins.length} pinned place${pins.length === 1 ? '' : 's'}" xmlns="http://www.w3.org/2000/svg">
<rect width="${MAP_W}" height="${MAP_H}" fill="${sea}"/>
<g stroke="${stroke}" stroke-opacity=".14" stroke-width="1" fill="none">${grid.join('')}</g>
<path d="${LAND_PATH}" fill="${land}" stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round"/>
${dots}
</svg>`
}
