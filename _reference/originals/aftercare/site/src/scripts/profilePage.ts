import { clearProfile, clearReadings, exportAll, getProfile, importAll, saveProfile } from '../lib/storage'
import { buildView, redactView } from '../lib/secondSelf'
import { renderSelf } from '../lib/renderSelf'
import { shareUrl } from '../lib/share'
import type { Visibility } from '../lib/types'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const TOGGLES: Array<[keyof Visibility, string, string]> = [
  ['numbers', 'Numbers and cards', 'Life path, birthday, name numbers, birth card.'],
  ['map', 'Map', 'Your birthplace pin (and favorite places if favorites are on).'],
  ['favorites', 'Favorites', 'Movies, books and things, with their pins.'],
  ['connections', 'Connections', 'Needs favorites on too, since links quote them.'],
  ['birth', 'Exact birth date', 'Off by default. Numbers can be shared without it.'],
]

function render() {
  const profile = getProfile()
  $('self-empty').hidden = !!profile
  $('self-tools').hidden = !profile
  if (!profile) {
    $('self-root').innerHTML = ''
    return
  }
  const view = buildView(profile)
  $('self-root').innerHTML = renderSelf(view)
  const actions = document.getElementById('self-actions')
  if (actions) actions.innerHTML = '<a class="btn sm" href="#self-tools">Share</a><a class="btn ghost sm" href="/onboarding/">Edit profile</a>'

  $('vis-toggles').innerHTML = TOGGLES.map(
    ([key, label, hint]) => `<label class="toggle"><span>${label}<small>${hint}</small></span><input type="checkbox" class="sr" data-vis="${key}" ${profile.visibility[key] ? 'checked' : ''} /><span class="sw${profile.visibility[key] ? ' on' : ''}" aria-hidden="true"></span></label>`,
  ).join('')
  const url = shareUrl(location.origin, redactView(view, profile.visibility))
  $('share-link').textContent = url.length > 140 ? url.slice(0, 110) + '…' : url
  $('share-link').dataset.full = url
  ;($('btn-preview') as HTMLAnchorElement).href = url
}

$('vis-toggles').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const key = input.dataset.vis as keyof Visibility | undefined
  const profile = getProfile()
  if (!key || !profile) return
  saveProfile({ ...profile, visibility: { ...profile.visibility, [key]: input.checked } })
  render()
})

$('btn-copy').addEventListener('click', async () => {
  const url = $('share-link').dataset.full ?? ''
  const msg = $('share-msg')
  try {
    await navigator.clipboard.writeText(url)
    msg.textContent = 'Link copied. Paste it anywhere.'
  } catch {
    msg.textContent = 'Could not copy automatically. Use Preview and copy the address from your browser.'
  }
})

$('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aftercare-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  $('backup-msg').textContent = 'Backup downloaded.'
})

$<HTMLInputElement>('file-import').addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const msg = $('backup-msg')
  try {
    if (file.size > 2_000_000) throw new Error('too big')
    const res = importAll(JSON.parse(await file.text()))
    msg.textContent = res ? `Restored ${res.profile ? 'your profile and ' : ''}${res.readings} reading${res.readings === 1 ? '' : 's'}.` : 'That file is not an Aftercare backup.'
    render()
  } catch {
    msg.textContent = 'Could not read that file.'
  }
})

$('btn-wipe').addEventListener('click', () => {
  if (!confirm('Delete your profile and all saved readings from this device? This cannot be undone.')) return
  clearProfile()
  clearReadings()
  render()
})

render()
