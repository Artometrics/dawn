import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWhen(value: unknown) {
  if (!value) return '';
  const withDate = value as { toDate?: () => Date; seconds?: number };
  const date = typeof withDate.toDate === 'function'
    ? withDate.toDate()
    : typeof withDate.seconds === 'number'
      ? new Date(withDate.seconds * 1000)
      : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(date);
}

export const ZERO_STATS = {
  recipients: 0,
  sent: 0,
  failed: 0,
  opens: 0,
  uniqueOpens: 0,
  clicks: 0,
  uniqueClicks: 0,
  unsubscribes: 0,
};
