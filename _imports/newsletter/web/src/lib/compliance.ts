export const ADMIN_EMAILS = ['team@artometrics.com', 'kylesmcauliffe@gmail.com'];

export const ADDRESS_LINES = [
  'Artometrics',
  '548 Market Street, PMB 00000',
  'San Francisco, CA 94104',
  'United States',
];

export const CONSENT_TEXT =
  'I agree to receive the Artometrics letter by email. I can unsubscribe in one click.';

export const PROJECT_ID = 'newsletter-510519';
export const REGION = 'us-west1';

export function isAllowlisted(email?: string | null) {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}
