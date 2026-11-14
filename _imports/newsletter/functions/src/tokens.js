import { createHash, randomBytes } from 'node:crypto';

export function newToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function subscriberId(email) {
  return hashToken(String(email).trim().toLowerCase());
}
