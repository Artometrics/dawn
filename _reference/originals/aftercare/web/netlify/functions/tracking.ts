import type { Config, Context } from '@netlify/functions'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/index'
import { trackingLogs } from '../../db/schema'
import { json, requireUser } from './_shared/http'

export default async (req: Request, _context: Context) => {
  const { user, error } = await requireUser()
  if (error) return error

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const rows = await db
      .select()
      .from(trackingLogs)
      .where(eq(trackingLogs.userId, user!.id))
      .orderBy(desc(trackingLogs.loggedOn))
      .limit(120)
    return json({ logs: type ? rows.filter((r) => r.type === type) : rows })
  }

  if (req.method === 'POST') {
    const body = await req.json() as {
      type: string
      value?: number
      label?: string
      notes?: string
      loggedOn?: string
    }
    if (!body.type) return json({ error: 'Type required' }, 400)
    const [log] = await db.insert(trackingLogs).values({
      userId: user!.id,
      type: body.type,
      value: body.value ?? null,
      label: body.label ?? null,
      notes: body.notes ?? null,
      loggedOn: body.loggedOn || new Date().toISOString().slice(0, 10),
    }).returning()
    return json({ log }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/tracking',
}
