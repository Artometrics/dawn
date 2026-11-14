import assert from 'node:assert/strict';
import test from 'node:test';
import { invoicePdf } from './pdf';
import {
  EMPTY_INVOICES,
  invoiceFileName,
  invoiceTotals,
  money,
  nextInvoiceNumber,
  saveInvoice,
} from './invoice';

const now = 1_763_000_000_000;

test('numbers follow ART-year-00N and totals subtract what was paid', () => {
  assert.equal(nextInvoiceNumber([], 2026), 'ART-2026-001');
  assert.equal(nextInvoiceNumber(['ART-2026-001', 'ART-2025-009', 'ART-2026-002'], 2026), 'ART-2026-003');
  const saved = saveInvoice(
    EMPTY_INVOICES,
    {
      issuedOn: '2026-10-27',
      client: 'Thief & Co.',
      attention: 'Madison McFarland',
      contact: 'Instagram: @madisonjmcfarland',
      status: 'paid',
      taxCents: 0,
      paidCents: 6000,
      items: [
        { description: 'Instagram post package', detail: 'London on da Track', qty: 1, rateCents: 2000 },
        { description: 'Instagram post package', detail: 'Sheryl Lee Ralph', qty: 1, rateCents: 2000 },
        { description: 'Instagram post package', detail: 'Courtney LaPlante', qty: 1, rateCents: 2000 },
      ],
    },
    now,
  );
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.invoice.number, 'ART-2026-001');
  assert.equal(invoiceFileName(saved.invoice), 'Artometrics-Invoice-ART-2026-001.pdf');
  const totals = invoiceTotals(saved.invoice);
  assert.equal(totals.subtotal, 6000);
  assert.equal(totals.due, 0);
  assert.equal(money(totals.due), '$0.00');
  const next = saveInvoice(saved.data, { issuedOn: '2026-11-11', client: 'Harbor', items: [] }, now + 1);
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(next.invoice.number, 'ART-2026-002');
});

test('the pdf uses the studio layout and does not call a network', () => {
  const saved = saveInvoice(
    EMPTY_INVOICES,
    {
      issuedOn: '2026-11-11',
      client: 'Thief & Co.',
      attention: 'Madison McFarland',
      status: 'sent',
      items: [{ description: 'Instagram post package', detail: 'Luna', qty: 10, rateCents: 2000 }],
      taxCents: 0,
      paidCents: 0,
    },
    now,
  );
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const bytes = invoicePdf(saved.invoice);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /%%EOF$/);
  assert.match(text, /ARTOMETRICS/);
  assert.match(text, /ART-2026-001/);
  assert.match(text, /Thief & Co\./);
  assert.match(text, /Balance Due/);
  assert.match(text, /\$200\.00/);
  assert.match(text, /xref/);
});
