import { Button, controlClass, PageTitle } from '@/components/ui'
import { createTask, deleteTask, setTaskDone } from '@/lib/api'
import { explainWrite } from '@/lib/auth'
import { useCrm } from '@/lib/crm'
import { useServices } from '@/lib/services'
import { useSession } from '@/lib/session'
import { dueLabel, shiftDays, whenBucket } from '@/lib/time'
import type { Task } from '@/lib/types'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function dateValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function TasksPage() {
  const { db } = useServices()
  const { user } = useSession()
  const { tasks, contacts, ready, setBanner } = useCrm()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(dateValue(new Date()))
  const [showDone, setShowDone] = useState(false)
  const open = tasks.filter((task) => !task.done)
  const groups = [
    ['Overdue', open.filter((task) => task.dueAt && whenBucket(task.dueAt) === 'overdue')],
    ['Today', open.filter((task) => task.dueAt && whenBucket(task.dueAt) === 'today')],
    ['Later', open.filter((task) => !task.dueAt || whenBucket(task.dueAt) === 'later')],
  ] as const
  const done = tasks.filter((task) => task.done)

  return (
    <div>
      <PageTitle>Tasks</PageTitle>
      <form
        className="mt-4 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!user) return
          const [year, month, day] = due.split('-').map(Number)
          const dueAt = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, 9, 0, 0, 0)
          try {
            const pending = createTask(db, user, { title, contactId: '', dueAt: Number.isNaN(dueAt.getTime()) ? shiftDays(new Date(), 0) : dueAt })
            setTitle('')
            void pending.catch((error: unknown) => setBanner(explainWrite(error)))
          } catch (error) {
            setBanner(explainWrite(error))
          }
        }}
      >
        <input className={controlClass} placeholder="Follow up" value={title} onChange={(event) => setTitle(event.target.value)} />
        <div className="flex gap-2">
          <input className={controlClass} type="date" value={due} onChange={(event) => setDue(event.target.value)} aria-label="Due date" />
          <Button type="submit">Add</Button>
        </div>
      </form>
      {!ready ? <p className="mt-6 text-cream-dim">Opening the desk.</p> : null}
      {groups.map(([label, list]) => (
        <TaskList key={label} label={label} tasks={list} contacts={contacts} onToggle={(task) => void setTaskDone(db, task.id, !task.done).catch((error: unknown) => setBanner(explainWrite(error)))} onRemove={(task) => void deleteTask(db, task.id)} />
      ))}
      {ready && open.length === 0 ? <p className="mt-6 text-cream-dim">Nothing open.</p> : null}
      {done.length > 0 ? (
        <button type="button" className="mt-6 min-h-11 text-sm font-semibold text-cream-dim" onClick={() => setShowDone((value) => !value)}>
          {showDone ? 'Hide done' : `Done ${done.length}`}
        </button>
      ) : null}
      {showDone ? <TaskList label="Done" tasks={done} contacts={contacts} onToggle={(task) => void setTaskDone(db, task.id, !task.done)} onRemove={(task) => void deleteTask(db, task.id)} /> : null}
    </div>
  )
}

function TaskList({
  label,
  tasks,
  contacts,
  onToggle,
  onRemove,
}: {
  label: string
  tasks: readonly Task[]
  contacts: { id: string; name: string }[]
  onToggle: (task: Task) => void
  onRemove: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mt-6">
      <h2 className="font-display text-[1.6rem] leading-none">{label}</h2>
      <ul>
        {tasks.map((task) => {
          const person = contacts.find((contact) => contact.id === task.contactId)
          return (
            <li key={task.id} className="flex items-center gap-1 border-b border-line">
              <button type="button" aria-label={task.done ? 'Mark open' : 'Mark done'} className="grid size-11 place-items-center" onClick={() => onToggle(task)}>
                <span className={`size-4 border ${task.done ? 'bg-tiffany border-tiffany' : 'border-cream'}`} />
              </button>
              <div className="min-w-0 flex-1 py-3">
                {person ? <Link to={`/people/${person.id}`} className="block truncate">{task.title}</Link> : <span className="block truncate">{task.title}</span>}
                <span className="text-[13px] text-cream-dim">{person?.name || 'No person'}{task.dueAt ? ` · ${dueLabel(task.dueAt)}` : ''}</span>
              </div>
              <button type="button" className="min-h-11 px-2 text-sm text-cream-dim" onClick={() => onRemove(task)}>Remove</button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
