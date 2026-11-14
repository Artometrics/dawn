import { Button, PageTitle } from '@/components/ui'
import { importRows } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { contactsToCsv, parseContactsCsv } from '@/lib/csv'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { useState } from 'react'

export function SettingsPage() {
  const { db, emulators } = useServices()
  const session = useSession()
  const crm = useCrm()
  const [busy, setBusy] = useState(false)
  const demoOn = crm.contacts.some((contact) => contact.demo) || crm.companies.some((company) => company.demo)
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  function exportCsv() {
    const csv = contactsToCsv(crm.contacts.map((contact) => ({
      name: contact.name,
      company: contact.companyName,
      email: contact.email,
      phone: contact.phone,
      instagram: contact.instagram,
      website: contact.website,
      tags: contact.tags.join(', '),
      source: contact.source,
    })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'artometrics-people.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageTitle>Desk</PageTitle>
      <p className="mt-4">{session.user?.email}</p>
      <p className="mt-1 text-[13px] text-cream-dim">crm-510519{emulators ? ' · emulator' : ''}{standalone ? ' · home screen' : ''}</p>

      <section className="mt-8 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg">Demo</h2>
            <p className="text-sm text-cream-dim">Synthetic people. They clear together.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={demoOn}
            disabled={crm.demoBusy || busy}
            className={`min-h-11 min-w-16 px-3 text-sm font-semibold ${demoOn ? 'bg-signal text-white' : 'bg-raise text-cream'}`}
            onClick={() => {
              if (demoOn) void crm.wipeDemo()
              else void crm.loadDemo()
            }}
          >
            {crm.demoBusy ? '…' : demoOn ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        <Button variant="quiet" onClick={exportCsv}>Export people</Button>
        <label className="inline-flex min-h-11 items-center justify-center bg-raise px-4 text-[15px] font-semibold">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file || !session.user) return
              setBusy(true)
              void file.text().then(async (text) => {
                const rows = parseContactsCsv(text)
                const count = await importRows(db, session.user!, rows, crm.companies)
                crm.setBanner(count ? `Imported ${count}.` : 'No names in that file.')
              }).catch((error: unknown) => crm.setBanner(explainWrite(error))).finally(() => setBusy(false))
            }}
          />
        </label>
      </section>

      <section className="mt-8 text-sm text-cream-dim">
        <p>iPhone: Share, then Add to Home Screen. The session stays.</p>
        <p className="mt-2">Google is the daily sign-in. Apple is wired and waits on the Apple provider in Firebase.</p>
      </section>

      <Button className="mt-8" variant="quiet" disabled={busy} onClick={() => void session.signOut()}>Sign out</Button>
    </div>
  )
}
