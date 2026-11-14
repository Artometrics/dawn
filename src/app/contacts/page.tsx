import type { Metadata } from 'next';
import { ContactsDesk } from '@/components/desks/contacts-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'People, companies, and the five-stage pipeline.',
  robots: { index: false, follow: false },
};

export default function ContactsPage() {
  return (
    <PageShell title="Contacts" wide lead="People, companies, and the pipeline. Today shows what is due.">
      <ContactsDesk />
    </PageShell>
  );
}
