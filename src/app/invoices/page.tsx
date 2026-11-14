import type { Metadata } from 'next';
import { InvoiceDesk } from '@/components/desks/invoice-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Artometrics invoices with ART-year numbers, a PDF, and a printable sheet.',
  robots: { index: false, follow: false },
};

export default function InvoicesPage() {
  return (
    <PageShell title="Invoices" wide lead="Client, line items, and a numbered Artometrics invoice. Download the PDF or print the sheet.">
      <InvoiceDesk />
    </PageShell>
  );
}
