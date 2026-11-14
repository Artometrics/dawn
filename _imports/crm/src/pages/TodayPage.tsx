import { InstallHint } from '@/components/InstallHint'
import { PageTitle } from '@/components/ui'
import { setTaskDone } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { digestDateLabel, mapDigest, type DeskDigest } from '@/lib/digestView'
import { useServices } from '@/lib/services'
import { dueLabel, money, whenBucket } from '@/lib/time'
import type { Task } from '@/lib/types'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function TodayPage() {
  const { db } = useServices()
  const { ready, tasks, deals, contacts, setBanner, loadDemo, demoBusy } = useCrm()
  const [digest, setDigest] = useState<DeskDigest | null>(null)

  useEffect(() => {
    return onSnapshot(doc(db, 'digests', 'latest'), (snap) => {
      setDigest(snap.exists() ? mapDigest(snap.data()) : null)
    }, () => setDigest(null))
  }, [db])
  const openTasks = tasks.filter((task) => !task.done && task.dueAt)
  const overdue = openTasks.filter((task) => task.dueAt && whenBucket(task.dueAt) === 'overdue')
  const today = openTasks.filter((task) => task.dueAt && whenBucket(task.dueAt) === 'today')
  const proposals = deals.filter((deal) => deal.stage === 'proposal')
  const emptyDesk = ready && contacts.length === 0 && deals.length === 0 && tasks.length === 0

  function toggle(task: Task) {
    void setTaskDone(db, task.id, !task.done).catch((error: unknown) => setBanner(explainWrite(error)))
  }

  return (
    <div>
      <PageTitle>Today</PageTitle>
      <InstallHint />
      {!ready ? <p className="mt-6 text-cream-dim">Opening the desk.</p> : null}
      {emptyDesk ? (
        <div className="mt-8">
          <p>Desk is empty.</p>
          <button type="button" className="mt-4 min-h-11 text-tiffany" disabled={demoBusy} onClick={() => void loadDemo()}>
            {demoBusy ? 'Loading demo…' : 'Load demo'}
          </button>
        </div>
      ) : null}
      {digest ? <Morning digest={digest} /> : null}
      <TaskGroup title="Overdue" tasks={overdue} contacts={contacts} onToggle={toggle} />
      <TaskGroup title="Today" tasks={today} contacts={contacts} onToggle={toggle} />
      {ready && overdue.length === 0 && today.length === 0 && !emptyDesk ? <p className="mt-6 text-cream-dim">Clear day.</p> : null}
      {proposals.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-[1.6rem] leading-none">Proposal</h2>
          <ul className="mt-3">
            {proposals.map((deal) => (
              <li key={deal.id} className="border-b border-line">
                <Link to={`/pipeline?deal=${deal.id}`} className="flex min-h-14 items-center justify-between gap-3">
                  <span>
                    <span className="block">{deal.title}</span>
                    <span className="text-[13px] text-cream-dim">{deal.companyName || deal.contactName || 'Proposal'}</span>
                  </span>
                  <span className="tabular-nums text-tiffany">{money(deal.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function Morning({ digest }: { digest: DeskDigest }) {
  const lines = [...digest.overdue, ...digest.today]
  const mailed = digest.emailStatus === 'sent' ? 'Emailed' : digest.emailStatus === 'error' ? 'Email failed' : 'Not emailed'
  return (
    <section className="mt-6">
      <h2 className="font-display text-[1.6rem] leading-none">Morning</h2>
      <p className="mt-1 text-[13px] text-cream-dim">{digestDateLabel(digest.date)} · {mailed}</p>
      <ul className="mt-2">
        {lines.map((line) => (
          <li key={`${line.taskId}-${line.title}`} className="border-b border-line">
            <Link to={line.contactId ? `/people/${line.contactId}` : '/tasks'} className="flex min-h-12 items-center justify-between gap-3">
              <span>{line.title}</span>
              <span className="text-[13px] text-cream-dim">{line.contactName}</span>
            </Link>
          </li>
        ))}
        {lines.length === 0 ? <li className="mt-2 text-cream-dim">Nothing due.</li> : null}
      </ul>
    </section>
  )
}

function TaskGroup({
  title,
  tasks,
  contacts,
  onToggle,
}: {
  title: string
  tasks: Task[]
  contacts: { id: string; name: string }[]
  onToggle: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mt-6">
      <h2 className="font-display text-[1.6rem] leading-none">{title}</h2>
      <ul className="mt-2">
        {tasks.map((task) => {
          const person = contacts.find((contact) => contact.id === task.contactId)
          return (
            <li key={task.id} className="flex items-center gap-2 border-b border-line">
              <button type="button" aria-label={task.done ? 'Mark open' : 'Mark done'} className="grid size-11 place-items-center" onClick={() => onToggle(task)}>
                <span className={`size-4 border ${task.done ? 'bg-tiffany border-tiffany' : 'border-cream'}`} />
              </button>
              <Link to={person ? `/people/${person.id}` : '/tasks'} className="flex min-h-14 flex-1 items-center justify-between gap-3">
                <span>
                  <span className="block">{task.title}</span>
                  <span className="text-[13px] text-cream-dim">{person?.name || 'No person'}</span>
                </span>
                <span className={title === 'Overdue' ? 'text-[13px] font-semibold text-cream' : 'text-[13px] text-cream-dim'}>
                  {task.dueAt ? dueLabel(task.dueAt) : ''}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
