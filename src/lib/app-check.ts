import type { FirebaseApp } from 'firebase/app';

/**
 * Firebase App Check for the hosted Dawn app.
 *
 * Gemini calls go through Firebase AI Logic, and project dawn-510519 enforces
 * App Check on that API, so every hosted request needs an App Check token.
 * The reCAPTCHA Enterprise site key is public (it ships in every page that
 * uses reCAPTCHA), so it can live in the build. Leave it empty and App Check
 * stays off, which keeps the old behaviour (chat falls back to the stand-in).
 *
 * Set it with NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY at build time, or paste
 * the key into DEFAULT_SITE_KEY below once it is registered in the console.
 */
const DEFAULT_SITE_KEY = '';

export function appCheckSiteKey(): string {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || DEFAULT_SITE_KEY).trim();
}

let started = false;

export async function startAppCheck(app: FirebaseApp): Promise<boolean> {
  if (started) return true;
  const siteKey = appCheckSiteKey();
  if (!siteKey || typeof window === 'undefined') return false;
  try {
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    started = true;
    return true;
  } catch (error) {
    console.warn('App Check did not start', error);
    return false;
  }
}
