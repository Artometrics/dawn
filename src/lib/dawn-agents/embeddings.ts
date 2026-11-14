/** Model embeddings stay off unless both the gateway flag and the owner setting are on. */
export function embeddingsOn(
  env: Record<string, string | undefined>,
  settings: { embeddingsEnabled?: boolean },
): boolean {
  return env.DAWN_EMBEDDINGS_ENABLED === 'true' && settings.embeddingsEnabled === true;
}
