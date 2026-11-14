import { getUser } from '@netlify/identity'

export async function requireUser() {
  const user = await getUser()
  if (!user) {
    return { user: null, error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }) }
  }
  return { user, error: null }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
