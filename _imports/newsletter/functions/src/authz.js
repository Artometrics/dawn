import { ADMIN_EMAILS } from './config.js';
import { HttpError } from './http.js';
import { authAdmin } from './store.js';

export async function requireAdmin(req) {
  const header = req.headers.authorization || '';
  const token = String(header).replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new HttpError(401, 'Sign in to the desk first.', 'auth_required');
  let decoded;
  try {
    decoded = await authAdmin.verifyIdToken(token);
  } catch {
    throw new HttpError(401, 'That sign-in has expired. Sign in again.', 'auth_invalid');
  }
  const email = String(decoded.email || '').toLowerCase();
  if (!decoded.email_verified) {
    throw new HttpError(403, 'Verify your email before using the desk.', 'email_unverified');
  }
  if (!ADMIN_EMAILS.includes(email)) {
    throw new HttpError(403, 'This account is not on the desk list.', 'not_allowlisted');
  }
  return { uid: decoded.uid, email };
}
