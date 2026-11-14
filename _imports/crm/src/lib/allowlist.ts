/** Keep these in sync with firestore.rules and storage.rules. */
export const ALLOWED_EMAILS = ['team@artometrics.com', 'kylesmcauliffe@gmail.com'] as const

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return (ALLOWED_EMAILS as readonly string[]).includes(email.trim().toLowerCase())
}
