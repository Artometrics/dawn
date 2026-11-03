import { randomBytes } from 'node:crypto';

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function isAgentId(value: string): boolean {
  return /^a_[a-f0-9]{8,}$/.test(value);
}
