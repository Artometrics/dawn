import '../../agents/agents.css';
import { KitPage } from '@/components/kits/kit-panel';
import { kitById } from '@/lib/kits/registry';

export default function Page() {
  return <KitPage kit={kitById('sendkit')!} />;
}
