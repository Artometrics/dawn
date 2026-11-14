import type { Config, Context } from '@netlify/functions'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index'
import { profiles } from '../../db/schema'
import { birthdayInsight } from './_shared/calculators'
import { json, requireUser } from './_shared/http'

export default async (req: Request, _context: Context) => {
  const { user, error } = await requireUser()
  if (error) return error

  if (req.method === 'GET') {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user!.id)).limit(1)
    const insight = profile?.birthDate ? birthdayInsight(profile.birthDate) : birthdayInsight('')
    return json({
      profile: profile ?? {
        userId: user!.id,
        displayName: user!.name ?? user!.email?.split('@')[0] ?? null,
        birthDate: null,
        birthTime: null,
        birthPlace: null,
        timezone: null,
      },
      email: user!.email,
      insight,
    })
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = await req.json() as {
      displayName?: string
      birthDate?: string
      birthTime?: string
      birthPlace?: string
      timezone?: string
    }
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, user!.id)).limit(1)
    const values = {
      userId: user!.id,
      displayName: body.displayName ?? existing?.displayName ?? null,
      birthDate: body.birthDate ?? existing?.birthDate ?? null,
      birthTime: body.birthTime ?? existing?.birthTime ?? null,
      birthPlace: body.birthPlace ?? existing?.birthPlace ?? null,
      timezone: body.timezone ?? existing?.timezone ?? null,
      updatedAt: new Date(),
    }
    const [saved] = existing
      ? await db.update(profiles).set(values).where(eq(profiles.userId, user!.id)).returning()
      : await db.insert(profiles).values(values).returning()
    const insight = saved.birthDate ? birthdayInsight(saved.birthDate) : null
    return json({ profile: saved, insight })
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/profile',
}
