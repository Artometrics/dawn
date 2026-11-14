import type { Favorite, FavoriteKind, Place, Profile } from '../lib/types'
import { DEFAULT_VISIBILITY, getProfile, saveProfile } from '../lib/storage'
import { PLACES, customPlace } from '../lib/places'
import { THEMES } from '../lib/themes'
import { guessTheme } from '../lib/secondSelf'
import { lifePath, parseBirthDate, NUMBER_MEANINGS } from '../lib/numerology'
import { sunSign } from '../lib/zodiac'
import { getCard, majorByNumber } from '../lib/deck'
import { birthCards } from '../lib/numerology'
import { mapSvg, unproject } from '../lib/worldMap'
import { esc } from '../lib/html'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const name = $<HTMLInputElement>('f-name')
const date = $<HTMLInputElement>('f-date')
const time = $<HTMLInputElement>('f-time')
const placeInput = $<HTMLInputElement>('f-place')
const favPlace = $<HTMLInputElement>('fav-place')

const existing = getProfile()
let birthPlace: Place | undefined = existing?.birthPlace
let favorites: Favorite[] = existing?.favorites ? [...existing.favorites] : []
let nextId = favorites.length + 1

const byLabel = (label: string): Place | undefined => PLACES.find((p) => p.label.toLowerCase() === label.trim().toLowerCase())

function renderFavs() {
  for (const kind of ['movie', 'book', 'thing'] as FavoriteKind[]) {
    $(`list-${kind}`).innerHTML = favorites
      .filter((f) => f.kind === kind)
      .map(
        (f) => `<li class="fav-item" data-id="${esc(f.id)}">
          <span class="fav-title">${esc(f.title)}${f.place ? ` <small title="${esc(f.place.label)}">&#9906;</small>` : ''}</span>
          <select aria-label="Theme for ${esc(f.title)}" data-theme-for="${esc(f.id)}">${THEMES.map((t) => `<option value="${t.id}"${(f.themeId ?? guessTheme(f.title)) === t.id ? ' selected' : ''}>${t.label}</option>`).join('')}</select>
          <button type="button" class="icon-btn" data-pin-for="${esc(f.id)}" aria-label="Pin ${esc(f.title)} to the place typed below" title="Pin to the place typed below">&#9906;</button>
          <button type="button" class="icon-btn" data-del="${esc(f.id)}" aria-label="Remove ${esc(f.title)}">&times;</button>
        </li>`,
      )
      .join('')
  }
  renderPreview()
}

function addFavorite(kind: FavoriteKind) {
  const input = $<HTMLInputElement>(`add-${kind}`)
  const title = input.value.trim()
  if (!title) return
  favorites.push({ id: `f${Date.now().toString(36)}${nextId++}`, kind, title: title.slice(0, 100), themeId: guessTheme(title) })
  input.value = ''
  input.focus()
  renderFavs()
}

document.querySelectorAll<HTMLButtonElement>('[data-add-btn]').forEach((b) => b.addEventListener('click', () => addFavorite(b.dataset.addBtn as FavoriteKind)))
document.querySelectorAll<HTMLInputElement>('[data-add]').forEach((i) =>
  i.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFavorite(i.dataset.add as FavoriteKind)
    }
  }),
)

$('fav-cols').addEventListener('click', (e) => {
  const t = e.target as HTMLElement
  const del = t.closest<HTMLElement>('[data-del]')?.dataset.del
  const pin = t.closest<HTMLElement>('[data-pin-for]')?.dataset.pinFor
  if (del) favorites = favorites.filter((f) => f.id !== del)
  if (pin) {
    const place = byLabel(favPlace.value)
    const f = favorites.find((x) => x.id === pin)
    if (f && f.place && (!place || f.place.label === place.label)) f.place = undefined
    else if (f && place) f.place = place
    else $('place-hint').textContent = 'Pick a city in the "pin a place" box first, then press the pin again.'
  }
  renderFavs()
})
$('fav-cols').addEventListener('change', (e) => {
  const sel = e.target as HTMLSelectElement
  const id = sel.dataset.themeFor
  const f = favorites.find((x) => x.id === id)
  if (f) f.themeId = sel.value
  renderPreview()
})

function setBirthPlace(p: Place | undefined) {
  birthPlace = p
  renderPinMap()
  renderPreview()
}
placeInput.addEventListener('input', () => {
  const p = byLabel(placeInput.value)
  if (p) setBirthPlace(p)
})

function renderPinMap() {
  const host = $('pin-map')
  host.innerHTML = mapSvg(birthPlace ? [{ ...birthPlace, kind: 'birth' }] : [])
  const svg = host.querySelector('svg')!
  svg.style.cursor = 'crosshair'
  svg.addEventListener('click', (e) => {
    const r = svg.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 1000
    const y = 20 + ((e.clientY - r.top) / r.height) * 400
    const { lat, lng } = unproject(x, y)
    const p = customPlace(lat, lng)
    placeInput.value = p.label
    setBirthPlace(p)
  })
}

function renderPreview() {
  const n = name.value.trim()
  $('pv-name').textContent = n || 'Your name'
  $('pv-sigil').textContent = ([...n][0] ?? '?').toUpperCase()
  const chips: string[] = []
  let text = 'Fill in the form and your numbers appear here as you type.'
  if (parseBirthDate(date.value)) {
    const lp = lifePath(date.value)!
    const sign = sunSign(date.value)
    const bc = birthCards(date.value)
    chips.push(`<span class="chip gold">Life path ${lp.number}</span>`)
    if (sign) chips.push(`<span class="chip green">${esc(sign.name)} sun</span>`)
    const card = bc ? majorByNumber(bc.birth) : undefined
    if (card && getCard(card.id)) chips.push(`<span class="chip ox">Birth card: ${esc(card.name)}</span>`)
    text = `${NUMBER_MEANINGS[lp.number].title}. ${NUMBER_MEANINGS[lp.number].summary.split('. ')[0]}.`
  } else chips.push('<span class="chip on-dark">Waiting for a birth date</span>')
  $('pv-chips').innerHTML = chips.join('')
  $('pv-text').textContent = text
  const pins = [
    ...(birthPlace ? [{ ...birthPlace, kind: 'birth' as const }] : []),
    ...favorites.filter((f) => f.place).map((f) => ({ ...f.place!, kind: f.kind, title: f.title })),
  ]
  $('pv-map').innerHTML = mapSvg(pins, { dark: true })
}

if (existing) {
  name.value = existing.displayName
  date.value = existing.birthDate
  time.value = existing.birthTime ?? ''
  placeInput.value = existing.birthPlace?.label ?? ''
}
;[name, date].forEach((i) => i.addEventListener('input', renderPreview))
renderPinMap()
renderFavs()

$<HTMLFormElement>('profile-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const err = $('err-form')
  const dateErr = $('err-date')
  err.hidden = true
  dateErr.hidden = true
  const parsed = parseBirthDate(date.value)
  if (!name.value.trim()) {
    err.textContent = 'Add a name first. A nickname is fine.'
    err.hidden = false
    name.focus()
    return
  }
  if (!parsed || date.value > new Date().toISOString().slice(0, 10)) {
    dateErr.hidden = false
    date.focus()
    return
  }
  const place = byLabel(placeInput.value) ?? (birthPlace && placeInput.value.trim() === birthPlace.label ? birthPlace : undefined)
  const profile: Profile = {
    id: existing?.id ?? 'me',
    displayName: name.value.trim(),
    birthDate: date.value,
    birthTime: time.value || undefined,
    birthPlace: place,
    favorites: favorites.map((f) => ({ ...f, themeId: f.themeId ?? guessTheme(f.title) })),
    visibility: existing?.visibility ?? { ...DEFAULT_VISIBILITY },
    updatedAt: new Date().toISOString(),
  }
  saveProfile(profile)
  location.href = '/profile/'
})

