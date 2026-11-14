import type { Config, Context } from '@netlify/functions'
import OpenAI from 'openai'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index'
import { profiles } from '../../db/schema'
import { birthdayInsight, moonPhaseApprox, sunSignFromDate } from './_shared/calculators'
import { json, requireUser } from './_shared/http'

export default async (req: Request, _context: Context) => {
  const { user, error } = await requireUser()
  if (error) return error

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user!.id)).limit(1)
  const moon = moonPhaseApprox()
  const sign = profile?.birthDate ? sunSignFromDate(profile.birthDate) : null
  const insight = profile?.birthDate ? birthdayInsight(profile.birthDate) : null

  let skyNote =
    `Today’s moon is ${moon.name} (~${moon.illumination}% lit). Soften your pace and notice what wants tending.`
  if (sign) {
    skyNote = `${sign} season energy meets a ${moon.name}. ${insight?.note ?? skyNote}`
  }

  if (req.method === 'POST') {
    try {
      const openai = new OpenAI()
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Aftercare. Write one short poetic sky note (2 sentences) about today’s moon and the user’s sun sign. Gentle, not predictive doom.',
          },
          {
            role: 'user',
            content: `Sun sign: ${sign || 'unknown'}. Moon: ${moon.name}. Illumination: ${moon.illumination}%.`,
          },
        ],
      })
      skyNote = completion.choices[0]?.message?.content?.trim() || skyNote
    } catch {
      // keep fallback
    }
  }

  return json({ moon, sunSign: sign, insight, skyNote })
}

export const config: Config = {
  path: '/api/sky',
}
