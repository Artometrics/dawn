import { cardCounts, deleteReading, getReadings, saveReading } from '../lib/storage'
import { SPREADS } from '../lib/spreads'
import { readingLines, summarize } from '../lib/reading'
import { cardArtSvg } from '../lib/cardArt'
import { getCard } from '../lib/deck'
import { esc } from '../lib/html'

const list = document.getElementById('readings-list') as HTMLElement
const empty = document.getElementById('readings-empty') as HTMLElement
const stats = document.getElementById('readings-stats') as HTMLElement

function render() {
  const readings = getReadings()
  empty.hidden = readings.length > 0
  const counts = cardCounts(readings)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n > 1).slice(0, 3)
  stats.innerHTML = readings.length
    ? `<span class="chip gold">${readings.length} reading${readings.length === 1 ? '' : 's'}</span>${top.map(([id, n]) => `<span class="chip fill">${esc(getCard(id)?.name ?? id)} × ${n}</span>`).join('')}`
    : ''
  list.innerHTML = readings
    .map((r) => {
      const lines = readingLines(r.spreadId, r.cards)
      const when = new Date(r.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      const sum = summarize(r.spreadId, r.cards)
      return `<li class="plate saved" data-id="${esc(r.id)}">
        <div class="saved-head"><div><span class="eyebrow">${esc(SPREADS[r.spreadId].name)}</span><time datetime="${esc(r.createdAt)}">${esc(when)}</time></div>
          <button class="btn ghost sm" type="button" data-del="${esc(r.id)}">Delete</button></div>
        ${r.question ? `<p class="saved-q">&ldquo;${esc(r.question)}&rdquo;</p>` : ''}
        <div class="saved-cards">${lines
          .map((l) => `<a class="saved-card" href="/tarot/cards/${l.card.slug}/"><span class="mini-card${l.reversed ? ' rev' : ''}">${cardArtSvg(l.card, { uid: `s${r.id}` })}</span><small>${esc(l.position)}</small><b>${esc(l.card.name)}</b>${l.reversed ? '<em>reversed</em>' : ''}</a>`)
          .join('')}</div>
        ${sum.length ? `<ul class="saved-sum">${sum.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <div class="field"><label for="note-${esc(r.id)}">Note</label><textarea id="note-${esc(r.id)}" data-note="${esc(r.id)}" rows="2" maxlength="4000" placeholder="What does this say to you now?">${esc(r.note ?? '')}</textarea></div>
      </li>`
    })
    .join('')
}

list.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('[data-del]')?.dataset.del
  if (id && confirm('Delete this reading from this device?')) {
    deleteReading(id)
    render()
  }
})
list.addEventListener('change', (e) => {
  const ta = e.target as HTMLTextAreaElement
  const id = ta.dataset.note
  if (!id) return
  const r = getReadings().find((x) => x.id === id)
  if (r) saveReading({ ...r, note: ta.value.trim() || undefined })
})
render()
