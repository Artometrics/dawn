const PATTERNS: RegExp[] = [
  /sk-or-v1-[a-zA-Z0-9_-]{8,}/g,
  /sk-[a-zA-Z0-9_-]{16,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /xai-[a-zA-Z0-9_-]{8,}/gi,
  /Bearer\s+[a-zA-Z0-9._\-]{8,}/gi,
  /\b(api[_-]?key|secret|token|password|passwd)\b\s*[:=]\s*\S+/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
];

export function secretValuesFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const names = [
    'GEMINI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'OPENROUTER_API_KEY',
    'XAI_API_KEY',
    'DAWN_WORKER_TOKEN',
    'DAWN_EDITOR_TOKEN',
    'DAWN_AGENTS_SECRET',
    'DAWN_OWNER_PASSWORD',
  ];
  return names.map((name) => env[name]?.trim() ?? '').filter((value) => value.length >= 8);
}

/** Replace known secret values and obvious key shapes. Does not log what it removed. */
export function scrubText(text: string, secrets: string[] = []): string {
  let out = String(text ?? '');
  const unique = [...new Set(secrets.filter((secret) => secret && secret.length >= 8))];
  unique.sort((a, b) => b.length - a.length);
  for (const secret of unique) out = out.split(secret).join('[redacted]');
  for (const pattern of PATTERNS) out = out.replace(pattern, '[redacted]');
  return out;
}

export function clipText(text: string, max = 20_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[truncated]`;
}
