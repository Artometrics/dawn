import {
  STUDIO,
  formatIssued,
  invoiceTotals,
  lineCents,
  money,
  statusLabel,
  type Invoice,
} from './invoice';

const PAGE_W = 612;
const PAGE_H = 792;
const M = 60;

/** Letter-size PDF in the retired script's layout: green rules, studio name, bill-to, line table, totals. */
export function invoicePdf(invoice: Invoice): Uint8Array {
  const stream = renderStream(invoice);
  return encodePdf(stream, invoice);
}

function renderStream(invoice: Invoice): string {
  const totals = invoiceTotals(invoice);
  const ops: string[] = [];
  const acc = rgb('#1F6F5C');
  const grey = rgb('#6B6B6B');
  const black = rgb('#111111');
  const white = rgb('#FFFFFF');
  const light = rgb('#E6E6E6');
  const right = PAGE_W - M;

  ops.push(`${acc} rg 0 ${PAGE_H - 8} ${PAGE_W} 8 re f`);
  ops.push(text('F2', 22, M, PAGE_H - 70, STUDIO.name, black));
  ops.push(text('F1', 10, M, PAGE_H - 88, STUDIO.line, grey));
  ops.push(text('F1', 10, M, PAGE_H - 102, STUDIO.email, grey));
  const heading = invoice.status === 'paid' ? 'INVOICE / RECEIPT' : 'INVOICE';
  ops.push(textRight('F2', 16, right, PAGE_H - 70, heading, black));

  const meta: Array<[string, string, boolean]> = [
    ['Invoice No.', invoice.number, false],
    ['Invoice Date', formatIssued(invoice.issuedOn), false],
    ['Status', statusLabel(invoice.status), invoice.status === 'paid'],
  ];
  let y = PAGE_H - 90;
  for (const [label, value, accent] of meta) {
    ops.push(textRight('F1', 10, right - 108, y, label, grey));
    ops.push(textRight(accent ? 'F2' : 'F1', 10, right, y, value, accent ? acc : black));
    y -= 14;
  }
  ops.push(`${light} RG 1 w ${M} ${PAGE_H - 140} m ${right} ${PAGE_H - 140} l S`);

  ops.push(text('F2', 9, M, PAGE_H - 165, 'BILL TO', acc));
  ops.push(text('F2', 13, M, PAGE_H - 183, invoice.client, black));
  if (invoice.attention) ops.push(text('F1', 10, M, PAGE_H - 198, `Attn: ${invoice.attention}`, black));
  if (invoice.contact) ops.push(text('F1', 10, M, PAGE_H - 212, invoice.contact, grey));

  let rowY = PAGE_H - 258;
  ops.push(`${black} rg ${M} ${rowY - 6} ${PAGE_W - 2 * M} 22 re f`);
  ops.push(text('F2', 9, M + 10, rowY + 2, '#', white));
  ops.push(text('F2', 9, M + 30, rowY + 2, 'DESCRIPTION', white));
  ops.push(textRight('F2', 9, right - 120, rowY + 2, 'QTY', white));
  ops.push(textRight('F2', 9, right - 60, rowY + 2, 'RATE', white));
  ops.push(textRight('F2', 9, right - 10, rowY + 2, 'AMOUNT', white));

  rowY -= 28;
  const shown = invoice.items.slice(0, 12);
  shown.forEach((item, index) => {
    if (rowY < 200) return;
    const amount = lineCents(item);
    ops.push(text('F1', 10, M + 10, rowY, String(index + 1), black));
    ops.push(text('F2', 10, M + 30, rowY, clip(item.description, 42), black));
    if (item.detail) ops.push(text('F1', 8, M + 30, rowY - 12, clip(item.detail, 64), grey));
    ops.push(textRight('F1', 10, right - 120, rowY, trimQty(item.qty), black));
    ops.push(textRight('F1', 10, right - 60, rowY, money(item.rateCents), black));
    ops.push(textRight('F1', 10, right - 10, rowY, money(amount), black));
    const lineY = item.detail ? rowY - 22 : rowY - 10;
    ops.push(`${light} RG 0.8 w ${M} ${lineY} m ${right} ${lineY} l S`);
    rowY = item.detail ? rowY - 36 : rowY - 24;
  });
  if (invoice.items.length > shown.length) {
    ops.push(text('F3', 8, M + 10, rowY, `+ ${invoice.items.length - shown.length} more on the desk`, grey));
    rowY -= 16;
  } else if (invoice.note) {
    ops.push(text('F3', 8, M + 10, rowY, clip(invoice.note, 90), grey));
    rowY -= 18;
  }

  const x1 = right - 170;
  y = Math.min(rowY - 10, PAGE_H - 260);
  if (y > 220) y = Math.min(y, rowY - 8);
  const line = (label: string, value: string, bold = false, color = black) => {
    ops.push(text(bold ? 'F2' : 'F1', bold ? 12 : 10, x1, y, label, bold ? color : grey));
    ops.push(textRight(bold ? 'F2' : 'F1', bold ? 12 : 10, right - 10, y, value, color));
    y -= 18;
  };
  line('Subtotal', money(totals.subtotal));
  line('Tax', money(totals.tax));
  ops.push(`${black} RG 1 w ${x1} ${y + 12} m ${right} ${y + 12} l S`);
  y -= 4;
  line('Total', money(totals.total), true, black);
  if (totals.paid > 0) {
    ops.push(text('F1', 10, x1, y, 'Payment received', grey));
    ops.push(textRight('F1', 10, right - 10, y, `-${money(totals.paid).slice(1)}`, acc));
    y -= 22;
  }
  ops.push(`${acc} rg ${x1 - 8} ${y - 8} ${right - x1 + 18} 24 re f`);
  ops.push(text('F2', 11, x1, y, 'Balance Due', white));
  ops.push(textRight('F2', 11, right - 10, y, money(totals.due), white));

  if (invoice.status === 'paid') {
    const cos = Math.cos((14 * Math.PI) / 180);
    const sin = Math.sin((14 * Math.PI) / 180);
    ops.push(`q ${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${M + 150} ${y + 36} cm`);
    ops.push(`${acc} RG 3 w -78 -22 156 44 re S`);
    ops.push(`BT /F2 22 Tf ${acc} rg 1 0 0 1 -32 -6 Tm (PAID) Tj ET`);
    ops.push('Q');
  }

  ops.push(`${light} RG 1 w ${M} 78 m ${right} 78 l S`);
  ops.push(text('F2', 10, M, 60, 'Thank you for your business.', black));
  ops.push(text('F1', 9, M, 46, `Questions: ${STUDIO.email}`, grey));
  ops.push(textRight('F1', 9, right, 46, invoice.number, grey));
  ops.push(`${acc} rg 0 0 ${PAGE_W} 8 re f`);
  return ops.join('\n');
}

function encodePdf(stream: string, invoice: Invoice): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [6 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 7 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Title (${pdfText(`Artometrics Invoice ${invoice.number}`)}) /Author (${pdfText(STUDIO.name)}) >>`,
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((content, index) => {
    offsets[index + 1] = body.length;
    body += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xrefAt = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objects.length; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(body);
}

function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function pdfText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function text(font: 'F1' | 'F2' | 'F3', size: number, x: number, y: number, value: string, color: string): string {
  return `BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfText(value)}) Tj ET`;
}

function textRight(font: 'F1' | 'F2' | 'F3', size: number, right: number, y: number, value: string, color: string): string {
  const width = pdfText(value).length * size * (font === 'F2' ? 0.52 : 0.48);
  return text(font, size, right - width, y, value, color);
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`.replace('…', '...');
}

function trimQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
}
