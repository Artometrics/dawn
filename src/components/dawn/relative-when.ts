/** Muted relative dates in the same grain as a phone chat list. */
export function relativeWhen(timestamp: number, now = Date.now()): string {
  if (!Number.isFinite(timestamp)) return '';
  const delta = Math.max(0, now - timestamp);
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(delta / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months <= 1 ? 'last month' : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years <= 1 ? 'last year' : `${years} years ago`;
}
