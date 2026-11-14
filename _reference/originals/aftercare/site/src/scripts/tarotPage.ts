import type { Card, DrawnCard, SpreadId } from '../lib/types'
import { SPREADS, SPREAD_IDS, drawSpread } from '../lib/spreads'
import { requireCard } from '../lib/deck'
import { newReading, readingLines, summarize, type ReadingLine } from '../lib/reading'
import { saveReading } from '../lib/storage'
import { cardArtSvg } from '../lib/cardArt'
import { esc } from '../lib/html'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const host = $('table')
const status = $('status')
const btnDeal = $<HTMLButtonElement>('btn-deal')
const btnShuffle = $<HTMLButtonElement>('btn-shuffle')
const btnReveal = $<HTMLButtonElement>('btn-reveal')
const btnReset = $<HTMLButtonElement>('btn-reset')
const btnSave = $<HTMLButtonElement>('btn-save')
const picker = $('spread-picker')
const question = $<HTMLInputElement>('question')

let spreadId: SpreadId = 'three'
let drawn: DrawnCard[] | null = null
const revealed = new Set<string>()
let selected: string | null = null
let saved = false
let busy = false

type TableApi = import('../scene/TarotTable').TarotTable
let table: TableApi | null = null
let webgl = true

const say = (t: string) => { status.textContent = t }

function setBusy(b: boolean) {
  busy = b
  refreshButtons()
}

function refreshButtons() {
  const dealt = !!drawn
  btnDeal.disabled = busy
  btnShuffle.disabled = busy || !webgl
  btnReveal.disabled = busy || !dealt || revealed.size === (drawn?.length ?? 0)
  btnReset.disabled = busy || !dealt
  btnSave.disabled = busy || !dealt || revealed.size < (drawn?.length ?? 1) || saved
  picker.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = busy))
}

const lines = (): ReadingLine[] => (drawn ? readingLines(spreadId, drawn) : [])

function thumb(card: Card, reversed: boolean) {
  return `<span class="mini-card${reversed ? ' rev' : ''}">${cardArtSvg(card, { uid: 'rl' })}</span>`
}

function renderReading() {
  const section = $('reading')
  section.hidden = !drawn
  if (!drawn) return
  const ls = lines()
  $('reading-question').textContent = question.value.trim() ? `Your question: ${question.value.trim()}` : ''
  $('reading-title').innerHTML = `${esc(SPREADS[spreadId].name)}: <em>${ls.length === 1 ? 'one card' : ls.length + ' cards'}.</em>`
  $('reading-list').innerHTML = ls
    .map((l, i) => {
      const up = revealed.has(l.positionId)
      return `<li class="plate rcard${up ? '' : ' pending'}" data-pos="${l.positionId}" ${selected === l.positionId ? 'aria-current="true"' : ''}>
        <span class="pos">${i + 1}. ${esc(l.position)}</span>
        ${up
          ? `${thumb(l.card, l.reversed)}<h3><a href="/tarot/cards/${l.card.slug}/">${esc(l.card.name)}</a> <small>${l.orientation}</small></h3><p>${esc(l.text)}</p><div class="chips">${l.keywords.slice(0, 3).map((k) => `<span class="chip fill">${esc(k)}</span>`).join('')}</div><p class="ask"><em>${esc(l.card.reflect)}</em></p>`
          : `<h3>Face down</h3><p>${esc(l.prompt)}.</p><button class="btn ghost sm" type="button" data-flip="${l.positionId}">Turn it over</button>`}
      </li>`
    })
    .join('')
  const done = revealed.size === ls.length
  const sum = $('summary')
  const items = done ? summarize(spreadId, drawn) : []
  sum.hidden = items.length === 0
  $('summary-list').innerHTML = items.map((t) => `<li>${esc(t)}</li>`).join('')
}

function renderFocus() {
  const el = $('focus')
  const l = lines().find((x) => x.positionId === selected)
  if (!l || !revealed.has(l.positionId)) { el.hidden = true; return }
  el.hidden = false
  el.innerHTML = `${thumb(l.card, l.reversed)}<div><span class="pos">${esc(l.position)}</span><h3>${esc(l.card.name)} <small>${l.orientation}</small></h3><p>${esc(l.text)}</p><p class="ask"><em>${esc(l.card.reflect)}</em></p><a class="btn ghost sm" href="/tarot/cards/${l.card.slug}/">About this card</a></div>`
}

function select(positionId: string | null) {
  selected = positionId
  table?.setSelected(positionId)
  renderFocus()
  renderReading()
}

async function flip(positionId: string) {
  if (!drawn || revealed.has(positionId)) { select(positionId); return }
  if (table && webgl) await table.flip(positionId)
  revealed.add(positionId)
  select(positionId)
  const left = drawn.length - revealed.size
  say(left ? `${left} card${left === 1 ? '' : 's'} still face down.` : 'All cards turned. Scroll down for the full reading, and save it if you like.')
  refreshButtons()
}

async function dealCards() {
  if (busy) return
  setBusy(true)
  revealed.clear()
  saved = false
  selected = null
  $('save-msg').textContent = 'Readings are saved on this device only. Turn over every card to save.'
  renderFocus()
  drawn = drawSpread(spreadId)
  const assignments = drawn.map((d) => ({ positionId: d.positionId, card: requireCard(d.cardId), reversed: d.reversed }))
  if (table && webgl) {
    say('Shuffling...')
    await table.shuffle()
    say('Dealing...')
    await table.deal(assignments)
  }
  say(webgl ? 'Dealt. Tap a card to turn it over.' : 'Dealt. Use "Turn it over" in the reading below.')
  renderReading()
  setBusy(false)
  if (webgl) host.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

async function shuffleOnly() {
  if (busy || !table) return
  setBusy(true)
  say('Shuffling...')
  if (drawn) { await table.reset(); drawn = null; revealed.clear(); select(null); renderReading() }
  await table.shuffle()
  say('Shuffled. Tap the deck or press "Shuffle & deal".')
  setBusy(false)
}

async function startOver() {
  if (busy) return
  setBusy(true)
  await table?.reset()
  drawn = null
  revealed.clear()
  selected = null
  saved = false
  renderReading()
  renderFocus()
  say('Cards back on the pile. Shuffle and deal when you are ready.')
  setBusy(false)
}

async function revealAll() {
  if (busy || !drawn) return
  setBusy(true)
  if (table && webgl) await table.flipAll()
  drawn.forEach((d) => revealed.add(d.positionId))
  select(selected ?? drawn[0].positionId)
  say('All cards turned. Scroll down for the full reading, and save it if you like.')
  setBusy(false)
}

async function changeSpread(id: SpreadId) {
  if (busy || id === spreadId) return
  spreadId = id
  drawn = null
  revealed.clear()
  selected = null
  saved = false
  picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.spread === id)))
  $('spread-blurb').textContent = SPREADS[id].blurb
  table?.setSpread(id)
  history.replaceState(null, '', `?spread=${id}`)
  renderReading()
  renderFocus()
  say('Pick a spread, then shuffle and deal. Tap a card to turn it over.')
  refreshButtons()
}

function save() {
  if (!drawn || saved) return
  const r = newReading(spreadId, drawn, question.value, new Date())
  const note = $<HTMLInputElement>('note').value.trim()
  if (note) r.note = note
  saveReading(r)
  saved = true
  $('save-msg').innerHTML = 'Saved on this device. <a href="/tarot/readings/">See your readings</a>.'
  host.dataset.saved = 'true'
  refreshButtons()
}

picker.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-spread]') as HTMLElement | null
  if (b) void changeSpread(b.dataset.spread as SpreadId)
})
btnDeal.addEventListener('click', () => void dealCards())
btnShuffle.addEventListener('click', () => void shuffleOnly())
btnReveal.addEventListener('click', () => void revealAll())
btnReset.addEventListener('click', () => void startOver())
btnSave.addEventListener('click', save)
$('reading-list').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-flip]') as HTMLElement | null
  if (b) void flip(b.dataset.flip!)
})

async function boot() {
  const wanted = new URLSearchParams(location.search).get('spread') as SpreadId | null
  if (wanted && SPREAD_IDS.includes(wanted)) {
    spreadId = wanted
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.spread === wanted)))
    $('spread-blurb').textContent = SPREADS[wanted].blurb
    host.dataset.spread = wanted
  }
  try {
    const { TarotTable } = await import('../scene/TarotTable')
    const t = new TarotTable(host, {
      onActivate: (id) => {
        if (busy) return
        if (id === 'pile') { if (!drawn) void dealCards(); return }
        void flip(id)
      },
    })
    if (!t.supported) throw new Error('webgl')
    table = t
    t.setSpread(spreadId)
    host.dataset.ready = 'true'
  } catch {
    webgl = false
    $('table-fallback').hidden = false
    host.dataset.webgl = 'false'
    host.dataset.ready = 'true'
    say('3D is not available here, so cards are shown as a list below.')
  }
  refreshButtons()
}

void boot()
