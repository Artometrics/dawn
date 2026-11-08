/** Studio may call the existing Firebase path only when that client is on a hosted project. Local and offline checks stay on the stand-in branch. */
export function studioSendMode(mode: string): 'provider' | 'local' {
  return mode === 'hosted' ? 'provider' : 'local';
}
