const SECRET_NAMES = [
  'GEMINI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'XAI_API_KEY',
  'OPENROUTER_API_KEY',
  'DAWN_CODE_TOKEN',
  'DAWN_EDITOR_TOKEN',
  'DAWN_CODE_PASSWORD',
  'DAWN_CODE_CONNECTION_TOKEN',
  'DAWN_AGENTS_SECRET',
] as const;

const KEY_PATTERN = /\b(sk-[A-Za-z0-9_\-]{8,}|AIza[0-9A-Za-z\-_]{10,}|sk-or-v1-[A-Za-z0-9]+)\b/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-+/=]{6,}/gi;

function secretsFromEnv(env: Record<string, string | undefined>): string[] {
  const found: string[] = [];
  for (const name of SECRET_NAMES) {
    const value = env[name];
    if (value && value.length >= 6) found.push(value);
  }
  return found;
}

/** Strip keys, bearer tokens, and known secret env values before anything is logged or returned. */
export function redact(text: string, env: Record<string, string | undefined> = process.env): string {
  let out = text;
  const secrets = secretsFromEnv(env).sort((a, b) => b.length - a.length);
  for (const secret of secrets) {
    out = out.split(secret).join('[redacted]');
  }
  out = out.replace(BEARER_PATTERN, 'Bearer [redacted]');
  out = out.replace(KEY_PATTERN, '[redacted]');
  return out;
}
