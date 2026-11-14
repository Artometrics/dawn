import type { Activity, Contact, Deal, Note, Task } from '@/lib/types'
import { stageLabel } from '@/lib/types'
import { dueLabel } from '@/lib/time'
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'
import type { FirebaseApp } from 'firebase/app'

export function historyText(contact: Contact, notes: Note[], activities: Activity[], deals: Deal[], tasks: Task[]): string {
  const lines = [
    `Person: ${contact.name}`,
    contact.companyName ? `Company: ${contact.companyName}` : '',
    contact.email ? `Email: ${contact.email}` : '',
    contact.phone ? `Phone: ${contact.phone}` : '',
    contact.instagram ? `Instagram: @${contact.instagram}` : '',
    contact.source ? `Source: ${contact.source}` : '',
    contact.tags.length ? `Tags: ${contact.tags.join(', ')}` : '',
    '',
    'Deals:',
    ...deals.map((deal) => `- ${deal.title} · ${stageLabel(deal.stage)} · $${deal.value}`),
    '',
    'Tasks:',
    ...tasks.map((task) => `- ${task.title}${task.dueAt ? ` · ${dueLabel(task.dueAt)}` : ''}${task.done ? ' · done' : ''}`),
    '',
    'Notes:',
    ...notes.map((note) => `- ${note.body}`),
    '',
    'Activity:',
    ...activities.map((item) => `- ${item.kind}: ${item.summary}`),
  ]
  return lines.filter(Boolean).join('\n').slice(0, 12000)
}

export async function askDesk(app: FirebaseApp, history: string, mode: 'summary' | 'draft'): Promise<string> {
  const ai = getAI(app, { backend: new GoogleAIBackend() })
  const model = getGenerativeModel(ai, {
    model: 'gemini-flash-latest',
    generationConfig: {
      temperature: mode === 'draft' ? 0.6 : 0.2,
      maxOutputTokens: 700,
    },
  })
  const prompt =
    mode === 'summary'
      ? `Summarize this CRM history for Kyle at Artometrics in under 80 words. Plain sentences. No bullets of fluff. Do not invent facts.\n\n${history}`
      : `Write a short follow-up Kyle could send. Few sentences. Concrete. No subject line. This is a draft only. Do not say it was sent. Do not invent meetings or prices that are not in the history.\n\n${history}`
  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  if (!text) throw new Error('Empty draft.')
  return text
}
