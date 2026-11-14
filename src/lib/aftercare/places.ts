import type { Place } from './types'

/** Hand-written list of well-known cities (approximate coordinates). No geocoding service is ever called. */
const RAW: Array<[string, string, number, number]> = [
  ['Lisbon', 'Portugal', 38.72, -9.14], ['Porto', 'Portugal', 41.15, -8.61], ['Madrid', 'Spain', 40.42, -3.7], ['Barcelona', 'Spain', 41.39, 2.17], ['Seville', 'Spain', 37.39, -5.99],
  ['Paris', 'France', 48.86, 2.35], ['Lyon', 'France', 45.76, 4.84], ['Marseille', 'France', 43.3, 5.37], ['Lisieux', 'France', 49.15, 0.23], ['London', 'United Kingdom', 51.51, -0.13], ['Manchester', 'United Kingdom', 53.48, -2.24],
  ['Edinburgh', 'United Kingdom', 55.95, -3.19], ['Cardiff', 'United Kingdom', 51.48, -3.18], ['Glastonbury', 'United Kingdom', 51.15, -2.71], ['Dublin', 'Ireland', 53.35, -6.26], ['Galway', 'Ireland', 53.27, -9.05],
  ['Amsterdam', 'Netherlands', 52.37, 4.9], ['Brussels', 'Belgium', 50.85, 4.35], ['Berlin', 'Germany', 52.52, 13.4], ['Munich', 'Germany', 48.14, 11.58], ['Hamburg', 'Germany', 53.55, 9.99], ['Cologne', 'Germany', 50.94, 6.96],
  ['Vienna', 'Austria', 48.21, 16.37], ['Prague', 'Czechia', 50.08, 14.44], ['Budapest', 'Hungary', 47.5, 19.04], ['Warsaw', 'Poland', 52.23, 21.01], ['Krakow', 'Poland', 50.06, 19.94],
  ['Zurich', 'Switzerland', 47.38, 8.54], ['Geneva', 'Switzerland', 46.2, 6.14], ['Rome', 'Italy', 41.9, 12.5], ['Milan', 'Italy', 45.46, 9.19], ['Florence', 'Italy', 43.77, 11.26], ['Venice', 'Italy', 45.44, 12.32], ['Naples', 'Italy', 40.85, 14.27],
  ['Athens', 'Greece', 37.98, 23.73], ['Istanbul', 'Turkey', 41.01, 28.98], ['Ankara', 'Turkey', 39.93, 32.86], ['Copenhagen', 'Denmark', 55.68, 12.57], ['Stockholm', 'Sweden', 59.33, 18.07], ['Oslo', 'Norway', 59.91, 10.75],
  ['Helsinki', 'Finland', 60.17, 24.94], ['Reykjavik', 'Iceland', 64.15, -21.94], ['Tallinn', 'Estonia', 59.44, 24.75], ['Riga', 'Latvia', 56.95, 24.11], ['Vilnius', 'Lithuania', 54.69, 25.28],
  ['Kyiv', 'Ukraine', 50.45, 30.52], ['Moscow', 'Russia', 55.75, 37.62], ['Saint Petersburg', 'Russia', 59.93, 30.34], ['Bucharest', 'Romania', 44.43, 26.1], ['Sofia', 'Bulgaria', 42.7, 23.32], ['Belgrade', 'Serbia', 44.79, 20.45], ['Zagreb', 'Croatia', 45.81, 15.98],
  ['Cairo', 'Egypt', 30.04, 31.24], ['Alexandria', 'Egypt', 31.2, 29.92], ['Luxor', 'Egypt', 25.69, 32.64], ['Marrakesh', 'Morocco', 31.63, -8.0], ['Casablanca', 'Morocco', 33.57, -7.59], ['Tunis', 'Tunisia', 36.81, 10.18],
  ['Lagos', 'Nigeria', 6.52, 3.38], ['Abuja', 'Nigeria', 9.08, 7.4], ['Accra', 'Ghana', 5.6, -0.19], ['Dakar', 'Senegal', 14.72, -17.47], ['Nairobi', 'Kenya', -1.29, 36.82], ['Addis Ababa', 'Ethiopia', 9.03, 38.74],
  ['Kampala', 'Uganda', 0.35, 32.58], ['Dar es Salaam', 'Tanzania', -6.79, 39.21], ['Johannesburg', 'South Africa', -26.2, 28.05], ['Cape Town', 'South Africa', -33.92, 18.42], ['Durban', 'South Africa', -29.86, 31.02], ['Kinshasa', 'DR Congo', -4.44, 15.27],
  ['Tel Aviv', 'Israel', 32.09, 34.78], ['Jerusalem', 'Israel', 31.77, 35.21], ['Bethlehem', 'Palestine', 31.7, 35.2], ['Beirut', 'Lebanon', 33.89, 35.5], ['Amman', 'Jordan', 31.95, 35.93], ['Baghdad', 'Iraq', 33.31, 44.37],
  ['Tehran', 'Iran', 35.69, 51.39], ['Isfahan', 'Iran', 32.65, 51.67], ['Riyadh', 'Saudi Arabia', 24.71, 46.68], ['Mecca', 'Saudi Arabia', 21.39, 39.86], ['Dubai', 'United Arab Emirates', 25.2, 55.27],
  ['Delhi', 'India', 28.61, 77.21], ['Mumbai', 'India', 19.08, 72.88], ['Kolkata', 'India', 22.57, 88.36], ['Chennai', 'India', 13.08, 80.27], ['Bengaluru', 'India', 12.97, 77.59], ['Varanasi', 'India', 25.32, 82.97], ['Karachi', 'Pakistan', 24.86, 67.0],
  ['Lahore', 'Pakistan', 31.55, 74.34], ['Dhaka', 'Bangladesh', 23.81, 90.41], ['Kathmandu', 'Nepal', 27.72, 85.32], ['Colombo', 'Sri Lanka', 6.93, 79.86],
  ['Bangkok', 'Thailand', 13.76, 100.5], ['Hanoi', 'Vietnam', 21.03, 105.85], ['Ho Chi Minh City', 'Vietnam', 10.82, 106.63], ['Singapore', 'Singapore', 1.35, 103.82], ['Kuala Lumpur', 'Malaysia', 3.14, 101.69],
  ['Jakarta', 'Indonesia', -6.21, 106.85], ['Bali (Denpasar)', 'Indonesia', -8.65, 115.22], ['Manila', 'Philippines', 14.6, 120.98], ['Hong Kong', 'China', 22.32, 114.17], ['Shanghai', 'China', 31.23, 121.47], ['Beijing', 'China', 39.9, 116.41],
  ['Chengdu', 'China', 30.57, 104.07], ['Taipei', 'Taiwan', 25.03, 121.57], ['Seoul', 'South Korea', 37.57, 126.98], ['Busan', 'South Korea', 35.18, 129.08], ['Tokyo', 'Japan', 35.68, 139.69], ['Kyoto', 'Japan', 35.01, 135.77], ['Osaka', 'Japan', 34.69, 135.5],
  ['Ulaanbaatar', 'Mongolia', 47.89, 106.91], ['Almaty', 'Kazakhstan', 43.24, 76.89], ['Tashkent', 'Uzbekistan', 41.3, 69.24], ['Samarkand', 'Uzbekistan', 39.65, 66.96],
  ['Sydney', 'Australia', -33.87, 151.21], ['Melbourne', 'Australia', -37.81, 144.96], ['Brisbane', 'Australia', -27.47, 153.03], ['Perth', 'Australia', -31.95, 115.86], ['Auckland', 'New Zealand', -36.85, 174.76], ['Wellington', 'New Zealand', -41.29, 174.78],
  ['Suva', 'Fiji', -18.14, 178.44], ['Honolulu', 'United States', 21.31, -157.86],
  ['New York', 'United States', 40.71, -74.01], ['Boston', 'United States', 42.36, -71.06], ['Philadelphia', 'United States', 39.95, -75.17], ['Washington, D.C.', 'United States', 38.91, -77.04], ['Atlanta', 'United States', 33.75, -84.39],
  ['Miami', 'United States', 25.76, -80.19], ['New Orleans', 'United States', 29.95, -90.07], ['Nashville', 'United States', 36.16, -86.78], ['Chicago', 'United States', 41.88, -87.63], ['Detroit', 'United States', 42.33, -83.05],
  ['Minneapolis', 'United States', 44.98, -93.27], ['Houston', 'United States', 29.76, -95.37], ['Dallas', 'United States', 32.78, -96.8], ['Austin', 'United States', 30.27, -97.74], ['Denver', 'United States', 39.74, -104.99],
  ['Salt Lake City', 'United States', 40.76, -111.89], ['Phoenix', 'United States', 33.45, -112.07], ['Las Vegas', 'United States', 36.17, -115.14], ['Los Angeles', 'United States', 34.05, -118.24], ['San Francisco', 'United States', 37.77, -122.42],
  ['Portland', 'United States', 45.52, -122.68], ['Seattle', 'United States', 47.61, -122.33], ['Anchorage', 'United States', 61.22, -149.9], ['Salem', 'United States', 42.52, -70.9],
  ['Toronto', 'Canada', 43.65, -79.38], ['Montreal', 'Canada', 45.5, -73.57], ['Ottawa', 'Canada', 45.42, -75.7], ['Vancouver', 'Canada', 49.28, -123.12], ['Calgary', 'Canada', 51.05, -114.07], ['Halifax', 'Canada', 44.65, -63.58],
  ['Mexico City', 'Mexico', 19.43, -99.13], ['Guadalajara', 'Mexico', 20.66, -103.35], ['Oaxaca', 'Mexico', 17.07, -96.73], ['Havana', 'Cuba', 23.11, -82.37], ['Kingston', 'Jamaica', 17.97, -76.79], ['San Juan', 'Puerto Rico', 18.47, -66.11],
  ['Guatemala City', 'Guatemala', 14.63, -90.51], ['San Jose', 'Costa Rica', 9.93, -84.08], ['Panama City', 'Panama', 8.98, -79.52], ['Bogota', 'Colombia', 4.71, -74.07], ['Medellin', 'Colombia', 6.24, -75.58], ['Caracas', 'Venezuela', 10.48, -66.9],
  ['Quito', 'Ecuador', -0.18, -78.47], ['Lima', 'Peru', -12.05, -77.04], ['Cusco', 'Peru', -13.53, -71.97], ['La Paz', 'Bolivia', -16.5, -68.15], ['Uyuni', 'Bolivia', -20.46, -66.82], ['Santiago', 'Chile', -33.45, -70.67],
  ['Buenos Aires', 'Argentina', -34.6, -58.38], ['Montevideo', 'Uruguay', -34.9, -56.16], ['Asuncion', 'Paraguay', -25.26, -57.58], ['Sao Paulo', 'Brazil', -23.55, -46.63], ['Rio de Janeiro', 'Brazil', -22.91, -43.17], ['Salvador', 'Brazil', -12.97, -38.5],
  ['Brasilia', 'Brazil', -15.79, -47.88], ['Manaus', 'Brazil', -3.12, -60.02],
]

export const PLACES: Place[] = RAW.map(([city, country, lat, lng]) => ({ label: `${city}, ${country}`, lat, lng }))

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function searchPlaces(query: string, limit = 6): Place[] {
  const q = fold(query.trim())
  if (q.length < 2) return []
  const starts: Place[] = []
  const contains: Place[] = []
  for (const p of PLACES) {
    const l = fold(p.label)
    if (l.startsWith(q)) starts.push(p)
    else if (l.includes(q)) contains.push(p)
  }
  return [...starts, ...contains].slice(0, limit)
}

export const coordLabel = (lat: number, lng: number) => `${lat.toFixed(1)}, ${lng.toFixed(1)}`

export function customPlace(lat: number, lng: number): Place {
  return { label: `Pinned spot (${coordLabel(lat, lng)})`, lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 }
}
