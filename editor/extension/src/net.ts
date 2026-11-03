export type GatewayEvent = { event: string; data: Record<string, unknown> };

export function gatewayHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
}

export async function postJson<T>(base: string, token: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: gatewayHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: T | { error?: string };
  try {
    parsed = text ? JSON.parse(text) as T : ({} as T);
  } catch {
    throw new Error(response.ok ? 'The gateway returned an unreadable response.' : `Gateway returned ${response.status}.`);
  }
  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
      ? parsed.error
      : `Gateway returned ${response.status}.`;
    throw new Error(message);
  }
  return parsed as T;
}

export async function postSse(
  base: string,
  token: string,
  path: string,
  body: unknown,
  onEvent: (event: GatewayEvent) => void,
): Promise<void> {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: gatewayHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    let message = `Gateway returned ${response.status}.`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new Error(message);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const event = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.+)$/m)?.[1];
      if (!event || !data) continue;
      onEvent({ event, data: JSON.parse(data) as Record<string, unknown> });
    }
  }
}
