/** Local desk envelopes. Signed-in copies live at users/{uid}/desks/{kind}. */

export const DESK_KINDS = ['newsletter', 'invoices', 'crm'] as const;
export type DeskKind = (typeof DESK_KINDS)[number];

export const DESK_KEYS: Record<DeskKind, string> = {
  newsletter: 'dawn.desk.newsletter.v1',
  invoices: 'dawn.desk.invoices.v1',
  crm: 'dawn.desk.crm.v1',
};

/** Firestore rules reject anything larger than this. */
export const DESK_PAYLOAD_MAX = 350_000;

export type DeskEnvelope = {
  kind: DeskKind;
  payload: string;
  updatedAt: number;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function encodeDesk(kind: DeskKind, data: unknown, updatedAt: number): DeskEnvelope | null {
  const payload = JSON.stringify(data);
  if (payload.length === 0 || payload.length > DESK_PAYLOAD_MAX) return null;
  if (!(updatedAt > 1700000000000)) return null;
  return { kind, payload, updatedAt };
}

export function decodeDesk(raw: unknown, kind: DeskKind): DeskEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.kind !== kind) return null;
  if (typeof row.payload !== 'string' || row.payload.length === 0 || row.payload.length > DESK_PAYLOAD_MAX) return null;
  if (typeof row.updatedAt !== 'number' || !(row.updatedAt > 1700000000000)) return null;
  return { kind, payload: row.payload, updatedAt: row.updatedAt };
}

export function loadDesk(storage: StorageLike, kind: DeskKind): DeskEnvelope | null {
  try {
    const text = storage.getItem(DESK_KEYS[kind]);
    if (!text) return null;
    return decodeDesk(JSON.parse(text), kind);
  } catch {
    return null;
  }
}

export function saveDesk(storage: StorageLike, envelope: DeskEnvelope): { ok: true } | { ok: false; error: string } {
  try {
    storage.setItem(DESK_KEYS[envelope.kind], JSON.stringify(envelope));
    return { ok: true };
  } catch {
    return { ok: false, error: 'This phone has no room left to keep the desk.' };
  }
}

export function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
