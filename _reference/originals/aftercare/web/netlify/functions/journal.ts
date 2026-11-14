import type { Config, Context } from '@netlify/functions'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index'
import { journalEntries } from '../../db/schema'
import { json, requireUser } from './_shared/http'

export default async (req: Request, context: Context) => {
  const { user, error } = await requireUser()
  if (error) return error

  const idParam = context.params?.id

  if (req.method === 'GET' && !idParam) {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, user!.id))
      .orderBy(desc(journalEntries.createdAt))
      .limit(100)
    return json({ entries })
  }

  if (req.method === 'GET' && idParam) {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, user!.id), eq(journalEntries.id, Number(idParam))))
      .limit(1)
    if (!entry) return json({ error: 'Not found' }, 404)
    return json({ entry })
  }

  if (req.method === 'POST') {
    const body = await req.json() as { title?: string; body: string; mood?: string; tags?: string[] }
    if (!body.body?.trim()) return json({ error: 'Body required' }, 400)
    const [entry] = await db.insert(journalEntries).values({
      userId: user!.id,
      title: body.title?.trim() || null,
      body: body.body.trim(),
      mood: body.mood || null,
      tags: body.tags || [],
    }).returning()
    return json({ entry }, 201)
  }

  if ((req.method === 'PUT' || req.method === 'PATCH') && idParam) {
    const body = await req.json() as { title?: string; body?: string; mood?: string; tags?: string[] }
    const [entry] = await db.update(journalEntries).set({
      title: body.title,
      body: body.body,
      mood: body.mood,
      tags: body.tags,
      updatedAt: new Date(),
    }).where(and(eq(journalEntries.userId, user!.id), eq(journalEntries.id, Number(idParam)))).returning()
    if (!entry) return json({ error: 'Not found' }, 404)
    return json({ entry })
  }

  if (req.method === 'DELETE' && idParam) {
    await db.delete(journalEntries).where(and(eq(journalEntries.userId, user!.id), eq(journalEntries.id, Number(idParam))))
    return json({ ok: true })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/journal', '/api/journal/:id'],
}
