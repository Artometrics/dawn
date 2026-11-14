export const PROJECT_ID = 'newsletter-510519';
export const REGION = 'us-west1';
export const ADMIN_EMAILS = ['team@artometrics.com', 'kylesmcauliffe@gmail.com'];

export const ADDRESS_LINES = [
  'Artometrics',
  '548 Market Street, PMB 00000',
  'San Francisco, CA 94104',
  'United States',
];

export const ADDRESS_IS_PLACEHOLDER = true;

export const CONSENT_TEXT =
  'I agree to receive the Artometrics letter by email. I can unsubscribe in one click.';

export const FROM_ADDRESS =
  process.env.NEWSLETTER_FROM || 'Artometrics <newsletter@artometrics.com>';

export const REPLY_TO = 'team@artometrics.com';

export function publicBase() {
  return (process.env.PUBLIC_BASE_URL || 'https://newsletter-510519.web.app').replace(/\/$/, '');
}

export function apiBase() {
  return (
    process.env.PUBLIC_API_BASE ||
    'https://us-west1-newsletter-510519.cloudfunctions.net/api'
  ).replace(/\/$/, '');
}

export const GENERIC_SUBSCRIBE =
  'Check your inbox for a confirmation from Artometrics. The list does not include you until you confirm.';
