export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type Health = {
  ok: boolean;
  transport: 'dry-run' | 'resend';
  gemini: 'off' | 'ready';
  address: string[];
  addressIsPlaceholder: boolean;
  consentText: string;
  projectId: string;
  region: string;
};

export function apiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '/api';
  return 'https://us-west1-newsletter-510519.cloudfunctions.net/api';
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; token?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'backend_off', 'The back end is not enabled yet.');
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const record = data as { error?: { code?: string; message?: string }; raw?: string };
    if (response.status === 404 && typeof record?.raw === 'string') {
      throw new ApiError(404, 'backend_off', 'The back end is not enabled yet.');
    }
    throw new ApiError(
      response.status,
      record?.error?.code || 'error',
      record?.error?.message || 'The desk could not finish that.',
    );
  }
  return data as T;
}

export async function probeHealth(): Promise<Health | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${apiBase()}/health`, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as Health;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
