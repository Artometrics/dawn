import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { desc, eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import { db } from '../../db/index'
import { cardArtCache, tarotPulls, type TarotPullCard } from '../../db/schema'
import { drawSpread, type SpreadType } from './_shared/tarot'
import { json, requireUser } from './_shared/http'

async function getOrCreateCardArt(cardId: string, name: string, artPrompt: string) {
  const [cached] = await db.select().from(cardArtCache).where(eq(cardArtCache.cardId, cardId)).limit(1)
  const store = getStore({ name: 'tarot-art', consistency: 'strong' })

  if (cached) {
    const data = await store.get(cached.blobKey, { type: 'arrayBuffer' })
    if (data) {
      return { blobKey: cached.blobKey, url: `/api/tarot-art/${cardId}` }
    }
  }

  try {
    const ai = new GoogleGenAI({})
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `${artPrompt}. Vertical tarot card composition, ornate soft border, no text, no watermark, Aftercare soft pink aesthetic.`,
    })
    const imagePart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)
    if (!imagePart?.inlineData?.data) {
      return { blobKey: null, url: null }
    }
    const mimeType = imagePart.inlineData.mimeType || 'image/png'
    const bytes = Buffer.from(imagePart.inlineData.data, 'base64')
    const blobKey = `card/${cardId}.png`
    await store.set(blobKey, bytes, { metadata: { contentType: mimeType, cardName: name } })
    if (cached) {
      await db.update(cardArtCache).set({ blobKey, mimeType }).where(eq(cardArtCache.cardId, cardId))
    } else {
      await db.insert(cardArtCache).values({ cardId, blobKey, mimeType })
    }
    return { blobKey, url: `/api/tarot-art/${cardId}` }
  } catch {
    return { blobKey: null, url: null }
  }
}

async function interpretPull(
  question: string | undefined,
  cards: { name: string; reversed: boolean; position: string; upright: string; reversedMeaning: string }[],
) {
  try {
    const openai = new OpenAI()
    const cardLines = cards
      .map((c) => `${c.position}: ${c.name}${c.reversed ? ' (reversed)' : ''} — ${c.reversed ? c.reversedMeaning : c.upright}`)
      .join('\n')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are Aftercare, a gentle tarot guide. Write warm, reflective interpretations in 2 short paragraphs. No fear-mongering. Soft, intimate tone.',
        },
        {
          role: 'user',
          content: `Question: ${question || 'What soft guidance do I need today?'}\n\nCards:\n${cardLines}`,
        },
      ],
    })
    return completion.choices[0]?.message?.content?.trim() || 'Sit with these cards and notice what softens in you.'
  } catch {
    return cards
      .map((c) => `${c.position}: ${c.name}${c.reversed ? ' reversed' : ''} invites ${c.reversed ? c.reversedMeaning : c.upright}.`)
      .join(' ')
  }
}

export default async (req: Request, _context: Context) => {
  const { user, error } = await requireUser()
  if (error) return error

  if (req.method === 'GET') {
    const pulls = await db
      .select()
      .from(tarotPulls)
      .where(eq(tarotPulls.userId, user!.id))
      .orderBy(desc(tarotPulls.createdAt))
      .limit(30)
    return json({ pulls })
  }

  if (req.method === 'POST') {
    const body = await req.json() as { spreadType?: SpreadType; question?: string; withArt?: boolean }
    const spreadType: SpreadType = body.spreadType === 'three' ? 'three' : 'single'
    const drawn = drawSpread(spreadType)

    const cards: TarotPullCard[] = []
    for (const item of drawn) {
      let imageUrl: string | null = null
      if (body.withArt !== false) {
        const art = await getOrCreateCardArt(item.card.id, item.card.name, item.card.artPrompt)
        imageUrl = art.url
      }
      cards.push({
        cardId: item.card.id,
        name: item.card.name,
        reversed: item.reversed,
        position: item.position,
        imageUrl,
      })
    }

    const interpretation = await interpretPull(
      body.question,
      drawn.map((d) => ({
        name: d.card.name,
        reversed: d.reversed,
        position: d.position,
        upright: d.card.upright,
        reversedMeaning: d.card.reversed,
      })),
    )

    const [pull] = await db.insert(tarotPulls).values({
      userId: user!.id,
      spreadType,
      cards,
      interpretation,
      question: body.question || null,
    }).returning()

    return json({ pull }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: '/api/tarot',
}
