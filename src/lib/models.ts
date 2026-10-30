/** OpenRouter id that replaces the retired x-ai/grok-2-1212 model. */
export const GROK_MODEL = 'x-ai/grok-4.7';

export const GEMINI_FAST = 'gemini-3.8-flash';
export const GEMINI_PRO = 'gemini-3.1-pro-preview';

/**
 * Map retired gateway ids onto models that still exist.
 * Grok 2 (x-ai/grok-2-1212) was removed from OpenRouter.
 */
export function remapModelId(requested = GEMINI_FAST): string {
  const trimmed = requested.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('grok-2')) return GROK_MODEL;

  if (
    lower.includes('gemini-2') ||
    lower.includes('gemini-flash') ||
    lower === 'gemini' ||
    lower === 'flash'
  ) {
    return GEMINI_FAST;
  }

  if (lower.includes('gemini-1.5') || lower.includes('gemini-pro') || lower === 'pro') {
    return GEMINI_PRO;
  }

  return trimmed;
}
