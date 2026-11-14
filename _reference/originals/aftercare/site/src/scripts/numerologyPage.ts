import { NUMBER_MEANINGS, PERSONAL_YEAR_MEANINGS, lifePathCardNumber, numerologyFor, parseBirthDate } from '../lib/numerology'
import { majorByNumber } from '../lib/deck'
import { sunSign } from '../lib/zodiac'
import { cardArtSvg } from '../lib/cardArt'
import { getProfile } from '../lib/storage'
import { esc } from '../lib/html'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const date = $<HTMLInputElement>('n-date')
const name = $<HTMLInputElement>('n-name')

const cardLink = (n: number, uid: string) => {
  const c = majorByNumber(n)
  return c ? `<a class="mini-card" style="width:64px" href="/tarot/cards/${c.slug}/" aria-label="${esc(c.name)}">${cardArtSvg(c, { uid })}</a>` : ''
}
const cardName = (n: number) => esc(majorByNumber(n)?.name ?? '')

function render() {
  const msg = $('n-msg')
  const out = $('num-result')
  const p = parseBirthDate(date.value)
  if (!p || date.value > new Date().toISOString().slice(0, 10)) {
    $('dial-num').textContent = '?'
    msg.textContent = date.value ? 'That does not look like a real birth date.' : 'Enter a birth date to begin. Nothing leaves your device.'
    return
  }
  const r = numerologyFor(name.value, date.value)
  if (!r) return
  msg.textContent = 'Worked out right here in your browser.'
  const lp = r.lifePath
  $('dial-num').textContent = String(lp.number)
  const m = NUMBER_MEANINGS[lp.number]
  const sign = sunSign(date.value)
  const lpCard = lifePathCardNumber(lp.number)
  const rows: string[] = [
    `<tr><td>${lp.number}</td><th scope="row">Life path</th><td>${esc(m.title)}</td></tr>`,
    `<tr><td>${r.birthday}</td><th scope="row">Birthday</th><td>${esc(NUMBER_MEANINGS[r.birthday]?.title ?? '')}: the talent you were handed on the day</td></tr>`,
  ]
  if (r.names) {
    rows.push(`<tr><td>${r.names.expression}</td><th scope="row">Expression</th><td>${esc(NUMBER_MEANINGS[r.names.expression]?.title ?? '')}: how you come across when you do your thing</td></tr>`)
    if (r.names.soulUrge) rows.push(`<tr><td>${r.names.soulUrge}</td><th scope="row">Soul urge</th><td>${esc(NUMBER_MEANINGS[r.names.soulUrge]?.title ?? '')}: what you want underneath (from the vowels)</td></tr>`)
    if (r.names.personality) rows.push(`<tr><td>${r.names.personality}</td><th scope="row">Personality</th><td>${esc(NUMBER_MEANINGS[r.names.personality]?.title ?? '')}: the first impression (from the consonants)</td></tr>`)
  }
  rows.push(`<tr><td>${r.personalYear}</td><th scope="row">Personal year ${new Date().getFullYear()}</th><td>${esc(PERSONAL_YEAR_MEANINGS[r.personalYear])}</td></tr>`)
  out.innerHTML = `<div class="plate" style="padding:26px">
    <span class="eyebrow">Life path ${lp.number}</span>
    <h3 style="margin:10px 0 8px">${esc(m.title)}</h3>
    <p>${esc(m.summary)}</p>
    <p class="muted" style="font-size:.92rem">The working: month ${p.month} → ${lp.month}, day ${p.day} → ${lp.day}, year ${p.year} → ${lp.year}. ${lp.month} + ${lp.day} + ${lp.year} = ${lp.sum} → <b>${lp.number}</b>.</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;margin:18px 0">
      <div>${cardLink(lpCard, 'lpc')}<small class="muted" style="display:block;max-width:88px;margin-top:6px">Life path card<br><b>${cardName(lpCard)}</b></small></div>
      <div>${cardLink(r.cards.birth, 'bcc')}<small class="muted" style="display:block;max-width:88px;margin-top:6px">Birth card<br><b>${cardName(r.cards.birth)}</b></small></div>
      <div>${cardLink(r.cards.soul, 'scc')}<small class="muted" style="display:block;max-width:88px;margin-top:6px">Soul card<br><b>${cardName(r.cards.soul)}</b></small></div>
    </div>
    ${sign ? `<p class="note">Sun sign: ${esc(sign.name)}. We pair it with ${cardName(sign.cardNumber)}, our own pairing for fun, not a fixed rule.</p>` : ''}
  </div>
  <div class="plate" style="padding:18px 22px;margin-top:22px"><table class="table-nums"><caption class="sr">All your numbers</caption><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Reading</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`
}

const profile = getProfile()
if (profile) {
  date.value = profile.birthDate
  name.value = profile.displayName
}
;[date, name].forEach((i) => i.addEventListener('input', render))
$('num-form').addEventListener('submit', (e) => e.preventDefault())
render()
