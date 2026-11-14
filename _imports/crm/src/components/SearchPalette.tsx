import { controlClass } from '@/components/ui'
import { useCrm } from '@/lib/crm'
import { searchDesk } from '@/lib/search'
import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const data = useCrm()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const hits = useMemo(
    () => searchDesk(query, data),
    [data, query],
  )

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 mx-auto flex max-h-[100dvh] w-full max-w-xl flex-col bg-ink px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-8">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">People, companies, deals, tasks, and notes.</Dialog.Description>
          <input
            autoFocus
            aria-label="Search"
            placeholder="People, deals, notes"
            className={controlClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.trim() && hits.length === 0 ? <p className="mt-6 text-cream-dim">Nothing under that.</p> : null}
          <ul className="mt-4 overflow-y-auto">
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  className="flex w-full min-h-14 items-center justify-between gap-3 border-b border-line text-left"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(hit.href)
                  }}
                >
                  <span>
                    <span className="block">{hit.title}</span>
                    <span className="text-[13px] text-cream-dim">{hit.meta}</span>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-tiffany">{hit.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
