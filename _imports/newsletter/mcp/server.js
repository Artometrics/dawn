import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const base = (process.env.NEWSLETTER_API_BASE || 'http://127.0.0.1:5291/api').replace(/\/$/, '');
const token = process.env.NEWSLETTER_ID_TOKEN || '';

async function call(path, { method = 'GET', body } = {}) {
  if (!token) {
    throw new Error('Set NEWSLETTER_ID_TOKEN to a Firebase ID token for an allowlisted desk account.');
  }
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || `The desk returned ${response.status}.`;
    throw new Error(message);
  }
  return data;
}

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

const server = new McpServer({
  name: 'artometrics-newsletter',
  version: '1.0.0',
});

server.registerTool(
  'subscriber_count',
  {
    title: 'Subscriber count',
    description: 'Count Artometrics subscribers. Optional status: pending, confirmed, unsubscribed, or all.',
    inputSchema: {
      status: z.enum(['pending', 'confirmed', 'unsubscribed', 'all']).optional(),
    },
  },
  async ({ status }) => {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return textResult(await call(`/subscribers/count${query}`));
  },
);

server.registerTool(
  'draft_issue',
  {
    title: 'Draft issue',
    description: 'Draft a letter from pasted notes or a public URL. Set save true to store it as a draft issue.',
    inputSchema: {
      notes: z.string().optional(),
      url: z.string().optional(),
      save: z.boolean().optional(),
    },
  },
  async ({ notes, url, save }) => textResult(await call('/draft', { method: 'POST', body: { notes, url, save } })),
);

server.registerTool(
  'schedule_issue',
  {
    title: 'Schedule issue',
    description: 'Schedule a draft letter. scheduledAt is an ISO date-time.',
    inputSchema: {
      issueId: z.string(),
      scheduledAt: z.string(),
    },
  },
  async ({ issueId, scheduledAt }) =>
    textResult(await call(`/issues/${encodeURIComponent(issueId)}/schedule`, { method: 'POST', body: { scheduledAt } })),
);

server.registerTool(
  'send_issue',
  {
    title: 'Send issue',
    description: 'Send a letter to confirmed subscribers. With no Resend key this writes a dry-run log and does not mail anyone.',
    inputSchema: {
      issueId: z.string(),
    },
  },
  async ({ issueId }) => textResult(await call(`/issues/${encodeURIComponent(issueId)}/send`, { method: 'POST' })),
);

server.registerTool(
  'get_stats',
  {
    title: 'Get stats',
    description: 'Open, click, and list counts. Pass issueId for one letter.',
    inputSchema: {
      issueId: z.string().optional(),
    },
  },
  async ({ issueId }) => {
    const path = issueId ? `/stats/${encodeURIComponent(issueId)}` : '/stats';
    return textResult(await call(path));
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
