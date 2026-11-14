export const STUDIO = {
  name: 'ARTOMETRICS',
  line: 'Kyle McAuliffe Studio',
  email: 'team@artometrics.com',
};

export const INVOICE_CAP = 400;

const NUMBER = /^ART-(\d{4})-(\d{3})$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export type LineItem = {
  id: string;
  description: string;
  detail: string;
  qty: number;
  rateCents: number;
};

export type Invoice = {
  id: string;
  number: string;
  issuedOn: string;
  client: string;
  attention: string;
  contact: string;
  items: LineItem[];
  taxCents: number;
  paidCents: number;
  status: InvoiceStatus;
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type InvoiceData = { invoices: Invoice[] };

export const EMPTY_INVOICES: InvoiceData = { invoices: [] };

export type Ok<T> = { ok: true; data: InvoiceData } & T;
export type Err = { ok: false; error: string; data: InvoiceData };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rem = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${rem}`;
}

export function formatIssued(issuedOn: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issuedOn);
  if (!match) return issuedOn;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return issuedOn;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function statusLabel(status: InvoiceStatus): string {
  if (status === 'paid') return 'PAID';
  if (status === 'sent') return 'SENT';
  return 'DRAFT';
}

export function lineCents(item: Pick<LineItem, 'qty' | 'rateCents'>): number {
  const qty = Number.isFinite(item.qty) ? item.qty : 0;
  const rate = Number.isFinite(item.rateCents) ? item.rateCents : 0;
  return Math.round(qty * rate);
}

export function invoiceTotals(invoice: Pick<Invoice, 'items' | 'taxCents' | 'paidCents'>) {
  const subtotal = invoice.items.reduce((sum, item) => sum + lineCents(item), 0);
  const tax = Math.max(0, Math.round(invoice.taxCents));
  const paid = Math.max(0, Math.round(invoice.paidCents));
  const total = subtotal + tax;
  const due = Math.max(0, total - paid);
  return { subtotal, tax, paid, total, due };
}

/** Next ART-YYYY-00N number. The sequence is per year and zero-padded to three digits. */
export function nextInvoiceNumber(numbers: string[], year: number): string {
  const pattern = new RegExp(`^ART-${year}-(\\d{3})$`);
  let max = 0;
  for (const number of numbers) {
    const match = pattern.exec(number);
    if (match) max = Math.max(max, Number(match[1]));
  }
  const next = Math.min(max + 1, 999);
  return `ART-${year}-${String(next).padStart(3, '0')}`;
}

export function invoiceFileName(invoice: Pick<Invoice, 'number'>): string {
  return `Artometrics-Invoice-${invoice.number}.pdf`;
}

function nid(prefix: string): string {
  const buf = crypto.getRandomValues(new Uint8Array(8));
  let hex = '';
  for (const byte of buf) hex += byte.toString(16).padStart(2, '0');
  return `${prefix}_${hex}`;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export type InvoiceInput = {
  id?: string;
  number?: string;
  issuedOn: string;
  client: string;
  attention?: string;
  contact?: string;
  items: Array<{ id?: string; description: string; detail?: string; qty: number; rateCents: number }>;
  taxCents?: number;
  paidCents?: number;
  status?: InvoiceStatus;
  note?: string;
};

export function saveInvoice(data: InvoiceData, input: InvoiceInput, now: number): Ok<{ invoice: Invoice }> | Err {
  const client = clip(input.client, 80);
  if (!client) return { ok: false, error: 'The invoice needs a client.', data };
  if (!DAY.test(input.issuedOn)) return { ok: false, error: 'Use a date like 2026-11-11.', data };
  const existing = input.id ? data.invoices.find((invoice) => invoice.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, error: 'That invoice is not on the desk.', data };
  if (!existing && data.invoices.length >= INVOICE_CAP) return { ok: false, error: 'The invoice list is full.', data };
  const year = Number(input.issuedOn.slice(0, 4));
  const number = existing?.number ?? (input.number && NUMBER.test(input.number) ? input.number : nextInvoiceNumber(data.invoices.map((invoice) => invoice.number), year));
  if (!NUMBER.test(number)) return { ok: false, error: 'Invoice numbers look like ART-2026-001.', data };
  if (data.invoices.some((invoice) => invoice.number === number && invoice.id !== existing?.id)) {
    return { ok: false, error: `${number} is already used.`, data };
  }
  const items: LineItem[] = [];
  for (const item of input.items.slice(0, 40)) {
    const description = clip(item.description, 160);
    if (!description) continue;
    const qty = Number.isFinite(item.qty) ? Math.min(9999, Math.max(0, item.qty)) : 0;
    const rateCents = Number.isFinite(item.rateCents) ? Math.min(10_000_000_00, Math.max(0, Math.round(item.rateCents))) : 0;
    items.push({
      id: item.id && item.id.length > 4 ? item.id : nid('li'),
      description,
      detail: clip(item.detail || '', 180),
      qty,
      rateCents,
    });
  }
  const status: InvoiceStatus = input.status === 'paid' || input.status === 'sent' || input.status === 'draft' ? input.status : existing?.status ?? 'draft';
  const invoice: Invoice = {
    id: existing?.id ?? nid('inv'),
    number,
    issuedOn: input.issuedOn,
    client,
    attention: clip(input.attention || '', 80),
    contact: clip(input.contact || '', 160),
    items,
    taxCents: Math.max(0, Math.round(input.taxCents ?? 0)),
    paidCents: Math.max(0, Math.round(input.paidCents ?? 0)),
    status,
    note: clip(input.note || '', 240),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const invoices = existing
    ? data.invoices.map((row) => (row.id === invoice.id ? invoice : row))
    : [invoice, ...data.invoices];
  return { ok: true, data: { invoices }, invoice };
}

export function removeInvoice(data: InvoiceData, id: string): InvoiceData {
  return { invoices: data.invoices.filter((invoice) => invoice.id !== id) };
}

function isStatus(value: unknown): value is InvoiceStatus {
  return value === 'draft' || value === 'sent' || value === 'paid';
}

export function parseInvoices(raw: unknown): InvoiceData {
  if (!raw || typeof raw !== 'object') return EMPTY_INVOICES;
  const list = (raw as { invoices?: unknown }).invoices;
  if (!Array.isArray(list)) return EMPTY_INVOICES;
  const invoices: Invoice[] = [];
  for (const item of list) {
    const invoice = parseInvoice(item);
    if (invoice) invoices.push(invoice);
    if (invoices.length >= INVOICE_CAP) break;
  }
  return { invoices };
}

function parseInvoice(raw: unknown): Invoice | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.number !== 'string' || !NUMBER.test(row.number)) return null;
  if (typeof row.client !== 'string' || !row.client.trim()) return null;
  if (typeof row.issuedOn !== 'string' || !DAY.test(row.issuedOn)) return null;
  const items: LineItem[] = [];
  if (Array.isArray(row.items)) {
    for (const item of row.items) {
      if (!item || typeof item !== 'object') continue;
      const line = item as Record<string, unknown>;
      if (typeof line.description !== 'string' || !line.description.trim()) continue;
      items.push({
        id: typeof line.id === 'string' ? line.id : nid('li'),
        description: line.description.slice(0, 160),
        detail: typeof line.detail === 'string' ? line.detail.slice(0, 180) : '',
        qty: typeof line.qty === 'number' ? line.qty : 0,
        rateCents: typeof line.rateCents === 'number' ? Math.round(line.rateCents) : 0,
      });
    }
  }
  return {
    id: row.id,
    number: row.number,
    issuedOn: row.issuedOn,
    client: row.client.slice(0, 80),
    attention: typeof row.attention === 'string' ? row.attention.slice(0, 80) : '',
    contact: typeof row.contact === 'string' ? row.contact.slice(0, 160) : '',
    items,
    taxCents: typeof row.taxCents === 'number' ? Math.max(0, Math.round(row.taxCents)) : 0,
    paidCents: typeof row.paidCents === 'number' ? Math.max(0, Math.round(row.paidCents)) : 0,
    status: isStatus(row.status) ? row.status : 'draft',
    note: typeof row.note === 'string' ? row.note.slice(0, 240) : '',
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : 0,
  };
}
