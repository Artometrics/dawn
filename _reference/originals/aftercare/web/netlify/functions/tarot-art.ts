import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index'
import { cardArtCache } from '../../db/schema'

export default async (_req: Request, context: Context) => {
  const cardId = context.params?.cardId
  if (!cardId) return new Response('Missing card', { status: 400 })

  const [cached] = await db.select().from(cardArtCache).where(eq(cardArtCache.cardId, cardId)).limit(1)
  if (!cached) return new Response('Not found', { status: 404 })

  const store = getStore({ name: 'tarot-art', consistency: 'strong' })
  const data = await store.get(cached.blobKey, { type: 'arrayBuffer' })
  if (!data) return new Response('Not found', { status: 404 })

  return new Response(data, {
    headers: {
      'Content-Type': cached.mimeType || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export const config: Config = {
  path: '/api/tarot-art/:cardId',
}
