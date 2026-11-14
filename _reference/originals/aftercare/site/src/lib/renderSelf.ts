import type { SelfView, SelfLink } from './secondSelf'
import { esc } from './html'
import { getCard, majorByNumber } from './deck'
import { cardArtSvg } from './cardArt'
import { mapSvg } from './worldMap'
import { SIGNS } from './zodiac'
import { themeById } from './themes'
import { lifePathCardNumber } from './numerology'

const KIND_LABEL = { movie: 'Movies', book: 'Books', thing: 'Things' } as const
const KIND_COLOR = { birth: '#d99a2b', movie: '#7b2d3a', book: '#3f7f73', thing: '#d9a7a0' } as const

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(2000, m - 1, d))
  date.setUTCFullYear(y)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function thumb(id: string | undefined, uid: string): string {
  const card = id ? getCard(id) : undefined
  if (!card) return ''
  return `<a class="mini-card" href="/tarot/cards/${card.slug}/" aria-label="${esc(card.name)}">${cardArtSvg(card, { uid })}</a>`
}

export function heroHtml(view: SelfView, opts: { shared?: boolean } = {}): string {
  const n = view.numbers
  const sign = SIGNS.find((s) => s.id === n?.signId)
  const birthCard = n ? getCard(n.birthCard) : undefined
  const chips = [
    n ? `<span class="chip gold">Life path ${n.lifePath}</span>` : '',
    sign ? `<span class="chip green">${esc(sign.name)} sun</span>` : '',
    birthCard ? `<span class="chip ox">Birth card: ${esc(birthCard.name)}</span>` : '',
  ].join('')
  const birthPin = view.pins?.find((p) => p.kind === 'birth')
  const born = [view.birthDate ? `Born ${longDate(view.birthDate)}` : '', birthPin ? birthPin.label : ''].filter(Boolean).join(' · ')
  const initial = esc([...view.name.trim()][0]?.toUpperCase() ?? '?')
  return `<div class="plate">
    <div class="sigil" aria-hidden="true">${initial}</div>
    <div>
      <span class="eyebrow">${opts.shared ? 'A shared second self' : 'Your second self'}</span>
      <h1 style="margin:10px 0 8px">${esc(view.name)}</h1>
      ${born ? `<p class="muted" style="margin:0 0 14px">${esc(born)}</p>` : ''}
      <div class="chips">${chips}</div>
    </div>
    <div class="me-actions" id="self-actions"></div>
  </div>`
}

function numCard(value: number | undefined, label: string, sub: string): string {
  if (!value) return ''
  return `<div class="plate numcard"><b>${value}</b><small>${esc(label)}</small><span>${esc(sub)}</span></div>`
}

export function numbersHtml(view: SelfView): string {
  const n = view.numbers
  if (!n) return ''
  const lpCard = majorByNumber(lifePathCardNumber(n.lifePath))
  const bd = majorByNumber(lifePathCardNumber(n.birthday))
  const py = majorByNumber(n.personalYear)
  const ex = n.expression ? majorByNumber(lifePathCardNumber(n.expression)) : undefined
  const su = n.soulUrge ? majorByNumber(lifePathCardNumber(n.soulUrge)) : undefined
  return `<div class="nums">
    ${numCard(n.lifePath, 'Life path', lpCard?.name ?? '')}
    ${numCard(n.birthday, 'Birthday', bd?.name ?? '')}
    ${numCard(n.expression, 'Expression', ex?.name ?? '')}
    ${numCard(n.soulUrge, 'Soul urge', su?.name ?? '')}
    ${numCard(n.personalYear, `Personal year ${n.year}`, py?.name ?? '')}
  </div>
  <div class="split" style="margin-top:30px;align-items:start">
    <div class="plate" style="padding:24px"><h3 style="margin-bottom:8px">${esc(n.lifePathTitle)} <em>(${n.lifePath})</em></h3><p style="margin:0">${esc(n.lifePathSummary)}</p><p class="note" style="margin:16px 0 0">${esc(n.personalYearNote)}</p></div>
    <div class="cards-row">${thumb(n.birthCard, 'bc')}${thumb(n.soulCard, 'sc')}<p class="muted" style="grid-column:1/-1;margin:0;font-size:.88rem">Your birth card and soul card, from the digits of your birth date.</p></div>
  </div>`
}

export function mapHtml(view: SelfView): string {
  if (!view.pins?.length) return ''
  const legend = [
    view.pins.some((p) => p.kind === 'birth') ? ['birth', 'Where you began'] : null,
    view.pins.some((p) => p.kind === 'movie') ? ['movie', 'Movies'] : null,
    view.pins.some((p) => p.kind === 'book') ? ['book', 'Books'] : null,
    view.pins.some((p) => p.kind === 'thing') ? ['thing', 'Things'] : null,
  ].filter((x): x is string[] => !!x)
  const list = view.pins
    .map((p) => `<li><i style="background:${KIND_COLOR[p.kind]}"></i>${p.title ? `<b>${esc(p.title)}</b> ` : '<b>Born</b> '}<span class="muted">${esc(p.label)}</span></li>`)
    .join('')
  return `${mapSvg(view.pins, { dark: true })}
  <div class="legend">${legend.map(([k, l]) => `<span><i style="background:${KIND_COLOR[k as keyof typeof KIND_COLOR]}"></i>${l}</span>`).join('')}</div>
  <ul class="pin-list">${list}</ul>`
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** Radial map: you in the middle, your cards on an inner ring, favorites on the outer ring. */
export function constellationHtml(view: SelfView): string {
  const n = view.numbers
  const favs = view.favorites ?? []
  if (!n && !favs.length) return ''
  const cx = 400
  const cy = 310
  const R1 = 140
  const R2 = 255
  const inner: { id: string; label: string; own: string[] }[] = []
  const add = (id: string | undefined, own?: string) => {
    const c = id ? getCard(id) : undefined
    if (!c) return
    const hit = inner.find((i) => i.id === c.id)
    if (hit) {
      if (own) hit.own.push(own)
    } else inner.push({ id: c.id, label: c.name, own: own ? [own] : [] })
  }
  if (n) {
    add(majorByNumber(lifePathCardNumber(n.lifePath))?.id, 'Life path')
    add(n.birthCard, 'Birth')
    add(n.soulCard, 'Soul')
    const sign = SIGNS.find((s) => s.id === n.signId)
    if (sign) add(majorByNumber(sign.cardNumber)?.id, sign.name)
  }
  const shown = favs.slice(0, 16)
  for (const f of shown) add(majorByNumber(themeById(f.themeId)?.cardNumber ?? -1)?.id)
  const pos = (i: number, total: number, r: number, off: number) => {
    const a = off + (i / Math.max(total, 1)) * Math.PI * 2
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const innerPts = inner.map((c, i) => ({ ...c, ...pos(i, inner.length, R1, -Math.PI / 2) }))
  const outerPts = shown.map((f, i) => ({ ...f, ...pos(i, shown.length, R2, -Math.PI / 2 + Math.PI / Math.max(shown.length, 1)) }))
  const edges: string[] = []
  for (const p of innerPts) if (p.own.length) edges.push(`<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="e-own"/>`)
  for (const f of outerPts) {
    const card = majorByNumber(themeById(f.themeId)?.cardNumber ?? -1)
    const target = innerPts.find((c) => c.id === card?.id)
    if (target) edges.push(`<line x1="${f.x.toFixed(1)}" y1="${f.y.toFixed(1)}" x2="${target.x.toFixed(1)}" y2="${target.y.toFixed(1)}" class="e-fav"/>`)
  }
  const colorOf = (k: string) => KIND_COLOR[k as keyof typeof KIND_COLOR] ?? '#d9a7a0'
  const innerSvg = innerPts
    .map((c) => {
      const below = c.y >= cy
      const ty = c.y + (below ? 30 : -22)
      const role = c.own.length ? `<text x="${c.x.toFixed(1)}" y="${(ty + (below ? 15 : -15)).toFixed(1)}" text-anchor="middle" class="t-role">${esc(c.own.join(' · '))}</text>` : ''
      return `<g><circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.own.length ? 14 : 10}" fill="${c.own.length ? '#d99a2b' : '#214844'}" stroke="#f3ead9" stroke-width="1.5"/><text x="${c.x.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" class="t-card">${esc(clip(c.label, 16))}</text>${role}</g>`
    })
    .join('')
  const outerSvg = outerPts
    .map((f) => {
      const right = f.x >= cx
      const tx = f.x + (right ? 14 : -14)
      return `<g><circle cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="8" fill="${colorOf(f.kind)}" stroke="#f3ead9" stroke-width="1.4"/><text x="${tx.toFixed(1)}" y="${(f.y + 5).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" class="t-fav">${esc(clip(f.title, 16))}</text></g>`
    })
    .join('')
  return `<svg class="constel" viewBox="0 0 800 620" role="img" aria-label="Connection map: ${esc(view.name)} at the center, tarot cards around them, favorites on the outside">
    <circle cx="${cx}" cy="${cy}" r="${R1}" fill="none" stroke="#f3ead9" stroke-opacity=".18" stroke-dasharray="3 6"/>
    <circle cx="${cx}" cy="${cy}" r="${R2}" fill="none" stroke="#f3ead9" stroke-opacity=".12" stroke-dasharray="3 8"/>
    <g class="edges">${edges.join('')}</g>
    ${innerSvg}${outerSvg}
    <circle cx="${cx}" cy="${cy}" r="36" fill="#0f2321" stroke="#d99a2b" stroke-width="2"/>
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" class="t-you">You</text>
  </svg>`
}

const LINK_LABEL = { echo: 'Echo', kindred: 'Kindred', place: 'Distance' } as const

export function linksHtml(links: SelfLink[]): string {
  if (!links.length) return ''
  return `<ul class="links">${links
    .map(
      (l, i) => `<li class="plate link-card kind-${l.kind}">
      <div>
        <span class="chip ${l.kind === 'echo' ? 'gold' : l.kind === 'kindred' ? 'green' : 'fill'}">${LINK_LABEL[l.kind]}</span>
        <h3>${esc(l.title)}</h3>
        <p>${esc(l.why)}</p>
      </div>
      ${l.cards?.length ? `<div class="link-cards">${l.cards.map((c) => thumb(c, `lk${i}`)).join('')}</div>` : ''}
    </li>`,
    )
    .join('')}</ul>`
}

export function favoritesHtml(view: SelfView): string {
  const favs = view.favorites ?? []
  if (!favs.length) return ''
  return `<div class="fav-lists">${(['movie', 'book', 'thing'] as const)
    .map((k) => {
      const items = favs.filter((f) => f.kind === k)
      return `<div><h3 style="margin-bottom:8px">${KIND_LABEL[k]}</h3><ul>${
        items.length
          ? items.map((f) => `<li><span>${esc(f.title)}</span><small>${esc(themeById(f.themeId)?.label ?? '')}</small></li>`).join('')
          : '<li><small>Nothing here yet</small></li>'
      }</ul></div>`
    })
    .join('')}</div>`
}

export function factsHtml(view: SelfView): string {
  if (!view.facts?.length) return ''
  return `<ul class="facts">${view.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
}

function section(cls: string, eyebrow: string, title: string, lede: string, body: string): string {
  if (!body.trim()) return ''
  return `<section class="${cls}"><div class="wrap"><div class="section-head"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}</div>${body}</div></section>`
}

/** Full second-self page body, shared by /profile/ and /share/. */
export function renderSelf(view: SelfView, opts: { shared?: boolean } = {}): string {
  const constel = constellationHtml(view)
  const links = linksHtml(view.links ?? [])
  const connections = constel || links ? `${constel ? `<div class="constel-wrap" tabindex="0" role="group" aria-label="Connection map">${constel}</div><p class="swipe-hint">Swipe sideways to explore the map.</p>` : ''}${links}` : ''
  return [
    `<section class="me-hero"><div class="wrap">${heroHtml(view, opts)}</div></section>`,
    view.facts?.length ? `<section class="facts-sec"><div class="wrap">${factsHtml(view)}</div></section>` : '',
    section('nums-sec', 'Numbers', 'Your <em>numbers.</em>', '', numbersHtml(view)),
    section('map-sec dark', 'Map', 'Where it <em>all happens.</em>', 'Where you began and where your favorite stories live.', mapHtml(view)),
    section('dark conn-sec', 'Connections', 'How it <em>all connects.</em>', 'Gold dots are your own cards. The outer ring is the things you love, each tied to the card that carries its theme in our map.', connections),
    section('', 'Favorites', 'Things you <em>keep.</em>', '', favoritesHtml(view)),
  ].join('')
}
