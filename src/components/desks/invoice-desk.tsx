'use client';

import { useMemo, useState } from 'react';
import {
  EMPTY_INVOICES,
  formatIssued,
  invoiceFileName,
  invoiceTotals,
  lineCents,
  money,
  nextInvoiceNumber,
  parseInvoices,
  removeInvoice,
  saveInvoice,
  statusLabel,
  STUDIO,
  type Invoice,
  type InvoiceData,
  type InvoiceStatus,
} from '@/lib/invoices/invoice';
import { invoicePdf } from '@/lib/invoices/pdf';
import './desks.css';
import { useDeskStore } from './use-desk-store';

type DraftItem = { key: string; description: string; detail: string; qty: string; rate: string };

type Draft = {
  id?: string;
  number: string;
  issuedOn: string;
  client: string;
  attention: string;
  contact: string;
  tax: string;
  paid: string;
  status: InvoiceStatus;
  note: string;
  items: DraftItem[];
};

export function InvoiceDesk() {
  const desk = useDeskStore('invoices', parseInvoices, EMPTY_INVOICES);
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const active = selected ?? desk.value.invoices[0]?.id ?? 'new';
  const current = desk.value.invoices.find((invoice) => invoice.id === active) ?? null;
  const draftKey = current?.id ?? 'new';
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  return (
    <div className="desk">
      {message || desk.note ? <p className="dw-alert" role="status">{message || desk.note}</p> : null}
      <div className="desk-no-print">
        <ul className="dw-list">
          <li>
            <button type="button" className="dw-row" aria-pressed={active === 'new'} onClick={() => setSelected('new')}>
              <span>New invoice</span>
              <small className="dw-note">{nextInvoiceNumber(desk.value.invoices.map((invoice) => invoice.number), new Date().getFullYear())}</small>
            </button>
          </li>
          {desk.value.invoices.map((invoice) => (
            <li key={invoice.id}>
              <button type="button" className="dw-row" aria-pressed={active === invoice.id} onClick={() => setSelected(invoice.id)}>
                <span>{invoice.number}</span>
                <small className="dw-note">{invoice.client} · {money(invoiceTotals(invoice).due)}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Editor
        key={draftKey}
        data={desk.value}
        invoice={current}
        onSaved={(invoice) => {
          setSelected(invoice.id);
          setMessage(`${invoice.number} saved.`);
        }}
        onChange={desk.replace}
        onNote={setMessage}
      />
    </div>
  );
}

function Editor({
  data,
  invoice,
  onChange,
  onSaved,
  onNote,
}: {
  data: InvoiceData;
  invoice: Invoice | null;
  onChange: (next: InvoiceData) => void;
  onSaved: (invoice: Invoice) => void;
  onNote: (note: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => invoice ? fromInvoice(invoice) : blankDraft(data));
  const preview = useMemo(() => toPreview(draft), [draft]);

  function save() {
    const result = saveInvoice(data, toInput(draft), Date.now());
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    onSaved(result.invoice);
  }

  function download() {
    if (!preview) return;
    const bytes = invoicePdf(preview);
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = invoiceFileName(preview);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dw-form">
      {preview ? <Sheet invoice={preview} /> : <p className="dw-note">Add a client to see the sheet.</p>}
      <form
        className="dw-form dw-card desk-no-print"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h2 className="dw-card-title">{draft.number}</h2>
        <label className="dw-label">Client<input className="dw-field" value={draft.client} onChange={(event) => setDraft({ ...draft, client: event.target.value })} required /></label>
        <label className="dw-label">Attention<input className="dw-field" value={draft.attention} onChange={(event) => setDraft({ ...draft, attention: event.target.value })} /></label>
        <label className="dw-label">Contact line<input className="dw-field" value={draft.contact} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} /></label>
        <label className="dw-label">Date<input className="dw-field" type="date" value={draft.issuedOn} onChange={(event) => setDraft({ ...draft, issuedOn: event.target.value })} required /></label>
        <label className="dw-label">
          Status
          <select className="dw-field" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as InvoiceStatus })}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        {draft.items.map((item, index) => (
          <fieldset key={item.key} className="dw-form">
            <legend className="dw-note">Line {index + 1}</legend>
            <label className="dw-label">Description<input className="dw-field" value={item.description} onChange={(event) => patchItem(setDraft, index, { description: event.target.value })} /></label>
            <label className="dw-label">Detail<input className="dw-field" value={item.detail} onChange={(event) => patchItem(setDraft, index, { detail: event.target.value })} /></label>
            <label className="dw-label">Qty<input className="dw-field" inputMode="decimal" value={item.qty} onChange={(event) => patchItem(setDraft, index, { qty: event.target.value })} /></label>
            <label className="dw-label">Rate<input className="dw-field" inputMode="decimal" value={item.rate} onChange={(event) => patchItem(setDraft, index, { rate: event.target.value })} /></label>
          </fieldset>
        ))}
        <button
          type="button"
          className="dw-btn dw-btn--ghost"
          onClick={() => setDraft({ ...draft, items: [...draft.items, blankItem(`line-${draft.items.length + 1}`)] })}
        >
          Add line
        </button>
        <label className="dw-label">Tax<input className="dw-field" inputMode="decimal" value={draft.tax} onChange={(event) => setDraft({ ...draft, tax: event.target.value })} /></label>
        <label className="dw-label">Payment received<input className="dw-field" inputMode="decimal" value={draft.paid} onChange={(event) => setDraft({ ...draft, paid: event.target.value })} /></label>
        <label className="dw-label">Note<textarea className="dw-field" rows={2} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
        <div className="dw-actions">
          <button type="submit" className="dw-btn dw-btn--primary">Save invoice</button>
          <button type="button" className="dw-btn" disabled={!preview} onClick={download}>Download PDF</button>
          <button type="button" className="dw-btn" onClick={() => window.print()}>Print</button>
          {draft.id ? (
            <button
              type="button"
              className="dw-btn dw-btn--danger"
              onClick={() => {
                onChange(removeInvoice(data, draft.id || ''));
                onNote('Removed.');
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export function Sheet({ invoice }: { invoice: Invoice }) {
  const totals = invoiceTotals(invoice);
  return (
    <article className="invoice-sheet" aria-label={`${invoice.number} preview`}>
      <div className="invoice-sheet-inner">
        <header className="invoice-brand">
          <div>
            <strong>{STUDIO.name}</strong>
            <p>{STUDIO.line}</p>
            <p>{STUDIO.email}</p>
          </div>
          <div>
            <p className="invoice-kicker">{invoice.status === 'paid' ? 'INVOICE / RECEIPT' : 'INVOICE'}</p>
            <dl className="invoice-meta">
              <dt>Invoice No.</dt>
              <dd>{invoice.number}</dd>
              <dt>Invoice Date</dt>
              <dd>{formatIssued(invoice.issuedOn)}</dd>
              <dt>Status</dt>
              <dd className={invoice.status === 'paid' ? 'is-paid' : undefined}>{statusLabel(invoice.status)}</dd>
            </dl>
          </div>
        </header>
        <section className="invoice-party">
          <p className="eyebrow">BILL TO</p>
          <strong>{invoice.client}</strong>
          {invoice.attention ? <p>Attn: {invoice.attention}</p> : null}
          {invoice.contact ? <p>{invoice.contact}</p> : null}
        </section>
        <div>
          {invoice.items.map((item, index) => (
            <div key={item.id} className="invoice-item">
              <div>
                <strong>{index + 1}. {item.description}</strong>
                {item.detail ? <small>{item.detail}</small> : null}
              </div>
              <div className="invoice-nums">
                <div>{trimQty(item.qty)} × {money(item.rateCents)}</div>
                <strong>{money(lineCents(item))}</strong>
              </div>
            </div>
          ))}
        </div>
        {invoice.note ? <p className="invoice-foot">{invoice.note}</p> : null}
        <div className="invoice-totals">
          <span>Subtotal</span><span>{money(totals.subtotal)}</span>
          <span>Tax</span><span>{money(totals.tax)}</span>
          <span>Total</span><span>{money(totals.total)}</span>
          {totals.paid > 0 ? (
            <>
              <span>Payment received</span>
              <span>{`-${money(totals.paid)}`}</span>
            </>
          ) : null}
          <span className="due">Balance Due</span>
          <span className="due">{money(totals.due)}</span>
        </div>
        {invoice.status === 'paid' ? <p className="invoice-stamp">PAID</p> : null}
        <footer className="invoice-foot">
          <span>Thank you for your business.</span>
          <span>{invoice.number}</span>
        </footer>
      </div>
    </article>
  );
}

function blankDraft(data: InvoiceData): Draft {
  const today = new Date();
  const issuedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    number: nextInvoiceNumber(data.invoices.map((invoice) => invoice.number), today.getFullYear()),
    issuedOn,
    client: '',
    attention: '',
    contact: '',
    tax: '0',
    paid: '0',
    status: 'draft',
    note: '',
    items: [blankItem('line-1')],
  };
}

function fromInvoice(invoice: Invoice): Draft {
  return {
    id: invoice.id,
    number: invoice.number,
    issuedOn: invoice.issuedOn,
    client: invoice.client,
    attention: invoice.attention,
    contact: invoice.contact,
    tax: (invoice.taxCents / 100).toFixed(2),
    paid: (invoice.paidCents / 100).toFixed(2),
    status: invoice.status,
    note: invoice.note,
    items: invoice.items.length
      ? invoice.items.map((item) => ({
          key: item.id,
          description: item.description,
          detail: item.detail,
          qty: trimQty(item.qty),
          rate: (item.rateCents / 100).toFixed(2),
        }))
      : [blankItem('line-1')],
  };
}

function blankItem(key: string): DraftItem {
  return { key, description: '', detail: '', qty: '1', rate: '' };
}

function patchItem(setDraft: (value: Draft | ((current: Draft) => Draft)) => void, index: number, patch: Partial<DraftItem>) {
  setDraft((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
  }));
}

function dollars(value: string): number {
  const amount = Number(value.replace(/[$,\s]/g, ''));
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

function toInput(draft: Draft) {
  return {
    id: draft.id,
    number: draft.number,
    issuedOn: draft.issuedOn,
    client: draft.client,
    attention: draft.attention,
    contact: draft.contact,
    taxCents: dollars(draft.tax),
    paidCents: dollars(draft.paid),
    status: draft.status,
    note: draft.note,
    items: draft.items.map((item) => ({
      id: item.key.startsWith('new-') ? undefined : item.key,
      description: item.description,
      detail: item.detail,
      qty: Number(item.qty) || 0,
      rateCents: dollars(item.rate),
    })),
  };
}

function toPreview(draft: Draft): Invoice | null {
  if (!draft.client.trim()) return null;
  const saved = saveInvoice(EMPTY_INVOICES, { ...toInput(draft), id: undefined, number: draft.number }, Date.now());
  if (!saved.ok) return null;
  return { ...saved.invoice, id: draft.id || saved.invoice.id, number: draft.number };
}

function trimQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return String(qty);
}
