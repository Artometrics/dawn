/**
 * Turn a Firebase AI Logic failure into a sentence safe to show in the UI.
 * Never echo the raw SDK message: it can include request URLs.
 */
export function describeGeminiError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = message.toLowerCase();

  if (lower.includes('app check') || lower.includes('unauthenticated') || message.includes('401')) {
    return 'Gemini was blocked. This page has no Firebase App Check token.';
  }
  if (lower.includes('not on this host')) {
    return 'Gemini is not on this host yet.';
  }
  if (lower.includes('timeout') || lower.includes('abort')) {
    return 'Gemini took too long to answer.';
  }
  if (lower.includes('not found') || message.includes('404')) {
    return 'That Gemini model name was rejected.';
  }
  if (
    lower.includes('service_disabled') ||
    lower.includes('permission_denied') ||
    (lower.includes('api') && lower.includes('not enabled'))
  ) {
    return 'Firebase AI Logic is not enabled for this project.';
  }
  if (lower.includes('empty')) {
    return 'Gemini returned an empty reply.';
  }
  return 'Gemini did not answer.';
}
